import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClientRepositoryService } from '../../../common/repository/client/client.repository.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateClientGeneralDto,
  UpdateClientLegalDto,
  ClientResponseDto,
} from './dtos/client.dto';
import {
  CreateClientWithStructureDto,
  UpdateClientOperationsDto,
} from './dtos/client-structure.dto';
import { ClientStructureGeneratorService } from './services/client-structure-generator.service';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { toDateOnlyIso } from '../../../common/utils/convertDate';
import {
  ClientStatus,
  ClientSector,
  ResidentialComplexType,
} from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

@Injectable()
export class ClientService {
  constructor(
    private readonly clientRepository: ClientRepositoryService,
    private readonly structureGenerator: ClientStructureGeneratorService,
    private readonly prisma: PrismaService,
  ) {}

  private mapClientToResponse(row: any): ClientResponseDto {
    let createdByName = 'Sistema';
    if (row.createdBy) {
      if (typeof row.createdBy === 'object') {
        createdByName =
          row.createdBy.fullName ||
          row.createdBy.name ||
          row.createdBy.email ||
          'Sistema';
      } else if (typeof row.createdBy === 'string') {
        createdByName = row.createdBy;
      }
    }

    return {
      ...row,
      contractDate: row.contractDate ? toDateOnlyIso(row.contractDate) : null,
      lastContractDate: row.lastContractDate
        ? toDateOnlyIso(row.lastContractDate)
        : null,
      contractEndDate: row.contractEndDate
        ? toDateOnlyIso(row.contractEndDate)
        : null,
      createdBy: createdByName,
    };
  }

  private handlePrismaError(error: any): never {
    if (error?.code === 'P2002') {
      const target = (error?.meta?.target as string[]) || [];
      const targetStr = Array.isArray(target)
        ? target.join(', ')
        : String(target);
      if (targetStr.includes('nit')) {
        throw new ConflictException(
          'Ya existe un cliente o conjunto residencial registrado con este número de NIT.',
        );
      }
      if (targetStr.includes('internalCode')) {
        throw new ConflictException(
          'Ya existe un cliente registrado con este Código Interno.',
        );
      }
      if (targetStr.includes('contractNumber')) {
        throw new ConflictException(
          'Ya existe un cliente registrado con este Número de Contrato.',
        );
      }
      throw new ConflictException(
        `Ya existe un registro con información duplicada en el sistema (${targetStr}).`,
      );
    }
    throw error;
  }

