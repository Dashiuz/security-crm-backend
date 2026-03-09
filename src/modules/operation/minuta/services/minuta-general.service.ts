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
    const { date, time, occurredAt, ...others } = dto;
    const parseTime = (t: string) =>
      t.includes('T') ? new Date(t) : new Date(`1970-01-01T${t}`);
    return this.repository.create({
      ...others,
      date: new Date(date),
      time: parseTime(time),
      occurredAt: new Date(occurredAt),
      tenant: { connect: { id: tenantId } },
      createdBy: { connect: { id: userId } },
    } as any);
  }

  async findAll() {
    return this.repository.findMany({
      status: { not: RecordStatus.VOIDED },
    });
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record) throw new NotFoundException('Minuta not found');
    return record;
  }

  async update(id: string, dto: UpdateMinutaDto, userId: string) {
    return this.repository.update({ id }, {
      ...dto,
      updatedBy: { connect: { id: userId } },
    } as any);
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
