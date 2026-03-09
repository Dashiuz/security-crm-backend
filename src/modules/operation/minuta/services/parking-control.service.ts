import { Injectable, NotFoundException } from '@nestjs/common';
import { ParkingControlRepositoryService } from '../../../../common/repository/minuta/parking-control/parking-control.repository.service';
import {
  CreateParkingControlDto,
  UpdateParkingControlDto,
} from '../dtos/parking-control.dto';
import { VoidRecordDto } from '../dtos/minuta-general.dto';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class ParkingControlService {
  constructor(private readonly repository: ParkingControlRepositoryService) {}

  async create(dto: CreateParkingControlDto, userId: string, tenantId: string) {
    const { date, time, occurredAt, entryTime, ...others } = dto;
    const parseTime = (t: string) =>
      t.includes('T') ? new Date(t) : new Date(`1970-01-01T${t}`);
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

  async findAll() {
    return this.repository.findMany({
      status: { not: RecordStatus.VOIDED },
    });
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record) throw new NotFoundException('Parking record not found');
    return record;
  }

  async update(id: string, dto: UpdateParkingControlDto, userId: string) {
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
