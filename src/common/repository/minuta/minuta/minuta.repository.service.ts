import { Injectable } from '@nestjs/common';
import { Prisma, Minuta } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class MinutaRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MinutaCreateInput): Promise<Minuta> {
    return this.prisma.minuta.create({ data });
  }

  async findMany(where?: Prisma.MinutaWhereInput): Promise<any[]> {
    const rows = await this.prisma.minuta.findMany({
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
    where: Prisma.MinutaWhereUniqueInput,
  ): Promise<Minuta | null> {
    return this.prisma.minuta.findUnique({ where });
  }

  async update(
    where: Prisma.MinutaWhereUniqueInput,
    data: Prisma.MinutaUpdateInput,
  ): Promise<Minuta> {
    return this.prisma.minuta.update({ where, data });
  }

  async delete(where: Prisma.MinutaWhereUniqueInput): Promise<Minuta> {
    return this.prisma.minuta.delete({ where });
  }
}
