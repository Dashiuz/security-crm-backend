import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, SignerRoleScope } from '@prisma/client';

@Injectable()
export class DocumentEngineRepository {
  private readonly logger = new Logger(DocumentEngineRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Piel Documental de Marca (TenantDocumentSkin)
  // ==========================================

  async findSkinByTenantId(tenantId: string) {
    return this.prisma.tenantDocumentSkin.findUnique({
      where: { tenantId },
      include: {
        signers: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        textSnippets: {
          where: { isActive: true },
          orderBy: { category: 'asc' },
        },
      },
    });
  }

  async upsertSkin(
    tenantId: string,
    commercialSettingsId: string,
    data: Prisma.TenantDocumentSkinUpdateInput,
    userId?: string,
  ) {
    return this.prisma.tenantDocumentSkin.upsert({
      where: { tenantId },
      create: {
        tenant: { connect: { id: tenantId } },
        commercialSettings: { connect: { id: commercialSettingsId } },
        companyLegalName:
          (data.companyLegalName as string) || 'EMPRESA DE SEGURIDAD',
        companyNit: (data.companyNit as string) || '900.000.000-1',
        primaryBrandColorHex:
          (data.primaryBrandColorHex as string) || '#1E1B4B',
        accentBrandColorHex: (data.accentBrandColorHex as string) || '#7C3AED',
        secondaryColorHex: (data.secondaryColorHex as string) || '#F59E0B',
        neutralDarkHex: (data.neutralDarkHex as string) || '#0F172A',
        neutralLightHex: (data.neutralLightHex as string) || '#F8FAFC',
        headerLayout: (data.headerLayout as any) || 'CLASSIC_MEMBRETE',
        createdById: userId,
        updatedById: userId,
      },
      update: {
        ...data,
        updatedById: userId,
      },
      include: {
        signers: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        textSnippets: {
          where: { isActive: true },
          orderBy: { category: 'asc' },
        },
      },
    });
  }

  async updateSkinLogo(skinId: string, logoS3Key: string, userId?: string) {
    return this.prisma.tenantDocumentSkin.update({
      where: { id: skinId },
      data: {
        logoS3Key,
        updatedById: userId,
      },
    });
  }

  // ==========================================
  // Firmantes Autorizados (AuthorizedSigner)
  // ==========================================

  async findSigners(tenantId: string) {
    return this.prisma.authorizedSigner.findMany({
      where: { tenantId, isActive: true },
      orderBy: [
        { isDefaultCommercial: 'desc' },
        { isDefaultLegal: 'desc' },
        { fullName: 'asc' },
      ],
    });
  }

  async findSignerById(id: string, tenantId: string) {
    return this.prisma.authorizedSigner.findFirst({
      where: { id, tenantId },
    });
  }

  async findSignerByEmail(email: string, tenantId: string) {
    return this.prisma.authorizedSigner.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });
  }

  async createSigner(data: Prisma.AuthorizedSignerCreateInput) {
    return this.prisma.authorizedSigner.create({ data });
  }

  async updateSigner(id: string, data: Prisma.AuthorizedSignerUpdateInput) {
    return this.prisma.authorizedSigner.update({
      where: { id },
      data,
    });
  }

  async softDeleteSigner(id: string, userId?: string) {
    return this.prisma.authorizedSigner.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: userId,
      },
    });
  }

  // ==========================================
  // Fragmentos de Texto y Cláusulas TipTap
  // ==========================================

  async findSnippets(tenantId: string) {
    return this.prisma.documentTextSnippet.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
  }

  async findSnippetById(id: string, tenantId: string) {
    return this.prisma.documentTextSnippet.findFirst({
      where: { id, tenantId },
    });
  }

  async findSnippetByKey(key: string, tenantId: string) {
    return this.prisma.documentTextSnippet.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
    });
  }

  async createSnippet(data: Prisma.DocumentTextSnippetCreateInput) {
    return this.prisma.documentTextSnippet.create({ data });
  }

  async updateSnippet(id: string, data: Prisma.DocumentTextSnippetUpdateInput) {
    return this.prisma.documentTextSnippet.update({
      where: { id },
      data,
    });
  }

  async deleteSnippet(id: string) {
    return this.prisma.documentTextSnippet.delete({
      where: { id },
    });
  }
}
