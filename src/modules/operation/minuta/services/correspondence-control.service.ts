import { Injectable, NotFoundException } from '@nestjs/common';
import { CorrespondenceRepositoryService } from '../../../../common/repository/minuta/correspondence-control/correspondence-control.repository.service';
import {
  CreateCorrespondenceDto,
  UpdateCorrespondenceDto,
  DeliverCorrespondenceDto,
} from '../dtos/correspondence-control.dto';
import { VoidRecordDto } from '../dtos/minuta-general.dto';
import { CorrespondenceStatus } from '@prisma/client';

@Injectable()
export class CorrespondenceControlService {
  constructor(private readonly repository: CorrespondenceRepositoryService) {}

  async create(dto: CreateCorrespondenceDto, userId: string, tenantId: string) {
    const { date, time, occurredAt, receivedTime, clientId, unitId, recipientResidentId, ...others } = dto;
    const parseTime = (t: string) =>
      t.includes('T')
        ? new Date(t)
        : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);

    const dataToCreate: any = {
      ...others,
      date: new Date(date),
      time: parseTime(time),
      occurredAt: new Date(occurredAt),
      receivedTime: parseTime(receivedTime),
      tenant: { connect: { id: tenantId } },
      createdBy: { connect: { id: userId } },
      guardOnDuty: { connect: { id: userId } },
    };

    if (clientId) {
      dataToCreate.client = { connect: { id: clientId } };
    }
    if (unitId) {
      dataToCreate.unit = { connect: { id: unitId } };
    }
    if (recipientResidentId) {
      dataToCreate.recipientResident = { connect: { id: recipientResidentId } };
    }

    return this.repository.create(dataToCreate);
  }

  async findAll(clientId?: string) {
    const where: any = {
      status: { not: CorrespondenceStatus.VOIDED },
      deletedAt: null,
    };
    if (clientId) {
      where.clientId = clientId;
    }
    return this.repository.findMany(where);
  }

  async findOne(id: string) {
    const record = await this.repository.findUnique({ id });
    if (!record || record.deletedAt) throw new NotFoundException('Correspondence record not found');
    return record;
  }

  async update(id: string, dto: UpdateCorrespondenceDto, userId: string) {
    const { date, time, occurredAt, receivedTime, deliveredAt, unitId, recipientResidentId, ...others } = dto;
    const parseTime = (t: string) =>
      t.includes('T') ? new Date(t) : new Date(`1970-01-01T${t.length === 5 ? t + ':00' : t}`);

    const updateData: Record<string, unknown> = { ...others };
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = parseTime(time);
    if (occurredAt) updateData.occurredAt = new Date(occurredAt);
    if (receivedTime) updateData.receivedTime = parseTime(receivedTime);
    if (deliveredAt) updateData.deliveredAt = new Date(deliveredAt);
    if (unitId) (updateData as any).unit = { connect: { id: unitId } };
    if (recipientResidentId) (updateData as any).recipientResident = { connect: { id: recipientResidentId } };

    return this.repository.update({ id }, {
      ...updateData,
      updatedBy: { connect: { id: userId } },
    } as any);
  }

  async deliver(id: string, dto: DeliverCorrespondenceDto, userId?: string) {
    await this.findOne(id);
    const updateData: any = {
      status: CorrespondenceStatus.DELIVERED,
      deliveredAt: new Date(),
      deliveredToName: dto.deliveredToName,
      ...(dto.deliveryEvidenceUrl ? { deliveryEvidenceUrl: dto.deliveryEvidenceUrl } : {}),
      ...(dto.deliveryNotes ? { deliveryNotes: dto.deliveryNotes } : {}),
    };

    if (userId && userId !== 'system') {
      updateData.updatedBy = { connect: { id: userId } };
    }

    return this.repository.update({ id }, updateData);
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
