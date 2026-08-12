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
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      ...r,
      createdBy: r.createdBy?.fullName || 'Sistema',
      clientName: r.client?.name || null,
    }));
  }

  async findUnique(
    where: Prisma.VisitorEntryControlWhereUniqueInput,
  ): Promise<VisitorEntryControl | null> {
    return this.prisma.visitorEntryControl.findUnique({ where });
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
