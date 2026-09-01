import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateProspectDto,
  CreateProspectWithStructureDto,
  UpdateProspectDto,
  ConvertProspectDto,
  ProspectResponseDto,
} from './dtos/prospect.dto';
import { ClientStructureGeneratorService } from '../client/services/client-structure-generator.service';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { ClientStatus } from '@prisma/client';

@Injectable()
export class ProspectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly structureGenerator: ClientStructureGeneratorService,
  ) {}

  private mapProspectToResponse(row: any): ProspectResponseDto {
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
      createdBy: createdByName,
    };
  }

  private handlePrismaError(error: any): never {
    if (error?.code === 'P2002') {
      const target = (error?.meta?.target as string[]) || [];
      const targetStr = Array.isArray(target) ? target.join(', ') : String(target);
      if (targetStr.includes('nit')) {
        throw new ConflictException(
          'Ya existe un prospecto o cliente registrado con este número de NIT.',
        );
      }
      if (targetStr.includes('internalCode')) {
        throw new ConflictException(
          'Ya existe un prospecto o cliente registrado con este Código Interno.',
        );
      }
      throw new ConflictException(
        `Ya existe un registro duplicado en el sistema (${targetStr}).`,
      );
    }
    throw error;
  }

  async create(
    dto: CreateProspectDto | CreateProspectWithStructureDto,
    user: UserContext,
  ): Promise<ProspectResponseDto> {
    const { structureConfig, ...prospectFields } = dto as any;

    const internalCode =
      prospectFields.internalCode && prospectFields.internalCode.trim() !== ''
        ? prospectFields.internalCode.trim()
        : `PROSP-${Math.floor(1000 + Math.random() * 9000)}`;

    const data: any = {
      ...prospectFields,
      internalCode,
      clientStatus: ClientStatus.PROSPECT,
      tenant: { connect: { id: user.tenantId } },
    };

    if (user.sub && user.sub !== 'system') {
      data.createdBy = { connect: { id: user.sub } };
    }

    let res: any;
    try {
      res = await this.prisma.client.create({ data });
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
          `Error al generar la estructura del prospecto: ${err.message}`,
        );
      }
    }

    return this.findOne(res.id, user);
  }

  async findAll(user: UserContext): Promise<ProspectResponseDto[]> {
    const rows = await this.prisma.client.findMany({
      where: {
        tenantId: user.tenantId,
        clientStatus: ClientStatus.PROSPECT,
        deletedAt: null,
      },
      include: {
        createdBy: true,
        clientProperties: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => this.mapProspectToResponse(r));
  }

  async findOne(id: string, user: UserContext): Promise<ProspectResponseDto> {
    const prospect = await this.prisma.client.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        clientStatus: ClientStatus.PROSPECT,
      },
      include: {
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
      },
    });

    if (!prospect) {
      throw new NotFoundException('Prospecto no encontrado');
    }

    return this.mapProspectToResponse(prospect);
  }

  async update(
    id: string,
    dto: UpdateProspectDto,
    user: UserContext,
  ): Promise<ProspectResponseDto> {
    await this.findOne(id, user);

    const { structureConfig, ...prospectFields } = dto as any;
    const data: any = { ...prospectFields };

    if (user.sub && user.sub !== 'system') {
      data.updatedBy = { connect: { id: user.sub } };
    }

    try {
      await this.prisma.client.update({
        where: { id },
        data,
      });
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

  async remove(id: string, user: UserContext): Promise<{ success: boolean }> {
    await this.findOne(id, user);
    const userId = user.sub;
    const data: any = {
      isActive: false,
      deletedAt: new Date(),
    };
    if (userId && userId !== 'system') {
      data.deletedBy = { connect: { id: userId } };
    }
    await this.prisma.client.update({
      where: { id },
      data,
    });
    return { success: true };
  }

  async convertToClient(
    id: string,
    dto: ConvertProspectDto,
    user: UserContext,
  ): Promise<any> {
    const parseOptionalDate = (val: any) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return null;
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const contractDate = parseOptionalDate(dto.contractDate);
    const lastContractDate = parseOptionalDate(
      dto.lastContractDate || dto.contractEndDate,
    );
    if (!contractDate || !lastContractDate) {
      throw new BadRequestException('Fechas de contrato no válidas.');
    }

    const data: any = {
      clientStatus: ClientStatus.ACTIVE,
      contractNumber: dto.contractNumber.trim(),
      contractDate,
      lastContractDate,
      contractEndDate: lastContractDate,
      renewedContract: dto.renewedContract ?? false,
      contractMediaFiles: dto.contractMediaFiles || undefined,
      administrationType: dto.administrationType || undefined,
      administrationCompanyData: dto.administrationCompanyData || undefined,
      councilData: dto.councilData || undefined,
    };

    if (dto.coordinatorInChargeId && dto.coordinatorInChargeId.trim() !== '') {
      data.coordinatorInCharge = { connect: { id: dto.coordinatorInChargeId } };
    }

    if (dto.commercialContactId && dto.commercialContactId.trim() !== '') {
      data.commercialContact = { connect: { id: dto.commercialContactId } };
    }

    if (user.sub && user.sub !== 'system') {
      data.updatedBy = { connect: { id: user.sub } };
    }

    try {
      const updated = await this.prisma.client.update({
        where: { id },
        data,
      });
      return updated;
    } catch (err: any) {
      this.handlePrismaError(err);
    }
  }
}
