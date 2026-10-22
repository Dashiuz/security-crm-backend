import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SignatureAuditService } from './signature-audit.service';
import { SignatureGeneratorService } from './signature-generator.service';
import { SaveUserSignatureDto } from '../dtos/save-user-signature.dto';
import { CreateSignatureRequestDto } from '../dtos/create-signature-request.dto';
import { SubmitPublicSignatureDto } from '../dtos/submit-public-signature.dto';
import { SignatureStatus } from '@prisma/client';

@Injectable()
export class SignatureRequestService {
  private readonly logger = new Logger(SignatureRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SignatureAuditService,
    private readonly generatorService: SignatureGeneratorService,
  ) {}

  // ==========================================================================
  // 1. GESTIÓN DE FIRMA EN PERFIL / CONFIGURACIÓN DE USUARIO
  // ==========================================================================

  async saveUserSignature(
    userId: string,
    tenantId: string,
    dto: SaveUserSignatureDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado en este tenant');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        signatureUrl: dto.signatureDataUrl,
        signatureMethod: dto.method,
        signatureUpdatedAt: new Date(),
      },
      select: {
        id: true,
        fullName: true,
        signatureUrl: true,
        signatureMethod: true,
        signatureUpdatedAt: true,
      },
    });

    // Sincronización opcional con ficha de empleado si existe vinculación por documento
    try {
      await this.prisma.employee.updateMany({
        where: { tenantId, document: user.document },
        data: {
          signatureUrl: dto.signatureDataUrl,
          signatureMethod: dto.method,
          signatureUpdatedAt: new Date(),
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error al sincronizar firma con empleado para documento [${user.document}]: ${errorMessage}`,
      );
    }

    return updatedUser;
  }

  async getUserSignature(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        fullName: true,
        signatureUrl: true,
        signatureMethod: true,
        signatureUpdatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async deleteUserSignature(userId: string, tenantId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        signatureUrl: null,
        signatureMethod: null,
        signatureUpdatedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        signatureUrl: true,
      },
    });
  }

  // ==========================================================================
  // 2. GESTIÓN INTERNA DE SOLICITUDES DE FIRMA ERP (NOXIA SIGN)
  // ==========================================================================

  async createRequest(
    tenantId: string,
    createdById: string,
    dto: CreateSignatureRequestDto,
  ) {
    const ttlDays =
      dto.expiresDays && dto.expiresDays > 0 ? dto.expiresDays : 15;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const token = this.auditService.generateSecureToken();

    // Invalida automáticamente solicitudes previas pendientes para la misma versión del documento
    await this.prisma.signatureRequest.updateMany({
      where: {
        tenantId,
        documentType: dto.documentType,
        documentId: dto.documentId,
        status: {
          in: [
            SignatureStatus.PENDING,
            SignatureStatus.VIEWED,
            SignatureStatus.DRAFT,
          ],
        },
      },
      data: {
        status: SignatureStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    const request = await this.prisma.signatureRequest.create({
      data: {
        tenantId,
        createdById,
        documentType: dto.documentType,
        documentId: dto.documentId,
        documentTitle: dto.documentTitle,
        signerName: dto.signerName,
        signerEmail: dto.signerEmail,
        signerDocument: dto.signerDocument,
        signerPhone: dto.signerPhone,
        signerRole: dto.signerRole,
        draftSnapshot: dto.draftSnapshot || null,
        token,
        expiresAt,
        status: SignatureStatus.PENDING,
        sentAt: new Date(),
      },
      include: {
        tenant: {
          select: { name: true, slug: true },
        },
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const signUrl = `${frontendUrl}/sign/${token}`;

    return {
      ...request,
      signUrl,
    };
  }

  async getRequestById(id: string, tenantId: string) {
    const request = await this.prisma.signatureRequest.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: {
          select: { id: true, fullName: true, department: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de firma no encontrada');
    }

    return request;
  }

  async revokeRequest(id: string, tenantId: string) {
    const request = await this.getRequestById(id, tenantId);

    if (request.status === SignatureStatus.SIGNED) {
      throw new BadRequestException(
        'No es posible revocar un documento que ya ha sido firmado',
      );
    }

    return this.prisma.signatureRequest.update({
      where: { id },
      data: {
        status: SignatureStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  // ==========================================================================
  // 3. PORTAL PÚBLICO CIFRADO (/sign/[token] & /verify/[id])
  // ==========================================================================

  async getPublicRequestByToken(
    token: string,
    clientIp?: string,
    clientUa?: string,
  ) {
    const request = await this.prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            name: true,
            slug: true,
            profile: {
              select: { legalName: true, taxId: true, contactEmail: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Enlace de firma no válido');
    }

    if (request.status === SignatureStatus.REVOKED) {
      throw new ForbiddenException(
        'Este enlace de firma ha sido revocado o sustituido por una nueva versión',
      );
    }

    // Verificar si expiró
    if (
      new Date() > request.expiresAt &&
      request.status !== SignatureStatus.SIGNED
    ) {
      if (request.status !== SignatureStatus.EXPIRED) {
        await this.prisma.signatureRequest.update({
          where: { id: request.id },
          data: { status: SignatureStatus.EXPIRED },
        });
      }
      throw new GoneException(
        'El enlace de firma ha caducado por superar los 15 días de vigencia',
      );
    }

    // Si está en PENDING, registrar primera apertura como VIEWED
    if (request.status === SignatureStatus.PENDING) {
      await this.prisma.signatureRequest.update({
        where: { id: request.id },
        data: {
          status: SignatureStatus.VIEWED,
          viewedAt: new Date(),
          signatureIp: clientIp || request.signatureIp,
          signatureUa: clientUa || request.signatureUa,
        },
      });
      request.status = SignatureStatus.VIEWED;
    }

    return {
      id: request.id,
      documentTitle: request.documentTitle,
      documentType: request.documentType,
      documentVersion: request.documentVersion,
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      signerDocument: request.signerDocument,
      signerRole: request.signerRole,
      status: request.status,
      expiresAt: request.expiresAt,
      draftSnapshot: request.draftSnapshot,
      tenantName: request.tenant.profile?.legalName || request.tenant.name,
      tenantTaxId: request.tenant.profile?.taxId,
      signedAt: request.signedAt,
      signedDocHash: request.signedDocHash,
    };
  }

  async submitPublicSignature(
    token: string,
    dto: SubmitPublicSignatureDto,
    clientIp?: string,
    clientUa?: string,
  ) {
    if (!dto.acceptedTerms) {
      throw new BadRequestException(
        'Es obligatorio aceptar los términos y condiciones de la Ley 527 de 1999',
      );
    }

    const request = await this.prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            name: true,
            profile: { select: { legalName: true, taxId: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de firma no encontrada');
    }

    if (request.status === SignatureStatus.SIGNED) {
      throw new BadRequestException(
        'Este documento ya fue firmado previamente',
      );
    }

    if (request.status === SignatureStatus.REVOKED) {
      throw new ForbiddenException('Este enlace de firma ha sido revocado');
    }

    if (new Date() > request.expiresAt) {
      throw new GoneException('El enlace de firma ha caducado');
    }

    // 1. Extraer el buffer PNG de la firma
    const base64Data = dto.signatureDataUrl.replace(
      /^data:image\/\w+;base64,/,
      '',
    );
    const signaturePngBuffer = Buffer.from(base64Data, 'base64');

    // 2. Generar el PDF base vectorial a partir de datos estructurados
    const lines = [
      `Título: ${request.documentTitle}`,
      `Tipo de Trámite: ${request.documentType}`,
      `ID de Registro ERP: ${request.documentId}`,
      `Destinatario: ${request.signerName} (${request.signerEmail})`,
      `Documento / NIT: ${request.signerDocument || 'No suministrado'}`,
      `Fecha de Creación: ${request.createdAt.toISOString()}`,
    ];

    if (request.draftSnapshot && typeof request.draftSnapshot === 'object') {
      const snap = request.draftSnapshot as Record<string, any>;
      if (snap.total)
        lines.push(
          `Valor Total: $${Number(snap.total).toLocaleString('es-CO')}`,
        );
      if (snap.notes) lines.push(`Observaciones: ${snap.notes}`);
    }

    const basePdfBuffer = await this.generatorService.generateVectorDocument(
      request.documentTitle,
      lines,
    );

    // 3. Estampar la firma y generar Hoja de Evidencias con QR
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify/${request.id}`;

    const { signedPdfBuffer, originalDocHash, signedDocHash } =
      await this.generatorService.stampSignatureAndAudit({
        basePdfBuffer,
        signaturePngBuffer,
        signerName: request.signerName,
        signerEmail: request.signerEmail,
        signerDocument: request.signerDocument || undefined,
        signerRole: request.signerRole || undefined,
        signerIp: clientIp,
        signerUa: clientUa,
        verifyUrl,
        tenantName: request.tenant.profile?.legalName || request.tenant.name,
        tenantNit: request.tenant.profile?.taxId,
        documentTitle: request.documentTitle,
      });

    // 4. Actualizar el registro en base de datos como SIGNED inmutable
    const updatedRequest = await this.prisma.signatureRequest.update({
      where: { id: request.id },
      data: {
        status: SignatureStatus.SIGNED,
        signedAt: new Date(),
        signatureMethod: dto.method,
        signatureImage: dto.signatureDataUrl,
        originalDocHash,
        signedDocHash,
        signatureIp: clientIp,
        signatureUa: clientUa,
      },
    });

    return {
      success: true,
      id: updatedRequest.id,
      status: updatedRequest.status,
      signedAt: updatedRequest.signedAt,
      signedDocHash,
      verifyUrl,
      pdfBase64: signedPdfBuffer.toString('base64'),
    };
  }

  async verifyPublicDocument(id: string) {
    const request = await this.prisma.signatureRequest.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            name: true,
            profile: { select: { legalName: true, taxId: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Documento no encontrado o código de verificación no registrado',
      );
    }

    return {
      id: request.id,
      documentTitle: request.documentTitle,
      documentType: request.documentType,
      status: request.status,
      signerName: request.signerName,
      signerDocument: request.signerDocument,
      signerRole: request.signerRole,
      signedAt: request.signedAt,
      originalDocHash: request.originalDocHash,
      signedDocHash: request.signedDocHash,
      tenantName: request.tenant.profile?.legalName || request.tenant.name,
      tenantNit: request.tenant.profile?.taxId,
      isAuthentic:
        request.status === SignatureStatus.SIGNED &&
        Boolean(request.signedDocHash),
    };
  }
}
