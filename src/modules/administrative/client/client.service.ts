import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ClientRepositoryService } from '../../../common/repository/client/client.repository.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateClientGeneralDto,
  UpdateClientLegalDto,
  ClientResponseDto,
  AssignClientUserDto,
  ClientWorkforceItemDto,
  DigitalAccountStatus,
} from './dtos/client.dto';
import {
  CreateClientWithStructureDto,
  UpdateClientOperationsDto,
} from './dtos/client-structure.dto';
import { ClientAdministratorDto } from './dtos/client-administrator.dto';
import { ClientStructureGeneratorService } from './services/client-structure-generator.service';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { toDateOnlyIso } from '../../../common/utils/convertDate';
import { randomUUID } from 'crypto';
import {
  ClientStatus,
  ClientSector,
  ResidentialComplexType,
} from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

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
    this.logger.error(
      `Error en operación Prisma de Client: ${error?.message || error}`,
      error?.stack,
    );
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

    if (res?.id) {
      if (
        clientFields.coordinatorInChargeId &&
        String(clientFields.coordinatorInChargeId).trim() !== ''
      ) {
        try {
          await this.prisma.userClientAccess.upsert({
            where: {
              userId_clientId: {
                userId: clientFields.coordinatorInChargeId,
                clientId: res.id,
              },
            },
            create: {
              tenantId: user.tenantId,
              userId: clientFields.coordinatorInChargeId,
              clientId: res.id,
              roleName: 'COORDINADOR',
              isActive: true,
            },
            update: { isActive: true, roleName: 'COORDINADOR' },
          });
        } catch (error: unknown) {
          this.logger.error(
            `Could not sync coordinator userClientAccess: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
      if (
        clientFields.commercialContactId &&
        String(clientFields.commercialContactId).trim() !== ''
      ) {
        try {
          await this.prisma.userClientAccess.upsert({
            where: {
              userId_clientId: {
                userId: clientFields.commercialContactId,
                clientId: res.id,
              },
            },
            create: {
              tenantId: user.tenantId,
              userId: clientFields.commercialContactId,
              clientId: res.id,
              roleName: 'COMERCIAL',
              isActive: true,
            },
            update: { isActive: true, roleName: 'COMERCIAL' },
          });
        } catch (error: unknown) {
          this.logger.error(
            `Could not sync commercial userClientAccess: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
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
        this.logger.error(
          `Error al generar la estructura física del conjunto: ${err?.message || err}`,
          err?.stack,
        );
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
        const userAccesses = await this.prisma.userClientAccess.findMany({
          where: { tenantId: user.tenantId, userId: user.sub, isActive: true },
          select: { clientId: true },
        });
        const assignedIds = userAccesses.map((a) => a.clientId);
        where.id = { in: assignedIds };
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
        const userAccesses = await this.prisma.userClientAccess.findMany({
          where: { tenantId: user.tenantId, userId: user.sub, isActive: true },
          select: { clientId: true },
        });
        const assignedIds = userAccesses.map((a) => a.clientId);
        where.id = { in: assignedIds };
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
      try {
        await this.prisma.userClientAccess.upsert({
          where: {
            userId_clientId: {
              userId: clientFields.coordinatorInChargeId,
              clientId: id,
            },
          },
          create: {
            tenantId: user.tenantId,
            userId: clientFields.coordinatorInChargeId,
            clientId: id,
            roleName: 'COORDINADOR',
            isActive: true,
          },
          update: { isActive: true, roleName: 'COORDINADOR' },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Could not sync coordinator userClientAccess: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    if (
      clientFields.commercialContactId &&
      String(clientFields.commercialContactId).trim() !== ''
    ) {
      try {
        await this.prisma.userClientAccess.upsert({
          where: {
            userId_clientId: {
              userId: clientFields.commercialContactId,
              clientId: id,
            },
          },
          create: {
            tenantId: user.tenantId,
            userId: clientFields.commercialContactId,
            clientId: id,
            roleName: 'COMERCIAL',
            isActive: true,
          },
          update: { isActive: true, roleName: 'COMERCIAL' },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Could not sync commercial userClientAccess: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
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
      try {
        await this.prisma.userClientAccess.upsert({
          where: {
            userId_clientId: {
              userId: dto.coordinatorInChargeId,
              clientId: id,
            },
          },
          create: {
            tenantId: user.tenantId,
            userId: dto.coordinatorInChargeId,
            clientId: id,
            roleName: 'COORDINADOR',
            isActive: true,
          },
          update: { isActive: true, roleName: 'COORDINADOR' },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Could not sync coordinator userClientAccess: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    if (
      dto.commercialContactId &&
      String(dto.commercialContactId).trim() !== ''
    ) {
      try {
        await this.prisma.userClientAccess.upsert({
          where: {
            userId_clientId: {
              userId: dto.commercialContactId,
              clientId: id,
            },
          },
          create: {
            tenantId: user.tenantId,
            userId: dto.commercialContactId,
            clientId: id,
            roleName: 'COMERCIAL',
            isActive: true,
          },
          update: { isActive: true, roleName: 'COMERCIAL' },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Could not sync commercial userClientAccess: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
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
    if (mapboxCenterLat !== undefined)
      clientData.mapboxCenterLat = mapboxCenterLat;
    if (mapboxCenterLng !== undefined)
      clientData.mapboxCenterLng = mapboxCenterLng;
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
        this.logger.error(
          `Error al importar cliente fila ${rowNum} (${row.nit || row.NIT}): ${err?.message || err}`,
          err?.stack,
        );
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

  async getClientAdministrators(
    clientId: string,
    user: UserContext,
  ): Promise<ClientAdministratorDto[]> {
    const client = await this.clientRepository.findOne(clientId);
    if (!client || client.tenantId !== user.tenantId) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const result: ClientAdministratorDto[] = [];
    const admComp: any = client.administrationCompanyData || {};

    if (
      client.administrationType === 'INDIVIDUAL' ||
      !client.administrationType
    ) {
      const doc = (
        admComp.identificationNumber ||
        admComp.representativeDocument ||
        ''
      ).trim();
      const name = (client.administrator || '').trim();

      if (name || doc) {
        result.push({
          name,
          document: doc,
          email: (client.administratorEmail || '').trim(),
          phone: (client.administratorPhone || '').trim(),
          roleName: 'Administrador Titular',
          administrationType: 'INDIVIDUAL',
          isAlreadyUser: false,
          hasAccessToThisClient: false,
        });
      }
    } else if (client.administrationType === 'ENTERPRISE') {
      // 1. Representante Legal
      const repName = (admComp.legalRepName || '').trim();
      const repDoc = (admComp.legalRepId || '').trim();
      if (repName || repDoc) {
        result.push({
          name: repName,
          document: repDoc,
          email: (admComp.email || client.administratorEmail || '').trim(),
          phone: (
            admComp.legalRepPhone ||
            admComp.phone ||
            client.administratorPhone ||
            ''
          ).trim(),
          roleName: 'Representante Legal',
          administrationType: 'ENTERPRISE',
          isAlreadyUser: false,
          hasAccessToThisClient: false,
        });
      }

      // 2. Contactos Adicionales / Delegados
      const additional = Array.isArray(admComp.additionalContacts)
        ? admComp.additionalContacts
        : [];
      for (const contact of additional) {
        const cName = (contact.name || '').trim();
        const cDoc = (contact.document || contact.idNumber || '').trim();
        if (cName || cDoc) {
          result.push({
            name: cName,
            document: cDoc,
            email: (contact.email || '').trim(),
            phone: (contact.phone || '').trim(),
            roleName: (
              contact.roleName ||
              contact.title ||
              'Contacto Delegado'
            ).trim(),
            administrationType: 'ENTERPRISE',
            isAlreadyUser: false,
            hasAccessToThisClient: false,
          });
        }
      }
    }

    // Check existing users in database for each administrator
    for (const item of result) {
      if (item.document) {
        const existing = await this.prisma.user.findUnique({
          where: { document: item.document },
          include: { clientAccesses: true },
        });

        if (existing) {
          item.isAlreadyUser = true;
          item.userId = existing.id;
          item.hasAccessToThisClient =
            existing.clientId === clientId ||
            (existing.clientAccesses || []).some(
              (ca) => ca.clientId === clientId && ca.isActive,
            );
        }
      }
    }

    return result;
  }

  async getClientUsers(
    clientId: string,
    user: UserContext,
  ): Promise<ClientWorkforceItemDto[]> {
    await this.findOne(clientId, user);

    const accesses = await this.prisma.userClientAccess.findMany({
      where: {
        clientId,
        tenantId: user.tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            document: true,
            department: true,
            position: true,
            userType: true,
            isActive: true,
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        employee: {
          select: {
            id: true,
            fullName: true,
            document: true,
            email: true,
            phone: true,
            isActive: true,
            positionRef: {
              select: {
                name: true,
                operationalCategory: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accesses.map((acc) => {
      const hasDigitalAccess = Boolean(acc.user && acc.user.isActive);
      let digitalAccountStatus = DigitalAccountStatus.NO_ACCOUNT;
      if (acc.user) {
        digitalAccountStatus = acc.user.isActive
          ? DigitalAccountStatus.ACTIVE
          : DigitalAccountStatus.DISABLED;
      }

      const fullName =
        acc.user?.fullName || acc.employee?.fullName || 'Personal Asignado';
      const document = acc.user?.document || acc.employee?.document || '';
      const email = acc.employee?.email || null;
      const phone = acc.employee?.phone || null;
      const roleName =
        acc.roleName ||
        acc.employee?.positionRef?.name ||
        acc.user?.position ||
        'OPERATIVO';

      return {
        id: acc.id,
        userId: acc.userId,
        employeeId: acc.employeeId,
        clientId: acc.clientId,
        roleName,
        isActive: acc.isActive,
        hasDigitalAccess,
        digitalAccountStatus,
        createdAt: acc.createdAt,
        user: {
          id: acc.user?.id || null,
          fullName,
          document,
          email,
          phone,
          isActive: acc.user?.isActive ?? false,
          department: acc.user?.department || null,
          position: roleName,
          roles: acc.user?.roles || [],
        },
      };
    });
  }

  async assignUser(
    clientId: string,
    dto: AssignClientUserDto,
    user: UserContext,
  ) {
    await this.findOne(clientId, user);

    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!targetUser) {
      throw new NotFoundException('El usuario especificado no existe.');
    }

    if ((targetUser as any).userType === 'RESIDENCE_MANAGER') {
      throw new BadRequestException(
        'Los administradores de copropiedad no pueden ser asignados como personal operativo o funcionarios del cliente.',
      );
    }

    // Single source of truth: Get employee's official position
    const employee = await this.prisma.employee.findFirst({
      where: { document: targetUser.document, tenantId: user.tenantId },
      include: { positionRef: true },
    });

    const officialRoleName =
      employee?.positionRef?.name ||
      dto.roleName ||
      targetUser.position ||
      'OPERATIVO';

    const existingAccess = await this.prisma.userClientAccess.findFirst({
      where: {
        clientId,
        tenantId: user.tenantId,
        OR: [
          { userId: dto.userId },
          ...(employee ? [{ employeeId: employee.id }] : []),
        ],
      },
    });

    let access: any;
    if (existingAccess) {
      access = await this.prisma.userClientAccess.update({
        where: { id: existingAccess.id },
        data: {
          userId: dto.userId,
          employeeId: employee?.id || existingAccess.employeeId,
          roleName: officialRoleName,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              document: true,
              department: true,
              position: true,
              userType: true,
              isActive: true,
              roles: {
                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      access = await this.prisma.userClientAccess.create({
        data: {
          tenantId: user.tenantId,
          userId: dto.userId,
          employeeId: employee?.id || null,
          clientId,
          roleName: officialRoleName,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              document: true,
              department: true,
              position: true,
              userType: true,
              isActive: true,
              roles: {
                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Sincronizar bidireccionalmente con el historial del empleado
    if (employee) {
      try {
        const client = await this.prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, internalCode: true },
        });
        const clientName = client?.name || 'Cliente';
        const clientCode = client?.internalCode || null;

        const rawHistory: any[] = Array.isArray((employee as any).clientHistory)
          ? [...(employee as any).clientHistory]
          : [];
        const todayStr = new Date().toISOString().split('T')[0];

        const existingActiveIdx = rawHistory.findIndex(
          (h) => h.clientId === clientId && h.unassignedAt === null,
        );

        if (existingActiveIdx === -1) {
          rawHistory.push({
            id: randomUUID(),
            clientId,
            clientName,
            clientCode,
            assignedAt: todayStr,
            unassignedAt: null,
            recordedAt: new Date().toISOString(),
            recordedBy: user.sub,
            notes: 'Asignado desde el módulo del cliente',
          });

          await this.prisma.employee.update({
            where: { id: employee.id },
            data: {
              clientId,
              clientHistory: rawHistory as any,
            },
          });
        }
      } catch (err: any) {
        this.logger.error(
          `Error sincronizando historial de cliente en empleado ${employee.id}: ${err?.message || err}`,
          err?.stack,
        );
      }
    }

    return {
      id: access.id,
      userId: access.userId,
      employeeId: access.employeeId,
      clientId: access.clientId,
      roleName: access.roleName,
      isActive: access.isActive,
      createdAt: access.createdAt,
      user: access.user,
    };
  }

  async unassignUser(
    clientId: string,
    userOrAccessId: string,
    user: UserContext,
  ) {
    await this.findOne(clientId, user);

    let access = await this.prisma.userClientAccess.findFirst({
      where: {
        id: userOrAccessId,
        clientId,
        tenantId: user.tenantId,
      },
    });

    if (!access) {
      access = await this.prisma.userClientAccess.findFirst({
        where: {
          clientId,
          tenantId: user.tenantId,
          OR: [{ userId: userOrAccessId }, { employeeId: userOrAccessId }],
        },
      });
    }

    if (!access) {
      throw new NotFoundException(
        'El usuario o personal no se encuentra asignado a este cliente.',
      );
    }

    await this.prisma.userClientAccess.update({
      where: { id: access.id },
      data: { isActive: false },
    });

    // Sincronizar cierre en el historial del empleado
    try {
      let employee: any = null;
      if (access.employeeId) {
        employee = await this.prisma.employee.findUnique({
          where: { id: access.employeeId },
        });
      } else if (access.userId) {
        const userRecord = await this.prisma.user.findUnique({
          where: { id: access.userId },
          select: { document: true, tenantId: true },
        });
        if (userRecord) {
          employee = await this.prisma.employee.findFirst({
            where: { document: userRecord.document, tenantId: user.tenantId },
          });
        }
      }

      if (employee && Array.isArray(employee.clientHistory)) {
        const todayStr = new Date().toISOString().split('T')[0];
        const historyList = [...employee.clientHistory];
        let changed = false;
        for (let i = 0; i < historyList.length; i++) {
          if (
            historyList[i].clientId === clientId &&
            historyList[i].unassignedAt === null
          ) {
            historyList[i] = {
              ...historyList[i],
              unassignedAt: todayStr,
              reason: 'Desvinculado desde el módulo del cliente',
            };
            changed = true;
          }
        }
        if (changed) {
          const remainingActive = historyList.filter(
            (h) => h.unassignedAt === null,
          );
          const newClientId =
            remainingActive.length > 0
              ? remainingActive[remainingActive.length - 1].clientId
              : null;
          await this.prisma.employee.update({
            where: { id: employee.id },
            data: {
              clientId: newClientId,
              clientHistory: historyList as any,
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Error al desvincular historial de empleado al desasociar cliente [${clientId}]: ${err?.message || err}`,
        err?.stack,
      );
    }

    return {
      success: true,
      message: 'Usuario desvinculado del cliente exitosamente.',
    };
  }
}