  async create(
    dto: CreateClientDto | CreateClientWithStructureDto,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    const { structureConfig, ...clientFields } = dto as any;

    const internalCode =
      clientFields.internalCode && clientFields.internalCode.trim() !== ''
        ? clientFields.internalCode.trim()
        : `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

    const data = {
      ...clientFields,
      internalCode,
      clientStatus: clientFields.clientStatus || ClientStatus.ACTIVE,
      tenant: { connect: { id: user.tenantId } },
    };

    // Clean relation scalar fields
    delete data.coordinatorInChargeId;
    delete data.commercialContactId;

    if (
      clientFields.coordinatorInChargeId &&
      String(clientFields.coordinatorInChargeId).trim() !== ''
    ) {
      data.coordinatorInCharge = {
        connect: { id: clientFields.coordinatorInChargeId },
      };
    }

    if (
      clientFields.commercialContactId &&
      String(clientFields.commercialContactId).trim() !== ''
    ) {
      data.commercialContact = {
        connect: { id: clientFields.commercialContactId },
      };
    }

    // Helper for optional date parsing
    const parseOptionalDate = (val: any) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return null;
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    // Date parsing and sanitization
    delete data.contractDate;
    delete data.lastContractDate;
    delete data.contractEndDate;

    const parsedContractDate = parseOptionalDate(clientFields.contractDate);
    if (parsedContractDate) data.contractDate = parsedContractDate;

    const parsedEndDate = parseOptionalDate(
      clientFields.lastContractDate || clientFields.contractEndDate,
    );
    if (parsedEndDate) {
      data.lastContractDate = parsedEndDate;
      data.contractEndDate = parsedEndDate;
    }

    if (user.sub && user.sub !== 'system') {
      data.createdBy = { connect: { id: user.sub } };
    }

    let res: any;
    try {
      res = await this.clientRepository.create(data);
    } catch (err: any) {
      this.handlePrismaError(err);
    }

    if (structureConfig) {
      try {
        await this.structureGenerator.generateStructure(
          res.id,
          user.tenantId,
          structureConfig,
          user.sub,
        );
      } catch (err: any) {
        throw new BadRequestException(
          `Error al generar la estructura física del conjunto: ${err.message}`,
        );
      }
    }

    return this.findOne(res.id, user);
  }

  async findAll(
    user: UserContext,
    pagination?: CursorPaginationDto,
  ): Promise<
    | { data: ClientResponseDto[]; meta: { nextCursor: string | null } }
    | ClientResponseDto[]
  > {
    const where: any = {
      tenantId: user.tenantId,
      clientStatus: { not: ClientStatus.PROSPECT },
    };

    if (
      !user.permissions.includes('client:manage') &&
      !user.permissions.includes('client:read_all')
    ) {
      if (user.permissions.includes('client:read_assigned')) {
        where.OR = [
          { coordinatorInChargeId: user.sub },
          { commercialContactId: user.sub },
        ];
      } else if (user.permissions.includes('client:read_workplace')) {
        const currentUser = await this.prisma.user.findUnique({
          where: { id: user.sub },
          select: { clientId: true },
        });
        if (currentUser?.clientId) {
          where.id = currentUser.clientId;
        } else {
          return pagination?.cursor || pagination?.take
            ? { data: [], meta: { nextCursor: null } }
            : [];
        }
      } else {
        return pagination?.cursor || pagination?.take
          ? { data: [], meta: { nextCursor: null } }
          : [];
      }
    }

    const args: any = {
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        coordinatorInCharge: true,
        commercialContact: true,
        createdBy: true,
        clientProperties: true,
      },
    };

    if (pagination?.cursor) {
      args.cursor = { id: pagination.cursor };
      args.skip = 1;
    }

    if (pagination?.take) {
      args.take = Number(pagination.take);
    }

    const rows = await this.clientRepository.findMany(args);
    const data = rows.map((r) => this.mapClientToResponse(r));

    if (pagination && (pagination.cursor || pagination.take)) {
      const takeCount = Number(pagination.take) || 20;
      const nextCursor =
        data.length === takeCount ? data[data.length - 1].id : null;
      return {
        data,
        meta: {
          nextCursor,
        },
      };
    }

    return data;
  }

  async findOne(id: string, user: UserContext): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne(id, {
      coordinatorInCharge: true,
      commercialContact: true,
      createdBy: true,
      clientProperties: true,
      towers: {
        where: { deletedAt: null },
        orderBy: { towerName: 'asc' },
      },
      floors: {
        where: { deletedAt: null },
        orderBy: { floorNumber: 'asc' },
      },
      units: {
        where: { deletedAt: null },
        orderBy: { unitName: 'asc' },
      },
    });
    if (!client || client.tenantId !== user.tenantId) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const res = this.mapClientToResponse(client);

    const isGodlike =
      (user.tenantId === 'system' ||
        (user as any).originalTenantId === 'system') &&
      (user.roles || []).includes('GODLIKE');
    const hasManage = (user.permissions || []).includes('client:manage');
    const hasReadLegal =
      isGodlike ||
      hasManage ||
      (user.permissions || []).includes('client:read_legal');
    const hasReadOperations =
      isGodlike ||
      hasManage ||
      (user.permissions || []).includes('client:read_operations');

    if (!hasReadLegal) {
      (res as any).contractNumber = null;
      (res as any).contractDate = null;
      (res as any).lastContractDate = null;
      (res as any).contractEndDate = null;
      (res as any).renewedContract = null;
      (res as any).contractMediaFiles = null;
      (res as any).administrationType = null;
      (res as any).administrationCompanyData = null;
      (res as any).councilData = null;
      (res as any).administrator = null;
      (res as any).administratorPhone = null;
      (res as any).administratorEmail = null;
    }

    if (!hasReadOperations) {
      (res as any).clientProperties = null;
      (res as any).towers = [];
      (res as any).floors = [];
      (res as any).units = [];
      (res as any).geofence = null;
      (res as any).mapboxBaseImageS3Key = null;
      (res as any).mapboxCenterLat = null;
      (res as any).mapboxCenterLng = null;
      (res as any).mapboxZoom = null;
      (res as any).mapboxBboxMinLat = null;
      (res as any).mapboxBboxMinLng = null;
      (res as any).mapboxBboxMaxLat = null;
      (res as any).mapboxBboxMaxLng = null;
      (res as any).securityStudy = null;
    }

    return res;
  }

  async autocomplete(query: string, user: UserContext, limit = 20) {
    const trimmed = (query || '').trim();
    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
      isActive: true,
      clientStatus: { not: ClientStatus.PROSPECT },
    };

    if (
      !user.permissions.includes('client:manage') &&
      !user.permissions.includes('client:read_all')
    ) {
      if (user.permissions.includes('client:read_assigned')) {
        where.OR = [
          { coordinatorInChargeId: user.sub },
          { commercialContactId: user.sub },
        ];
      } else if (user.permissions.includes('client:read_workplace')) {
        const currentUser = await this.prisma.user.findUnique({
          where: { id: user.sub },
          select: { clientId: true },
        });
        if (currentUser?.clientId) {
          where.id = currentUser.clientId;
        } else {
          return [];
        }
      } else {
        return [];
      }
    }

    if (trimmed) {
      const searchOr = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { internalCode: { contains: trimmed, mode: 'insensitive' } },
        { nit: { contains: trimmed, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    return this.prisma.client.findMany({
      where,
      take: Math.min(limit, 50),
      select: {
        id: true,
        name: true,
        internalCode: true,
        nit: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async autocompleteUnits(
    clientId: string,
    query: string,
    user: UserContext,
    limit = 15,
  ) {
    const trimmed = (query || '').trim();
    const where: any = {
      tenantId: user.tenantId,
      clientId,
      deletedAt: null,
    };

    if (trimmed) {
      where.OR = [
        { unitName: { contains: trimmed, mode: 'insensitive' } },
        { tower: { towerName: { contains: trimmed, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.unit.findMany({
      where,
      take: Math.min(limit, 50),
      include: {
        tower: { select: { id: true, towerName: true } },
        floor: { select: { id: true, floorNumber: true } },
        residents: {
          where: { deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            document: true,
            phoneNumber: true,
            residentType: true,
          },
        },
      },
      orderBy: [{ tower: { towerName: 'asc' } }, { unitName: 'asc' }],
    });
  }

  async update(
    id: string,
    dto: UpdateClientDto | any,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    await this.findOne(id, user);

    const { structureConfig, ...clientFields } = dto;
    const data = { ...clientFields };

    delete data.coordinatorInChargeId;
    delete data.commercialContactId;

    if (
      clientFields.coordinatorInChargeId &&
      String(clientFields.coordinatorInChargeId).trim() !== ''
    ) {
      data.coordinatorInCharge = {
        connect: { id: clientFields.coordinatorInChargeId },
      };
    } else if (
      clientFields.coordinatorInChargeId === null ||
      clientFields.coordinatorInChargeId === ''
    ) {
      data.coordinatorInCharge = { disconnect: true };
    }

    if (
      clientFields.commercialContactId &&
      String(clientFields.commercialContactId).trim() !== ''
    ) {
      data.commercialContact = {
        connect: { id: clientFields.commercialContactId },
      };
    } else if (
      clientFields.commercialContactId === null ||
      clientFields.commercialContactId === ''
    ) {
      data.commercialContact = { disconnect: true };
    }

    // Helper for optional date parsing
    const parseOptionalDate = (val: any) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return null;
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    delete data.contractDate;
    delete data.lastContractDate;
    delete data.contractEndDate;

    if (clientFields.contractDate !== undefined) {
      data.contractDate = parseOptionalDate(clientFields.contractDate);
    }

    if (
      clientFields.lastContractDate !== undefined ||
      clientFields.contractEndDate !== undefined
    ) {
      const parsedEnd = parseOptionalDate(
        clientFields.lastContractDate || clientFields.contractEndDate,
      );
      data.lastContractDate = parsedEnd;
      data.contractEndDate = parsedEnd;
    }

    if (user.sub && user.sub !== 'system') {
      data.updatedBy = { connect: { id: user.sub } };
    }

    try {
      await this.clientRepository.update(id, data);
    } catch (err: any) {
      this.handlePrismaError(err);
    }

    if (structureConfig) {
      await this.structureGenerator.generateStructure(
        id,
        user.tenantId,
        structureConfig,
        user.sub,
      );
    }

    return this.findOne(id, user);
  }

  async updateGeneral(
    id: string,
    dto: UpdateClientGeneralDto,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    await this.findOne(id, user);

    const data: any = { ...dto };

    delete data.coordinatorInChargeId;
    delete data.commercialContactId;

    if (
      dto.coordinatorInChargeId &&
      String(dto.coordinatorInChargeId).trim() !== ''
    ) {
      data.coordinatorInCharge = {
        connect: { id: dto.coordinatorInChargeId },
      };
    } else if (
      dto.coordinatorInChargeId === null ||
      dto.coordinatorInChargeId === ''
    ) {
      data.coordinatorInCharge = { disconnect: true };
    }

    if (
      dto.commercialContactId &&
      String(dto.commercialContactId).trim() !== ''
    ) {
      data.commercialContact = {
        connect: { id: dto.commercialContactId },
      };
    } else if (
      dto.commercialContactId === null ||
      dto.commercialContactId === ''
    ) {
      data.commercialContact = { disconnect: true };
    }

    if (user.sub && user.sub !== 'system') {
      data.updatedBy = { connect: { id: user.sub } };
    }

    try {
      await this.clientRepository.update(id, data);
    } catch (err: any) {
      this.handlePrismaError(err);
    }

    return this.findOne(id, user);
  }

  async updateOperations(
    id: string,
    dto: UpdateClientOperationsDto,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    await this.findOne(id, user);

    const {
      structureConfig,
      confirmationCode,
      confirmRegenerate,
      geofence,
      mapboxBaseImageS3Key,
      mapboxCenterLat,
      mapboxCenterLng,
      mapboxZoom,
      mapboxBboxMinLat,
      mapboxBboxMinLng,
      mapboxBboxMaxLat,
      mapboxBboxMaxLng,
      ...amenitiesFields
    } = dto;

    if (structureConfig) {
      const residentCount = await this.prisma.resident.count({
        where: {
          clientId: id,
          tenantId: user.tenantId,
          deletedAt: null,
        },
      });

      if (
        residentCount > 0 &&
        confirmationCode !== 'REGENERAR' &&
        confirmRegenerate !== true
      ) {
        throw new BadRequestException(
          'La regeneración de la estructura física eliminará los residentes existentes de este cliente. Para confirmar esta acción destructiva, debe enviar confirmationCode="REGENERAR".',
        );
      }

      await this.structureGenerator.generateStructure(
        id,
        user.tenantId,
        structureConfig,
        user.sub,
      );
    }

    const clientData: any = {};
    if (geofence !== undefined) clientData.geofence = geofence;
    if (mapboxBaseImageS3Key !== undefined)
      clientData.mapboxBaseImageS3Key = mapboxBaseImageS3Key;
    if (mapboxCenterLat !== undefined) clientData.mapboxCenterLat = mapboxCenterLat;
    if (mapboxCenterLng !== undefined) clientData.mapboxCenterLng = mapboxCenterLng;
    if (mapboxZoom !== undefined) clientData.mapboxZoom = mapboxZoom;
    if (mapboxBboxMinLat !== undefined)
      clientData.mapboxBboxMinLat = mapboxBboxMinLat;
    if (mapboxBboxMinLng !== undefined)
      clientData.mapboxBboxMinLng = mapboxBboxMinLng;
    if (mapboxBboxMaxLat !== undefined)
      clientData.mapboxBboxMaxLat = mapboxBboxMaxLat;
    if (mapboxBboxMaxLng !== undefined)
      clientData.mapboxBboxMaxLng = mapboxBboxMaxLng;

    if (Object.keys(clientData).length > 0) {
      if (user.sub && user.sub !== 'system') {
        clientData.updatedBy = { connect: { id: user.sub } };
      }
      try {
        await this.clientRepository.update(id, clientData);
      } catch (err: any) {
        this.handlePrismaError(err);
      }
    }

    const cleanAmenities: any = {};
    for (const [key, val] of Object.entries(amenitiesFields)) {
      if (val !== undefined) {
        cleanAmenities[key] = val;
      }
    }

    if (Object.keys(cleanAmenities).length > 0) {
      if (user.sub && user.sub !== 'system') {
        cleanAmenities.updatedBy = user.sub;
      }
      await this.prisma.clientProperties.upsert({
        where: { clientId: id },
        update: cleanAmenities,
        create: {
          tenantId: user.tenantId,
          clientId: id,
          ...cleanAmenities,
          createdBy: user.sub !== 'system' ? user.sub : undefined,
        },
      });
    }

    return this.findOne(id, user);
  }

  async updateLegal(
    id: string,
    dto: UpdateClientLegalDto,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    await this.findOne(id, user);

    const parseOptionalDate = (val: any) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return null;
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const data: any = { ...dto };

    delete data.contractDate;
    delete data.lastContractDate;
    delete data.contractEndDate;

    if (dto.contractDate !== undefined) {
      data.contractDate = parseOptionalDate(dto.contractDate);
    }

    if (
      dto.lastContractDate !== undefined ||
      dto.contractEndDate !== undefined
    ) {
      const parsedEnd = parseOptionalDate(
        dto.lastContractDate || dto.contractEndDate,
      );
      data.lastContractDate = parsedEnd;
      data.contractEndDate = parsedEnd;
    }

    if (user.sub && user.sub !== 'system') {
      data.updatedBy = { connect: { id: user.sub } };
    }

    try {
      await this.clientRepository.update(id, data);
    } catch (err: any) {
      this.handlePrismaError(err);
    }

    return this.findOne(id, user);
  }

  async remove(id: string, user: UserContext): Promise<ClientResponseDto> {
    await this.findOne(id, user);
    const userId = user.sub;
    const data: any = {
      isActive: false,
      deletedAt: new Date(),
    };
    if (userId && userId !== 'system') {
      data.deletedBy = { connect: { id: userId } };
    }
    await this.clientRepository.update(id, data);
    return this.findOne(id, user);
  }

  async reactivate(id: string, user: UserContext): Promise<ClientResponseDto> {
    await this.findOne(id, user);
    const userId = user.sub;
    const data: any = {
      isActive: true,
      deletedAt: null,
      deletedBy: { disconnect: true },
    };
    if (userId && userId !== 'system') {
      data.updatedBy = { connect: { id: userId } };
    }
    await this.clientRepository.update(id, data);
    return this.findOne(id, user);
  }

  async importClientsFromCsv(
    csvData: Array<Record<string, string>>,
    fileName: string,
    user: UserContext,
  ) {
    const totalRows = csvData.length;
    let successRows = 0;
    let errorRows = 0;
    const errors: Array<{ row: number; nit?: string; reason: string }> = [];
    const createdClients: any[] = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 1;

      try {
        const rawNit = (row.nit || row.NIT || '').trim();
        const rawName = (
          row.name ||
          row.Nombre ||
          row.nombre ||
          row.razonSocial ||
          ''
        ).trim();

        if (!rawNit || !rawName) {
          throw new Error('Los campos NIT y Nombre son obligatorios.');
        }

        const existing = await this.prisma.client.findFirst({
          where: {
            tenantId: user.tenantId,
            nit: rawNit,
          },
        });

        if (existing) {
          throw new Error(`Ya existe un cliente con el NIT ${rawNit}`);
        }

        const rawCode =
          row.internalCode ||
          row.CodigoInterno ||
          row.codigo ||
          row.codigoInterno;
        const internalCode =
          rawCode && rawCode.trim() !== ''
            ? rawCode.trim()
            : `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

        let sector: ClientSector = ClientSector.RESIDENTIAL;
        const rawSector = row.sector || row.Sector;
        if (rawSector && rawSector.trim() !== '') {
          const s = rawSector.trim().toUpperCase();
          if (s === 'RESIDENCIAL' || s === 'RESIDENTIAL') {
            sector = ClientSector.RESIDENTIAL;
          } else if (s === 'COMERCIAL' || s === 'COMMERCIAL') {
            sector = ClientSector.COMMERCIAL;
          } else if (s === 'INDUSTRIAL') {
            sector = ClientSector.INDUSTRIAL;
          } else if (s === 'GUBERNAMENTAL' || s === 'GOVERNMENT') {
            sector = ClientSector.GOVERNMENT;
          } else if (s in ClientSector) {
            sector = s as ClientSector;
          } else {
            sector = ClientSector.OTHER;
          }
        }

        const rawContract =
          row.contractNumber ||
          row.NumeroContrato ||
          row.contrato ||
          row.numeroContrato;
        const rawEmail = row.email || row.Email || row.Correo || row.correo;
        const rawPhone = row.phone || row.Telefono || row.telefono;
        const rawAddress = row.address || row.Direccion || row.direccion;
        const rawCity = row.city || row.Ciudad || row.ciudad;

        const clientData: any = {
          tenant: { connect: { id: user.tenantId } },
          nit: rawNit,
          name: rawName,
          internalCode,
          contractNumber:
            rawContract?.trim() ||
            `CONT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          email: rawEmail?.trim() || null,
          phone: rawPhone?.trim() || null,
          address: rawAddress?.trim() || null,
          city: rawCity?.trim() || 'Bogotá',
          sector,
          clientStatus: ClientStatus.ACTIVE,
        };

        const isGodlike =
          user.roles?.includes('GODLIKE') || user.tenantId === 'system';
        if (user.sub && user.sub !== 'system' && !isGodlike) {
          clientData.createdBy = { connect: { id: user.sub } };
          clientData.updatedBy = { connect: { id: user.sub } };
        }

        const created = await this.prisma.client.create({ data: clientData });

        await this.prisma.clientProperties.create({
          data: {
            tenantId: user.tenantId,
            clientId: created.id,
            structureType: ResidentialComplexType.BUILDING_CLUSTER,
            towersAmount: 0,
            unitsAmount: 0,
            createdBy: user.sub !== 'system' ? user.sub : undefined,
          },
        });

        createdClients.push(created);
        successRows++;
      } catch (err: any) {
        errorRows++;
        errors.push({
          row: rowNum,
          nit: row.nit || row.NIT,
          reason: err.message || 'Error desconocido al procesar fila',
        });
      }
    }

    // Record FileImportLog
    const status =
      errorRows === 0 ? 'SUCCESS' : successRows === 0 ? 'FAILED' : 'PARTIAL';

    await this.prisma.fileImportLog.create({
      data: {
        tenantId: user.tenantId,
        entityType: 'CLIENT',
        fileName: fileName || 'clientes.csv',
        status,
        totalRows,
        successRows,
        errorRows,
        errorDetails: errors.length > 0 ? errors : undefined,
        uploadedBy: user.sub || 'system',
      },
    });

    return {
      status,
      totalRows,
      successRows,
      errorRows,
      errors,
      importedCount: createdClients.length,
    };
  }
}
