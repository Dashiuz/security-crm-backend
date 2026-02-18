import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TenantCreateInput) {
    return this.prisma.tenant.create({ data });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.TenantUpdateInput) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.tenant.delete({
      where: { id },
    });
  }
}
