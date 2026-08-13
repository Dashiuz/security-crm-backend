import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TenantCreateInput) {
    try {
      return await this.prisma.tenant.create({ data });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe una empresa registrada con este nombre o identificador (slug).',
        );
      }
      throw e;
    }
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
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe una empresa registrada con este nombre o identificador (slug).',
        );
      }
      throw e;
    }
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
