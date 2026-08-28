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
import { ClientStatus, ClientSector } from '@prisma/client';

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
      const targetStr = Array.isArray(target) ? target.join(', ') : String(target);
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
    } as any;

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

  async update(
    id: string,
    dto: UpdateClientDto | any,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    await this.findOne(id, user);

    const { structureConfig, ...clientFields } = dto as any;
    const data = { ...clientFields } as any;

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
        if (!row.nit || !row.name) {
          throw new Error('Los campos NIT y Nombre son obligatorios.');
        }

        const existing = await this.prisma.client.findFirst({
          where: {
            tenantId: user.tenantId,
            nit: row.nit.trim(),
          },
        });

        if (existing) {
          throw new Error(`Ya existe un cliente con el NIT ${row.nit}`);
        }

        const internalCode =
          row.internalCode && row.internalCode.trim() !== ''
            ? row.internalCode.trim()
            : `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

        let sector: ClientSector = ClientSector.RESIDENTIAL;
        if (row.sector && row.sector.trim() !== '') {
          const s = row.sector.trim().toUpperCase();
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

        const clientData: any = {
          tenant: { connect: { id: user.tenantId } },
          nit: row.nit.trim(),
          name: row.name.trim(),
          internalCode,
          contractNumber:
            row.contractNumber?.trim() ||
            `CONT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          address: row.address?.trim() || null,
          city: row.city?.trim() || 'Bogotá',
          sector,
          clientStatus: ClientStatus.ACTIVE,
        };

        if (user.sub && user.sub !== 'system') {
          clientData.createdBy = { connect: { id: user.sub } };
          clientData.updatedBy = { connect: { id: user.sub } };
        }

        const created = await this.prisma.client.create({ data: clientData });
        createdClients.push(created);
        successRows++;
      } catch (err: any) {
        errorRows++;
        errors.push({
          row: rowNum,
          nit: row.nit,
          reason: err.message || 'Error desconocido al procesar fila',
        });
      }
    }

    // Record FileImportLog
    const status =
      errorRows === 0
        ? 'SUCCESS'
        : successRows === 0
          ? 'FAILED'
          : 'PARTIAL';

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
