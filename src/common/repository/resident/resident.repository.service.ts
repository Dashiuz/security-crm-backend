import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Resident } from '@prisma/client';

@Injectable()
export class ResidentRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ResidentCreateInput): Promise<Resident> {
    return this.prisma.resident.create({
      data,
    });
  }

  async findMany(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ResidentWhereUniqueInput;
    where?: Prisma.ResidentWhereInput;
    orderBy?: Prisma.ResidentOrderByWithRelationInput;
    include?: Prisma.ResidentInclude;
  }): Promise<Resident[]> {
    return this.prisma.resident.findMany(params);
  }

  async findOne(
    id: string,
    include?: Prisma.ResidentInclude,
  ): Promise<Resident | null> {
    return this.prisma.resident.findUnique({
      where: { id },
      include,
    });
  }

  async update(id: string, data: Prisma.ResidentUpdateInput): Promise<Resident> {
    return this.prisma.resident.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, deletedById?: string): Promise<Resident> {
    const data: Prisma.ResidentUpdateInput = {
      deletedAt: new Date(),
    };
    if (deletedById && deletedById !== 'system') {
      data.deletedBy = { connect: { id: deletedById } };
    }
    return this.prisma.resident.update({
      where: { id },
      data,
    });
  }
}
