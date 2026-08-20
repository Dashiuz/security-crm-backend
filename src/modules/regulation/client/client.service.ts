import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClientRepositoryService } from '../../../common/repository/client/client.repository.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientResponseDto,
} from './dtos/client.dto';
import { CreateClientWithStructureDto } from './dtos/client-structure.dto';
import { ClientStructureGeneratorService } from './services/client-structure-generator.service';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { toDateOnlyIso } from '../../../common/utils/convertDate';

@Injectable()
export class ClientService {
  constructor(
    private readonly clientRepository: ClientRepositoryService,
    private readonly structureGenerator: ClientStructureGeneratorService,
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
      contractDate: toDateOnlyIso(row.contractDate),
      lastContractDate: toDateOnlyIso(row.lastContractDate),
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

    const data = {
      ...clientFields,
      tenant: { connect: { id: user.tenantId } },
    } as any;

    // Clean relation scalar fields so Prisma payload doesn't contain unknown arguments
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

    // Date parsing
    const contractDate = new Date(clientFields.contractDate);
    const lastContractDate = new Date(clientFields.lastContractDate);

    if (
      Number.isNaN(contractDate.getTime()) ||
      Number.isNaN(lastContractDate.getTime())
    ) {
      throw new BadRequestException(
        'Las fechas de inicio y/o fin de contrato no son válidas.',
      );
    }

    data.contractDate = contractDate;
    data.lastContractDate = lastContractDate;

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
        where: { tenantId: user.tenantId },
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

    // Date parsing for updates
    if (clientFields.contractDate) {
      const d = new Date(clientFields.contractDate);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException('La fecha de contrato no es válida.');
      data.contractDate = d;
    }

    if (clientFields.lastContractDate) {
      const d = new Date(clientFields.lastContractDate);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException(
          'La última fecha de contrato no es válida.',
        );
      data.lastContractDate = d;
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
}
