import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RequestContextService } from '../../../../common/context/request-context.service';
import { UniversalCodesRepository } from '../repositories/universal-codes.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateUniversalCodeDto,
  CreateBatchUniversalCodesDto,
  UpdateUniversalCodeDto,
  BatchUpdateUniversalCodesDto,
  QueryUniversalCodesDto,
  UniversalCodeResponseDto,
} from '../dtos/universal-code.dto';
import { CodeType, UniversalCode, Prisma } from '@prisma/client';

@Injectable()
export class UniversalCodesService {
  private readonly logger = new Logger(UniversalCodesService.name);

  constructor(
    private readonly repository: UniversalCodesRepository,
    private readonly prisma: PrismaService,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * Genera un código canónico inmutable con prefijo institucional LORO
   */
  generateCanonicalCode(codeType: CodeType): string {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timestampPart = Date.now().toString(36).toUpperCase();

    if (codeType === CodeType.BARCODE_EAN13) {
      // EAN-13: 12 dígitos base + dígito verificador módulo 10
      const base12 = `770${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(base12.charAt(i), 10);
        sum += i % 2 === 0 ? digit : digit * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return `${base12}${checkDigit}`;
    }

    if (codeType === CodeType.BARCODE_128) {
      return `LORO-BAR-${timestampPart}-${randomSuffix}`;
    }

    return `LORO-QR-${timestampPart}-${randomSuffix}`;
  }

  /**
   * Registra y emite un nuevo código universal en base de datos
   */
  async create(
    dto: CreateUniversalCodeDto,
    user?: { sub?: string; tenantId?: string },
  ): Promise<UniversalCodeResponseDto> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      const userId = user?.sub || this.contextService.userId;

      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      if (dto.clientId) {
        const client = await this.prisma.client.findFirst({
          where: { id: dto.clientId, tenantId },
          select: { id: true },
        });
        if (!client) {
          throw new NotFoundException(
            `Cliente con ID ${dto.clientId} no encontrado para este tenant.`,
          );
        }
      }

      const code =
        dto.code && dto.code.trim() !== ''
          ? dto.code.trim().toUpperCase()
          : this.generateCanonicalCode(dto.codeType);

      // Verificar colisión
      const existing = await this.repository.findByCode(tenantId, code);
      if (existing) {
        throw new ConflictException(
          `El código ${code} ya existe registrado en este tenant.`,
        );
      }

      const created = await this.repository.create({
        tenantId,
        code,
        codeType: dto.codeType,
        purpose: dto.purpose,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        department: dto.department?.trim() || null,
        clientId: dto.clientId || null,
        batchId: dto.batchId?.trim() || null,
        metadata: dto.metadata || {},
        createdById: userId || null,
      });

      return this.mapToResponse(created);
    } catch (error: any) {
      this.logger.error(
        `Error creando UniversalCode: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Genera masivamente un lote de N códigos universales agrupados bajo un batchId
   */
  async createBatch(
    dto: CreateBatchUniversalCodesDto,
    user?: { sub?: string; tenantId?: string },
  ): Promise<UniversalCodeResponseDto[]> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      const userId = user?.sub || this.contextService.userId;

      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      if (dto.clientId) {
        const client = await this.prisma.client.findFirst({
          where: { id: dto.clientId, tenantId },
          select: { id: true },
        });
        if (!client) {
          throw new NotFoundException(
            `Cliente con ID ${dto.clientId} no encontrado para este tenant.`,
          );
        }
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const batchId =
        dto.batchId && dto.batchId.trim() !== ''
          ? dto.batchId.trim().toUpperCase()
          : `LOTE-${dateStr}-${randomSuffix}`;

      const items: Prisma.UniversalCodeUncheckedCreateInput[] = [];
      const padLength = dto.quantity > 9 ? 2 : 1;

      for (let i = 0; i < dto.quantity; i++) {
        const seqNumber = String(i + 1).padStart(padLength, '0');
        const code = this.generateCanonicalCode(dto.codeType);
        const title = `${dto.titlePattern.trim()} #${seqNumber}`;
        const metadata = {
          ...(dto.baseMetadata || {}),
          batchIndex: i + 1,
          batchTotal: dto.quantity,
          assignedDepartment: dto.department?.trim() || undefined,
        };

        items.push({
          tenantId,
          code,
          codeType: dto.codeType,
          purpose: dto.purpose,
          title,
          description: null,
          department: dto.department?.trim() || null,
          clientId: dto.clientId || null,
          batchId,
          metadata,
          createdById: userId || null,
        });
      }

      const created = await this.repository.createBatch(items);
      return created.map((item) => this.mapToResponse(item));
    } catch (error: any) {
      this.logger.error(
        `Error creando lote de UniversalCodes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza masivamente los ítems de un lote (seriales, títulos, estados)
   */
  async batchUpdate(
    dto: BatchUpdateUniversalCodesDto,
    user?: { tenantId?: string },
  ): Promise<UniversalCodeResponseDto[]> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      const updates = dto.items.map((item) => ({
        id: item.id,
        data: {
          ...(item.title !== undefined ? { title: item.title.trim() } : {}),
          ...(item.department !== undefined
            ? { department: item.department?.trim() || null }
            : {}),
          ...(item.status !== undefined ? { status: item.status } : {}),
          ...(item.metadata !== undefined ? { metadata: item.metadata } : {}),
        },
      }));

      const updated = await this.repository.batchUpdate(tenantId, updates);
      return updated.map((item) => this.mapToResponse(item));
    } catch (error: any) {
      this.logger.error(
        `Error actualizando lote de UniversalCodes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lista los lotes generados con sus metadatos y conteo
   */
  async listBatches(user?: { tenantId?: string }): Promise<
    Array<{
      batchId: string;
      count: number;
      purpose: string;
      codeType: string;
      department: string | null;
      createdAt: Date;
    }>
  > {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      return await this.repository.findBatches(tenantId);
    } catch (error: any) {
      this.logger.error(
        `Error listando lotes de UniversalCodes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene estadísticas agregadas y KPIs consolidados de códigos para el Hub
   */
  async getStats(user?: { tenantId?: string }): Promise<{
    total: number;
    active: number;
    inactive: number;
    batchesCount: number;
  }> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      return await this.repository.getStats(tenantId);
    } catch (error: any) {
      this.logger.error(
        `Error obteniendo estadísticas de UniversalCodes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lista códigos universales con filtros y paginación
   */
  async findAll(
    query: QueryUniversalCodesDto,
    user?: { tenantId?: string },
  ): Promise<{
    data: UniversalCodeResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      const page = query.page && query.page > 0 ? Number(query.page) : 1;
      const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
      const skip = (page - 1) * limit;

      const params = {
        search: query.search,
        codeType: query.codeType,
        purpose: query.purpose,
        status: query.status,
        clientId: query.clientId,
        batchId: query.batchId,
        skip,
        take: limit,
      };

      const [items, total] = await Promise.all([
        this.repository.findAll(tenantId, params),
        this.repository.count(tenantId, params),
      ]);

      return {
        data: items.map((item) => this.mapToResponse(item)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    } catch (error: any) {
      this.logger.error(
        `Error listando UniversalCodes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene el detalle de un código universal por ID
   */
  async findById(
    id: string,
    user?: { tenantId?: string },
  ): Promise<UniversalCodeResponseDto> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      const item = await this.repository.findById(tenantId, id);
      if (!item) {
        throw new NotFoundException(
          `Código universal con ID ${id} no encontrado.`,
        );
      }

      return this.mapToResponse(item);
    } catch (error: any) {
      this.logger.error(
        `Error buscando UniversalCode por ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Resuelve un código escaneado (pistola lectora o cámara web)
   */
  async resolveCode(
    code: string,
    user?: { tenantId?: string },
  ): Promise<UniversalCodeResponseDto> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      const cleanCode = code.trim().toUpperCase();

      let item: UniversalCode | null = null;
      if (tenantId) {
        item = await this.repository.findByCode(tenantId, cleanCode);
      } else {
        item = await this.repository.findByCodePublic(cleanCode);
      }

      if (!item) {
        throw new NotFoundException(
          `El código escaneado '${cleanCode}' no se encuentra registrado en el sistema.`,
        );
      }

      return this.mapToResponse(item);
    } catch (error: any) {
      this.logger.error(
        `Error resolviendo código '${code}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Modifica propiedades o estado de un código
   */
  async update(
    id: string,
    dto: UpdateUniversalCodeDto,
    user?: { tenantId?: string },
  ): Promise<UniversalCodeResponseDto> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      const existing = await this.repository.findById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(
          `Código universal con ID ${id} no encontrado.`,
        );
      }

      if (dto.clientId) {
        const client = await this.prisma.client.findFirst({
          where: { id: dto.clientId, tenantId },
          select: { id: true },
        });
        if (!client) {
          throw new NotFoundException(
            `Cliente con ID ${dto.clientId} no encontrado para este tenant.`,
          );
        }
      }

      const updated = await this.repository.update(tenantId, id, {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.department !== undefined
          ? { department: dto.department?.trim() || null }
          : {}),
        ...(dto.clientId !== undefined
          ? { clientId: dto.clientId || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
      });

      return this.mapToResponse(updated);
    } catch (error: any) {
      this.logger.error(
        `Error actualizando UniversalCode ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Elimina un código (soft delete)
   */
  async remove(
    id: string,
    user?: { tenantId?: string },
  ): Promise<{ message: string; id: string }> {
    try {
      const tenantId = user?.tenantId || this.contextService.tenantId;
      if (!tenantId) {
        throw new BadRequestException(
          'Contexto de empresa (tenantId) no identificado.',
        );
      }

      const existing = await this.repository.findById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(
          `Código universal con ID ${id} no encontrado.`,
        );
      }

      await this.repository.softDelete(tenantId, id);
      return { message: 'Código universal eliminado correctamente.', id };
    } catch (error: any) {
      this.logger.error(
        `Error eliminando UniversalCode ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private mapToResponse(entity: any): UniversalCodeResponseDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      code: entity.code,
      codeType: entity.codeType,
      purpose: entity.purpose,
      title: entity.title,
      description: entity.description,
      department: entity.department,
      clientId: entity.clientId,
      batchId: entity.batchId || null,
      status: entity.status,
      metadata: entity.metadata,
      createdById: entity.createdById,
      createdBy: entity.createdBy
        ? {
            id: entity.createdBy.id,
            fullName: entity.createdBy.fullName,
            document: entity.createdBy.document,
          }
        : null,
      updatedById: entity.updatedById,
      updatedBy: entity.updatedBy
        ? {
            id: entity.updatedBy.id,
            fullName: entity.updatedBy.fullName,
            document: entity.updatedBy.document,
          }
        : null,
      client: entity.client
        ? {
            id: entity.client.id,
            name: entity.client.name,
            internalCode: entity.client.internalCode,
          }
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
