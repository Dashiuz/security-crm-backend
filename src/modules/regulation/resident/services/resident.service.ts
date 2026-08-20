import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ResidentRepositoryService } from '../../../../common/repository/resident/resident.repository.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateResidentDto,
  UpdateResidentDto,
  ResidentResponseDto,
} from '../dtos/resident.dto';
import { UserContext } from '../../../../common/interfaces/user-context.interface';
import { ResidentType } from '@prisma/client';

@Injectable()
export class ResidentService {
  constructor(
    private readonly residentRepository: ResidentRepositoryService,
    private readonly prisma: PrismaService,
  ) {}

  private mapResidentToResponse(row: any): ResidentResponseDto {
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

  private parseDate(val?: string | null): Date | null {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  async create(
    dto: CreateResidentDto,
    user: UserContext,
  ): Promise<ResidentResponseDto> {
    // 1. Single OWNER rule validation
    if (dto.residentType === ResidentType.OWNER) {
      const existingOwner = await this.prisma.resident.findFirst({
        where: {
          tenantId: user.tenantId,
          unitId: dto.unitId,
          residentType: ResidentType.OWNER,
          deletedAt: null,
        },
      });

      if (existingOwner) {
        throw new BadRequestException(
          'La unidad seleccionada ya cuenta con un Propietario (OWNER) asignado. Seleccione otro tipo de residente (Inquilino, Familiar, etc.).',
        );
      }
    }

    const data: any = {
      tenant: { connect: { id: user.tenantId } },
      client: { connect: { id: dto.clientId } },
      unit: { connect: { id: dto.unitId } },
      residentType: dto.residentType,
      idType: dto.idType || null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      document: dto.document,
      phoneNumber: dto.phoneNumber,
      email: dto.email || null,
      gender: dto.gender || null,
      birthdate: this.parseDate(dto.birthdate),
      residentSince: this.parseDate(dto.residentSince) || new Date(),
      accessStartDate: this.parseDate(dto.accessStartDate),
      accessEndDate: this.parseDate(dto.accessEndDate),
    };

    if (user.sub && user.sub !== 'system') {
      data.createdBy = { connect: { id: user.sub } };
    }

    try {
      const res = await this.residentRepository.create(data);
      return this.findOne(res.id, user);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Ya existe un residente registrado con el número de documento "${dto.document}" en este conjunto residencial.`,
        );
      }
      throw err;
    }
  }

  async findByClient(
    clientId: string,
    user: UserContext,
  ): Promise<ResidentResponseDto[]> {
    return this.residentRepository
      .findMany({
        where: {
          tenantId: user.tenantId,
          clientId,
          deletedAt: null,
        },
        include: {
          unit: {
            include: {
              tower: true,
              floor: true,
            },
          },
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => rows.map((r) => this.mapResidentToResponse(r))) as any;
  }

  async findOne(id: string, user: UserContext): Promise<ResidentResponseDto> {
    const resident = await this.residentRepository.findOne(id, {
      unit: {
        include: {
          tower: true,
          floor: true,
        },
      },
      createdBy: true,
    });

    if (!resident || resident.tenantId !== user.tenantId || resident.deletedAt) {
      throw new NotFoundException('Residente no encontrado');
    }

    return this.mapResidentToResponse(resident);
  }

  async update(
    id: string,
    dto: UpdateResidentDto,
    user: UserContext,
  ): Promise<ResidentResponseDto> {
    const current = await this.findOne(id, user);

    const targetUnitId = dto.unitId || (current as any).unitId;
    const targetType = dto.residentType || current.residentType;

    // Single OWNER rule validation on update
    if (targetType === ResidentType.OWNER) {
      const existingOwner = await this.prisma.resident.findFirst({
        where: {
          tenantId: user.tenantId,
          unitId: targetUnitId,
          residentType: ResidentType.OWNER,
          deletedAt: null,
          NOT: { id },
        },
      });

      if (existingOwner) {
        throw new BadRequestException(
          'La unidad seleccionada ya cuenta con un Propietario (OWNER) asignado. Seleccione otro tipo de residente (Inquilino, Familiar, etc.).',
        );
      }
    }

    const data: any = {};
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.document) data.document = dto.document;
    if (dto.phoneNumber) data.phoneNumber = dto.phoneNumber;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.gender !== undefined) data.gender = dto.gender || null;
    if (dto.residentType) data.residentType = dto.residentType;
    if (dto.idType !== undefined) data.idType = dto.idType || null;
    if (dto.unitId) data.unit = { connect: { id: dto.unitId } };
    if (dto.birthdate !== undefined) data.birthdate = this.parseDate(dto.birthdate);
    if (dto.residentSince !== undefined)
      data.residentSince = this.parseDate(dto.residentSince) || new Date();
    if (dto.accessStartDate !== undefined)
      data.accessStartDate = this.parseDate(dto.accessStartDate);
    if (dto.accessEndDate !== undefined)
      data.accessEndDate = this.parseDate(dto.accessEndDate);

    if (user.sub && user.sub !== 'system') {
      data.updatedBy = { connect: { id: user.sub } };
    }

    try {
      await this.residentRepository.update(id, data);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Ya existe un residente registrado con el número de documento "${dto.document || current.document}" en este conjunto residencial.`,
        );
      }
      throw err;
    }

    return this.findOne(id, user);
  }

  async remove(id: string, user: UserContext): Promise<ResidentResponseDto> {
    await this.findOne(id, user);
    await this.residentRepository.softDelete(id, user.sub);
    return { success: true } as any;
  }
}
