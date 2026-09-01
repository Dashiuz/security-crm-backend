import { Injectable } from '@nestjs/common';
import { Prisma, VisitorEntryControl } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class VisitorControlRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.VisitorEntryControlCreateInput,
  ): Promise<VisitorEntryControl> {
    return this.prisma.visitorEntryControl.create({ data });
  }

  async findMany(
    where?: Prisma.VisitorEntryControlWhereInput,
  ): Promise<any[]> {
    const rows = await this.prisma.visitorEntryControl.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
        unit: { select: { id: true, unitName: true, unitType: true } },
        resident: { select: { id: true, firstName: true, lastName: true, document: true } },
        mediaAttachments: { select: { id: true, url: true, fileName: true, mimeType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      ...r,
      createdBy: r.createdBy?.fullName || 'Sistema',
      clientName: r.client?.name || null,
      unitName: r.unit?.unitName || null,
      residentName: r.resident ? `${r.resident.firstName} ${r.resident.lastName}` : null,
    }));
  }

  async findUnique(
    where: Prisma.VisitorEntryControlWhereUniqueInput,
  ): Promise<any> {
    return this.prisma.visitorEntryControl.findUnique({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
        unit: { select: { id: true, unitName: true, unitType: true } },
        resident: { select: { id: true, firstName: true, lastName: true, document: true } },
        mediaAttachments: { select: { id: true, url: true, fileName: true, mimeType: true } },
      },
    });
  }

  async update(
    where: Prisma.VisitorEntryControlWhereUniqueInput,
    data: Prisma.VisitorEntryControlUpdateInput,
  ): Promise<VisitorEntryControl> {
    return this.prisma.visitorEntryControl.update({ where, data });
  }

  async delete(
    where: Prisma.VisitorEntryControlWhereUniqueInput,
  ): Promise<VisitorEntryControl> {
    return this.prisma.visitorEntryControl.delete({ where });
  }
}
