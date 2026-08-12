import { Injectable, NotFoundException } from '@nestjs/common';
import { VisitorControlRepositoryService } from '../../../../common/repository/minuta/visitor-control/visitor-control.repository.service';
import {
  CreateVisitorEntryDto,
  UpdateVisitorEntryDto,
} from '../dtos/visitor-control.dto';
import { VoidRecordDto } from '../dtos/minuta-general.dto';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class VisitorControlService {
  constructor(private readonly repository: VisitorControlRepositoryService) {}

  async create(dto: CreateVisitorEntryDto, userId: string, tenantId: string) {
    const { date, time, occurredAt, entryTime, ...others } = dto;
    const parseTime = (t: string) =>
      t.includes('T')
        ? new Date(t)
        : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);
    return this.repository.create({
      ...others,
      date: new Date(date),
      time: parseTime(time),
      occurredAt: new Date(occurredAt),
      entryTime: parseTime(entryTime),
      tenant: { connect: { id: tenantId } },
      createdBy: { connect: { id: userId } },
      guard: { connect: { id: userId } },
    } as any);
  }

  async findAll(clientId?: string) {
    const where: any = {
      status: { not: RecordStatus.VOIDED },
      deletedAt: null,
    };
    if (clientId) {
      where.clientId = clientId;
    }
    return this.repository.findMany(where);
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record || record.deletedAt) throw new NotFoundException('Visitor record not found');
    return record;
  }

  async update(id: string, dto: UpdateVisitorEntryDto, userId: string) {
    const { date, time, occurredAt, entryTime, exitTime, exitAt, ...others } =
      dto;
    const parseTime = (t: string) =>
      t.includes('T')
        ? new Date(t)
        : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);

    const updateData: Record<string, unknown> = { ...others };
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = parseTime(time);
    if (occurredAt) updateData.occurredAt = new Date(occurredAt);
    if (entryTime) updateData.entryTime = parseTime(entryTime);
    if (exitTime) updateData.exitTime = parseTime(exitTime);
    if (exitAt) updateData.exitAt = new Date(exitAt);

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
    return this.repository.update({ id }, {
      deletedAt: new Date(),
      deletedBy: { connect: { id: userId } },
    } as any);
  }
}
