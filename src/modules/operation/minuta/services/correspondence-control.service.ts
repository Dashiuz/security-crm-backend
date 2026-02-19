import { Injectable, NotFoundException } from '@nestjs/common';
import { CorrespondenceRepositoryService } from '../../../../common/repository/minuta/correspondence-control/correspondence-control.repository.service';
import {
  CreateCorrespondenceDto,
  UpdateCorrespondenceDto,
} from '../dtos/correspondence-control.dto';
import { VoidRecordDto } from '../dtos/minuta-general.dto';
import { RecordStatus, CorrespondenceStatus } from '@prisma/client';

@Injectable()
export class CorrespondenceControlService {
  constructor(private readonly repository: CorrespondenceRepositoryService) {}

  async create(dto: CreateCorrespondenceDto, userId: string) {
    return this.repository.create({
      ...dto,
      date: new Date(dto.date),
      time: new Date(`1970-01-01T${dto.time}`),
      occurredAt: new Date(dto.occurredAt),
      receivedTime: new Date(`1970-01-01T${dto.receivedTime}`),
      createdBy: { connect: { id: userId } },
      guardOnDuty: { connect: { id: userId } },
    } as any);
  }

  async findAll() {
    return this.repository.findMany({
      // status: { not: CorrespondenceStatus.VOIDED }, // Correspondence has its own status enum with VOIDED
    });
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record) throw new NotFoundException('Correspondence record not found');
    return record;
  }

  async update(id: string, dto: UpdateCorrespondenceDto, userId: string) {
    const updateData: any = { ...dto };
    if (dto.deliveredAt) updateData.deliveredAt = new Date(dto.deliveredAt);

    return this.repository.update({ id }, {
      ...updateData,
      updatedBy: { connect: { id: userId } },
    } as any);
  }

  async void(id: string, dto: VoidRecordDto, userId: string) {
    return this.repository.update({ id }, {
      status: CorrespondenceStatus.VOIDED,
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
