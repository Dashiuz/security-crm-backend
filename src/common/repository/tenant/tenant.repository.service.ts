import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TenantCreateInput) {
    try {
      return await this.prisma.tenant.create({
        data,
        include: {
          features: { select: { key: true } },
          profile: true,
          subscription: true,
          settings: true,
        },
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

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        features: { select: { key: true } },
        profile: true,
        subscription: true,
        settings: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        features: { select: { key: true } },
        profile: true,
        subscription: true,
        settings: true,
      },
    });
  }

  async update(id: string, data: Prisma.TenantUpdateInput) {
    try {
      return await this.prisma.tenant.update({
        where: { id },
        data,
        include: {
          features: { select: { key: true } },
          profile: true,
          subscription: true,
          settings: true,
        },
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

  async updateProfile(
    tenantId: string,
    data: Prisma.TenantProfileUpdateInput,
    defaultData: Prisma.TenantProfileCreateInput,
  ) {
    return this.prisma.tenantProfile.upsert({
      where: { tenantId },
      update: data,
      create: defaultData,
    });
  }

  async updateSettings(
    tenantId: string,
    data: Prisma.TenantSettingsUpdateInput,
    defaultData: Prisma.TenantSettingsCreateInput,
  ) {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      update: data,
      create: defaultData,
    });
  }

  async updateSubscription(
    tenantId: string,
    data: Prisma.TenantSubscriptionUpdateInput,
    defaultData: Prisma.TenantSubscriptionCreateInput,
  ) {
    return this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: data,
      create: defaultData,
    });
  }

  async remove(id: string) {
    return this.prisma.tenant.delete({
      where: { id },
      include: {
        features: { select: { key: true } },
        profile: true,
        subscription: true,
        settings: true,
      },
    });
  }

  async getAllFeatures() {
    return this.prisma.feature.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async syncFeatures(tenantId: string, featureKeys: string[]) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        features: {
          set: [],
          connect: featureKeys.map((key) => ({ key })),
        },
      },
      include: {
        features: { select: { key: true } },
        profile: true,
        subscription: true,
        settings: true,
      },
    });
  }
}
