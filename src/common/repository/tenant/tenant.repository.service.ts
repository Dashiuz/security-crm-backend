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
      include: { features: { select: { key: true } } },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { features: { select: { key: true } } },
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

  async getAllFeatures() {
    return this.prisma.feature.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async syncFeatures(tenantId: string, featureKeys: string[]) {
    // We disconnect all and reconnect the new ones for a perfect sync
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        features: {
          set: [], // Clear existing
          connect: featureKeys.map((key) => ({ key })), // Connect new
        },
      },
      include: { features: { select: { key: true } } },
    });
  }
}
