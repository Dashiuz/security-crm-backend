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
  ClientResponseDto,
} from './dtos/client.dto';
import { CreateClientWithStructureDto } from './dtos/client-structure.dto';
import { ClientStructureGeneratorService } from './services/client-structure-generator.service';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { toDateOnlyIso } from '../../../common/utils/convertDate';
import {
  ClientStatus,
  ClientSector,
  ResidentialComplexType,
} from '@prisma/client';

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

  async findAll(user: UserContext): Promise<ClientResponseDto[]> {
    return this.clientRepository
      .findMany({
        where: {
          tenantId: user.tenantId,
          clientStatus: { not: ClientStatus.PROSPECT },
        },
        include: {
          coordinatorInCharge: true,
          commercialContact: true,
          createdBy: true,
          clientProperties: true,
        },
      })
      .then((rows) => rows.map((r) => this.mapClientToResponse(r))) as any;
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
    return this.mapClientToResponse(client);
  }

  async autocomplete(query: string, user: UserContext, limit = 20) {
    const trimmed = (query || '').trim();
    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
      isActive: true,
      clientStatus: { not: ClientStatus.PROSPECT },
    };

    if (trimmed) {
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { internalCode: { contains: trimmed, mode: 'insensitive' } },
        { nit: { contains: trimmed, mode: 'insensitive' } },
      ];
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
