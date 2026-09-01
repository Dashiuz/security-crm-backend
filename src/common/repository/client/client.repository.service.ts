import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Client } from '@prisma/client';

@Injectable()
export class ClientRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ClientCreateInput): Promise<Client> {
    return this.prisma.client.create({
      data,
    });
  }

  async findMany(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ClientWhereUniqueInput;
    where?: Prisma.ClientWhereInput;
    orderBy?: Prisma.ClientOrderByWithRelationInput;
    include?: Prisma.ClientInclude;
  }): Promise<Client[]> {
    return this.prisma.client.findMany(params);
  }

  async findOne(
    id: string,
    include?: Prisma.ClientInclude,
  ): Promise<Client | null> {
    return this.prisma.client.findUnique({
      where: { id },
      include,
    });
  }

  async update(id: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<Client> {
    return this.prisma.client.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
