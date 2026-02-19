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

  async create(dto: CreateVisitorEntryDto, userId: string) {
    return this.repository.create({
      ...dto,
      date: new Date(dto.date),
      time: new Date(`1970-01-01T${dto.time}`),
      occurredAt: new Date(dto.occurredAt),
      entryTime: new Date(`1970-01-01T${dto.entryTime}`),
      createdBy: { connect: { id: userId } },
      guard: { connect: { id: userId } },
    } as any);
  }

  async findAll() {
    return this.repository.findMany({
      status: { not: RecordStatus.VOIDED },
    });
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record) throw new NotFoundException('Visitor record not found');
    return record;
  }

  async update(id: string, dto: UpdateVisitorEntryDto, userId: string) {
    const updateData: any = { ...dto };
    if (dto.exitTime)
      updateData.exitTime = new Date(`1970-01-01T${dto.exitTime}`);
    if (dto.exitAt) updateData.exitAt = new Date(dto.exitAt);

    return this.repository.update({ id }, {
      ...updateData,
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
    return this.repository.update({ id }, {
      deletedAt: new Date(),
      deletedBy: { connect: { id: userId } },
    } as any);
  }
}
