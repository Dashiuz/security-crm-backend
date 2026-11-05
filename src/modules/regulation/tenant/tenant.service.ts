import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantRepositoryService } from '../../../common/repository/index';
import { S3Service } from '../../storage/services/s3.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  UpdateTenantProfileDto,
  UpdateTenantSettingsDto,
  TenantProfileResponseDto,
  TenantSettingsResponseDto,
} from './dtos';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepositoryService,
    private readonly s3Service: S3Service,
  ) {}

  private mapTenant(t: any): TenantResponseDto {
    let resolvedLogoUrl = t.logoUrl || null;
    if (resolvedLogoUrl && resolvedLogoUrl.includes('amazonaws.com/')) {
      resolvedLogoUrl = `/api/tenants/${t.id}/logo`;
    }

    return {
      ...t,
      logoUrl: resolvedLogoUrl,
      features: t.features?.map((f: any) => f.key) || [],
      profile: t.profile || null,
      subscription: t.subscription || null,
      settings: t.settings || null,
    };
  }

  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    const tenantData: Prisma.TenantCreateInput = {
      name: dto.name,
      slug: dto.slug,
      isActive: dto.isActive ?? true,
      logoUrl: dto.logoUrl,
      primaryColor: dto.primaryColor ?? '#1976d2',
      secondaryColor: dto.secondaryColor ?? '#9c27b0',
      sidebarColor: dto.sidebarColor,
      profile: {
        create: {
          legalName: dto.profile?.legalName ?? dto.name,
          taxId: dto.profile?.taxId ?? 'N/A',
          contactEmail:
            dto.profile?.contactEmail ?? `contacto@${dto.slug}.local`,
          contactPhone: dto.profile?.contactPhone,
          address: dto.profile?.address,
          city: dto.profile?.city,
          country: dto.profile?.country,
          legalRepresentative: dto.profile?.legalRepresentative,
        },
      },
      subscription: {
        create: {
          planTier: dto.subscription?.planTier ?? 'BASIC',
          status: dto.subscription?.status ?? 'TRIAL',
          maxClients: dto.subscription?.maxClients ?? 5,
          maxUsers: dto.subscription?.maxUsers ?? 50,
          maxEmployees: dto.subscription?.maxEmployees ?? 50,
          subscriptionEndsAt: dto.subscription?.subscriptionEndsAt
            ? new Date(dto.subscription.subscriptionEndsAt)
            : null,
          paymentGatewayId: dto.subscription?.paymentGatewayId,
        },
      },
      settings: {
        create: {
          timezone: dto.settings?.timezone ?? 'America/Bogota',
          currency: dto.settings?.currency ?? 'COP',
          dateFormat: dto.settings?.dateFormat ?? 'DD/MM/YYYY',
          mfaRequired: dto.settings?.mfaRequired ?? false,
          sessionTimeoutMinutes: dto.settings?.sessionTimeoutMinutes ?? 60,
          passwordPolicy: dto.settings?.passwordPolicy ?? 'MEDIUM',
          faviconUrl: dto.settings?.faviconUrl,
          loginBackgroundUrl: dto.settings?.loginBackgroundUrl,
          supportEmail: dto.settings?.supportEmail,
          supportPhone: dto.settings?.supportPhone,
        },
      },
    };

    const tenant = await this.tenantRepository.create(tenantData);
    return this.mapTenant(tenant);
  }

  async list(): Promise<TenantResponseDto[]> {
    const tenants = await this.tenantRepository.findAll();
    return tenants.map((t) => this.mapTenant(t));
  }

  async findOne(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.mapTenant(tenant);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.findOne(id);
    if (
      (tenant.slug === 'system' || tenant.id === 'system') &&
      dto.isActive === false
    ) {
      throw new BadRequestException(
        'Cannot deactivate the system master tenant',
      );
    }

    const updateData: Prisma.TenantUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.logoUrl !== undefined) {
      if (!dto.logoUrl || dto.logoUrl.trim() === '') {
        updateData.logoUrl = null;
      } else if (
        !dto.logoUrl.startsWith('/api/tenants/') &&
        !dto.logoUrl.includes('/api/tenants/')
      ) {
        updateData.logoUrl = dto.logoUrl;
      }
    }
    if (dto.primaryColor !== undefined)
      updateData.primaryColor = dto.primaryColor;
    if (dto.secondaryColor !== undefined)
      updateData.secondaryColor = dto.secondaryColor;
    if (dto.sidebarColor !== undefined)
      updateData.sidebarColor = dto.sidebarColor;

    if (dto.profile) {
      updateData.profile = {
        upsert: {
          create: {
            legalName: dto.profile.legalName ?? tenant.name,
            taxId: dto.profile.taxId ?? 'N/A',
            contactEmail:
              dto.profile.contactEmail ?? `contacto@${tenant.slug}.local`,
            contactPhone: dto.profile.contactPhone,
            address: dto.profile.address,
            city: dto.profile.city,
            country: dto.profile.country,
            legalRepresentative: dto.profile.legalRepresentative,
          },
          update: {
            ...dto.profile,
          },
        },
      };
    }

    if (dto.subscription) {
      const sub = dto.subscription;
      updateData.subscription = {
        upsert: {
          create: {
            planTier: sub.planTier ?? 'BASIC',
            status: sub.status ?? 'TRIAL',
            maxClients: sub.maxClients ?? 5,
            maxUsers: sub.maxUsers ?? 50,
            maxEmployees: sub.maxEmployees ?? 50,
            subscriptionEndsAt: sub.subscriptionEndsAt
              ? new Date(sub.subscriptionEndsAt)
              : null,
            paymentGatewayId: sub.paymentGatewayId,
          },
          update: {
            ...sub,
            subscriptionEndsAt:
              sub.subscriptionEndsAt !== undefined
                ? sub.subscriptionEndsAt
                  ? new Date(sub.subscriptionEndsAt)
                  : null
                : undefined,
          },
        },
      };
    }

    if (dto.settings) {
      updateData.settings = {
        upsert: {
          create: {
            timezone: dto.settings.timezone ?? 'America/Bogota',
            currency: dto.settings.currency ?? 'COP',
            dateFormat: dto.settings.dateFormat ?? 'DD/MM/YYYY',
            mfaRequired: dto.settings.mfaRequired ?? false,
            sessionTimeoutMinutes: dto.settings.sessionTimeoutMinutes ?? 60,
            passwordPolicy: dto.settings.passwordPolicy ?? 'MEDIUM',
            faviconUrl: dto.settings.faviconUrl,
            loginBackgroundUrl: dto.settings.loginBackgroundUrl,
            supportEmail: dto.settings.supportEmail,
            supportPhone: dto.settings.supportPhone,
          },
          update: {
            ...dto.settings,
          },
        },
      };
    }

    const updated = await this.tenantRepository.update(id, updateData);
    return this.mapTenant(updated);
  }

  async updateProfile(
    tenantId: string,
    dto: UpdateTenantProfileDto,
  ): Promise<TenantProfileResponseDto> {
    const tenant = await this.findOne(tenantId);
    return this.tenantRepository.updateProfile(tenantId, dto, {
      tenant: { connect: { id: tenantId } },
      legalName: dto.legalName ?? tenant.name,
      taxId: dto.taxId ?? 'N/A',
      contactEmail: dto.contactEmail ?? `contacto@${tenant.slug}.local`,
      contactPhone: dto.contactPhone,
      address: dto.address,
      city: dto.city,
      country: dto.country,
      legalRepresentative: dto.legalRepresentative,
    });
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsResponseDto> {
    await this.findOne(tenantId);
    return this.tenantRepository.updateSettings(tenantId, dto, {
      tenant: { connect: { id: tenantId } },
      timezone: dto.timezone ?? 'America/Bogota',
      currency: dto.currency ?? 'COP',
      dateFormat: dto.dateFormat ?? 'DD/MM/YYYY',
      mfaRequired: dto.mfaRequired ?? false,
      sessionTimeoutMinutes: dto.sessionTimeoutMinutes ?? 60,
      passwordPolicy: dto.passwordPolicy ?? 'MEDIUM',
      faviconUrl: dto.faviconUrl,
      loginBackgroundUrl: dto.loginBackgroundUrl,
      supportEmail: dto.supportEmail,
      supportPhone: dto.supportPhone,
    });
  }

  async remove(id: string): Promise<TenantResponseDto> {
    const tenant = await this.findOne(id);
    if (tenant.slug === 'system' || tenant.id === 'system') {
      throw new BadRequestException('Cannot delete the system master tenant');
    }
    const removed = await this.tenantRepository.remove(id);
    return this.mapTenant(removed);
  }

  async listFeatures() {
    return this.tenantRepository.getAllFeatures();
  }

  async syncFeatures(
    id: string,
    featureKeys: string[],
  ): Promise<TenantResponseDto> {
    await this.findOne(id);
    const updated = await this.tenantRepository.syncFeatures(id, featureKeys);
    return this.mapTenant(updated);
  }

  async uploadLogo(
    id: string,
    file: Express.Multer.File,
  ): Promise<{ success: boolean; logoUrl: string }> {
    const tenant = await this.findOne(id);

    if (!file || !file.buffer) {
      throw new BadRequestException('Archivo de imagen no proporcionado');
    }

    const rawExt = file.originalname?.split('.').pop()?.toLowerCase() || 'png';
    const ext = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(rawExt)
      ? rawExt
      : 'png';

    const cleanName = file.originalname
      ? file.originalname.toLowerCase().replace(/[^a-z0-9.-]/g, '_')
      : `logo.${ext}`;
    const s3Key = `tenants/${tenant.id}/brand/logo-${Date.now()}-${cleanName}`;

    // Subir el archivo al bucket S3
    const uploadResult = await this.s3Service.uploadFile(file, s3Key);

    // Guardar la URL canónica de S3 en base de datos
    await this.tenantRepository.update(tenant.id, {
      logoUrl: uploadResult.url,
    });

    return {
      success: true,
      logoUrl: `/api/tenants/${tenant.id}/logo`,
    };
  }

  async getLogoStreamOrUrl(
    id: string,
  ): Promise<
    | { type: 'redirect'; url: string }
    | { type: 'buffer'; buffer: Buffer; mimeType: string }
  > {
    let tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      tenant = await this.tenantRepository.findBySlug(id);
    }
    if (
      !tenant ||
      !tenant.logoUrl ||
      tenant.logoUrl.startsWith('/api/tenants/') ||
      tenant.logoUrl.includes('/api/tenants/')
    ) {
      throw new NotFoundException('Logotipo no encontrado');
    }

    // 1. Data URL
    if (tenant.logoUrl.startsWith('data:')) {
      const matches = tenant.logoUrl.match(/^data:([A-Za-z+-/]+);base64,(.+)$/);
      if (matches) {
        return {
          type: 'buffer',
          mimeType: matches[1],
          buffer: Buffer.from(matches[2], 'base64'),
        };
      }
    }

    // 2. S3 URL: Extraer s3Key y generar Presigned URL fresca
    if (tenant.logoUrl.includes('amazonaws.com/')) {
      const s3Key = tenant.logoUrl.split('amazonaws.com/')[1];
      const presigned = await this.s3Service.getPresignedUrl(s3Key);
      return {
        type: 'redirect',
        url: presigned,
      };
    }

    // 3. URL externa normal
    return {
      type: 'redirect',
      url: tenant.logoUrl,
    };
  }
}
