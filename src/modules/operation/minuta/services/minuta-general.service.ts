import { Injectable, NotFoundException } from '@nestjs/common';
import { MinutaRepositoryService } from '../../../../common/repository/minuta/minuta/minuta.repository.service';
import {
  CreateMinutaDto,
  UpdateMinutaDto,
  VoidRecordDto,
} from '../dtos/minuta-general.dto';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class MinutaGeneralService {
  constructor(private readonly repository: MinutaRepositoryService) {}

  async create(dto: CreateMinutaDto, userId: string, tenantId: string) {
    const { date, time, occurredAt, unitId, residentId, clientId, ...others } =
      dto;
    const parseTime = (t: string) =>
      t.includes('T')
        ? new Date(t)
        : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);

    const dataToCreate: any = {
      ...others,
      date: new Date(date),
      time: parseTime(time),
      occurredAt: new Date(occurredAt),
      tenant: { connect: { id: tenantId } },
      createdBy: { connect: { id: userId } },
    };

    if (clientId) {
      dataToCreate.client = { connect: { id: clientId } };
    }
    if (unitId) {
      dataToCreate.unit = { connect: { id: unitId } };
    }
    if (residentId) {
      dataToCreate.resident = { connect: { id: residentId } };
    }

    return this.repository.create(dataToCreate);
  }

  async findAll(query?: any) {
    const where: any = {
      status: { not: RecordStatus.VOIDED },
      deletedAt: null,
    };
    if (query?.isInternal === 'true') {
      where.clientId = null;
    } else if (query?.clientId) {
      where.clientId = query.clientId;
    }
    if (query?.unitId) {
      where.unitId = query.unitId;
    }
    if (query?.residentId) {
      where.residentId = query.residentId;
    }
    if (query?.search) {
      where.annotation = { contains: query.search.trim(), mode: 'insensitive' };
    }
    if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }
    return this.repository.findMany(where);
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record || record.deletedAt)
      throw new NotFoundException('Minuta not found');
    return record;
  }

  async update(id: string, dto: UpdateMinutaDto, userId: string) {
    const { date, time, occurredAt, unitId, residentId, ...others } = dto;
    const parseTime = (t: string) =>
      t.includes('T')
        ? new Date(t)
        : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);

    const updateData: Record<string, unknown> = { ...others };
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = parseTime(time);
    if (occurredAt) updateData.occurredAt = new Date(occurredAt);
    if (unitId !== undefined) {
      (updateData as any).unit = unitId
        ? { connect: { id: unitId } }
        : { disconnect: true };
    }
    if (residentId !== undefined) {
      (updateData as any).resident = residentId
        ? { connect: { id: residentId } }
        : { disconnect: true };
    }

    return this.repository.update(
      { id },
      {
        ...updateData,
        updatedBy: { connect: { id: userId } },
      },
    );
  }

  async void(id: string, dto: VoidRecordDto, userId: string) {
    return this.repository.update({ id }, {
      status: RecordStatus.VOIDED,
      voidReason: dto.voidReason,
      voidedAt: new Date(),
      voidedBy: { connect: { id: userId } },
    } as any);
  }

  async remove(id: string, userId: string) {
    // Soft delete if preferred, or hard delete
    return this.repository.update({ id }, {
      deletedAt: new Date(),
      deletedBy: { connect: { id: userId } },
    } as any);
  }
}
