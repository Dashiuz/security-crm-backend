import { Injectable } from '@nestjs/common';
import { Prisma, CorrespondenceReceivedControl } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CorrespondenceRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CorrespondenceReceivedControlCreateInput,
  ): Promise<CorrespondenceReceivedControl> {
    return this.prisma.correspondenceReceivedControl.create({ data });
  }

  async findMany(
    where?: Prisma.CorrespondenceReceivedControlWhereInput,
  ): Promise<any[]> {
    const rows = await this.prisma.correspondenceReceivedControl.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
        unit: { select: { id: true, unitName: true, unitType: true } },
        recipientResident: { select: { id: true, firstName: true, lastName: true, document: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      ...r,
      createdBy: r.createdBy?.fullName || 'Sistema',
      clientName: r.client?.name || null,
      unitName: r.unit?.unitName || null,
      recipientResidentName: r.recipientResident ? `${r.recipientResident.firstName} ${r.recipientResident.lastName}` : null,
    }));
  }

  async findUnique(
    where: Prisma.CorrespondenceReceivedControlWhereUniqueInput,
  ): Promise<any> {
    return this.prisma.correspondenceReceivedControl.findUnique({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
        unit: { select: { id: true, unitName: true, unitType: true } },
        recipientResident: { select: { id: true, firstName: true, lastName: true, document: true } },
      },
    });
  }

  async update(
    where: Prisma.CorrespondenceReceivedControlWhereUniqueInput,
    data: Prisma.CorrespondenceReceivedControlUpdateInput,
  ): Promise<CorrespondenceReceivedControl> {
    return this.prisma.correspondenceReceivedControl.update({ where, data });
  }

  async delete(
    where: Prisma.CorrespondenceReceivedControlWhereUniqueInput,
  ): Promise<CorrespondenceReceivedControl> {
    return this.prisma.correspondenceReceivedControl.delete({ where });
  }
}
