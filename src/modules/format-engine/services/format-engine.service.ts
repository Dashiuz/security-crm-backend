import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserContext } from '../../../common/interfaces/user-context.interface';

import {
  CreateFormatDto,
  UpdateFormatDto,
  CreateVariableDto,
  UpdateVariableDto,
  RenderFormatDto,
} from '../dtos';
import { DocumentParserService, ParseResult } from './document-parser.service';
import { SystemCatalogService } from './system-catalog.service';
import {
  FormatInterpolationService,
  InterpolationResult,
} from './format-interpolation.service';
import {
  FormatCategory,
  FormatVisibilityScope,
  VariableSourceType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class FormatEngineService {
  private readonly logger = new Logger(FormatEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: DocumentParserService,
    private readonly catalogService: SystemCatalogService,
    private readonly interpolatorService: FormatInterpolationService,
  ) {}

  private hasAdminRole(user: UserContext): boolean {
    return !!(user.roles?.includes('GODLIKE') || user.roles?.includes('ADMIN'));
  }

  // ==========================================
  // FORMATOS UNIVERSALES (CRUD)
  // ==========================================

  async getFormats(
    user: UserContext,
    filters?: {
      category?: FormatCategory;
      scope?: FormatVisibilityScope;
      search?: string;
    },
  ) {
    try {
      const where: Prisma.UniversalDocumentFormatWhereInput = {
        tenantId: user.tenantId,
        isActive: true,
      };

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.scope) {
        if (filters.scope === FormatVisibilityScope.PERSONAL) {
          where.scope = FormatVisibilityScope.PERSONAL;
          where.userId = user.sub;
        } else {
          where.scope = FormatVisibilityScope.GLOBAL;
        }
      } else {
        // Por defecto: Globales de la empresa O Personales del usuario activo
        where.OR = [
          { scope: FormatVisibilityScope.GLOBAL },
          { scope: FormatVisibilityScope.PERSONAL, userId: user.sub },
        ];
      }

      if (filters?.search) {
        where.AND = [
          {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { code: { contains: filters.search, mode: 'insensitive' } },
              {
                description: { contains: filters.search, mode: 'insensitive' },
              },
            ],
          },
        ];
      }

      return await this.prisma.universalDocumentFormat.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { title: 'asc' }],
        include: {
          user: {
            select: { id: true, fullName: true, document: true },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error listando formatos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFormatById(id: string, user: UserContext) {
    const format = await this.prisma.universalDocumentFormat.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isActive: true,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    if (!format) {
      throw new NotFoundException(`Formato con ID ${id} no encontrado.`);
    }

    // Si es personal, solo el creador o un rol administrativo puede consultarlo
    if (
      format.scope === FormatVisibilityScope.PERSONAL &&
      format.userId &&
      format.userId !== user.sub &&
      !this.hasAdminRole(user)
    ) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este formato personal.',
      );
    }

    return format;
  }

  async getNextFormatCode(
    category: FormatCategory,
    user: UserContext,
  ): Promise<{ code: string }> {
    const prefixMap: Record<FormatCategory, string> = {
      [FormatCategory.COMMERCIAL]: 'FOR-COM-',
      [FormatCategory.OPERATIONS]: 'FOR-OPE-',
      [FormatCategory.HUMAN_RESOURCES]: 'FOR-TH-',
      [FormatCategory.QUALITY_HSEQ]: 'FOR-CAL-',
      [FormatCategory.LEGAL]: 'FOR-JUR-',
      [FormatCategory.GENERAL]: 'FOR-GEN-',
    };

    const prefix = prefixMap[category] || 'FOR-GEN-';

    const existingFormats = await this.prisma.universalDocumentFormat.findMany({
      where: {
        tenantId: user.tenantId,
        code: { startsWith: prefix },
      },
      select: { code: true },
    });

    let maxNumber = 0;
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');

    for (const fmt of existingFormats) {
      const match = fmt.code.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    const nextCode = `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;
    return { code: nextCode };
  }

  async createFormat(dto: CreateFormatDto, user: UserContext) {
    try {
      const isPersonal = dto.scope === FormatVisibilityScope.PERSONAL;

      // Extracción automática de variables si no vienen provistas
      const detectedVariables =
        dto.detectedVariables && dto.detectedVariables.length > 0
          ? dto.detectedVariables
          : this.parserService.extractVariables(dto.bodyTemplate);

      return await this.prisma.universalDocumentFormat.create({
        data: {
          tenantId: user.tenantId,
          code: dto.code.trim().toUpperCase(),
          title: dto.title.trim(),
          description: dto.description?.trim(),
          category: dto.category || FormatCategory.GENERAL,
          scope: dto.scope || FormatVisibilityScope.PERSONAL,
          userId: isPersonal ? user.sub : null,
          isDefault: dto.isDefault ?? false,
          bodyTemplate: dto.bodyTemplate,
          sectionsConfig: (dto.sectionsConfig as Prisma.InputJsonValue) ?? {},
          detectedVariables: (detectedVariables as Prisma.InputJsonValue) ?? [],
          createdById: user.sub,
        },
      });
    } catch (error: any) {
      this.logger.error(`Error creando formato: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateFormat(id: string, dto: UpdateFormatDto, user: UserContext) {
    const existing = await this.getFormatById(id, user);

    if (
      existing.scope === FormatVisibilityScope.PERSONAL &&
      existing.userId !== user.sub &&
      !this.hasAdminRole(user)
    ) {
      throw new ForbiddenException(
        'Solo el propietario puede editar este formato personal.',
      );
    }

    try {
      const updateData: Prisma.UniversalDocumentFormatUpdateInput = {
        updatedById: user.sub,
      };

      if (dto.code !== undefined)
        updateData.code = dto.code.trim().toUpperCase();
      if (dto.title !== undefined) updateData.title = dto.title.trim();
      if (dto.description !== undefined)
        updateData.description = dto.description?.trim();
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.scope !== undefined) updateData.scope = dto.scope;
      if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      if (dto.bodyTemplate !== undefined) {
        updateData.bodyTemplate = dto.bodyTemplate;
        const detected =
          dto.detectedVariables && dto.detectedVariables.length > 0
            ? dto.detectedVariables
            : this.parserService.extractVariables(dto.bodyTemplate);
        updateData.detectedVariables = detected as Prisma.InputJsonValue;
      }

      if (dto.sectionsConfig !== undefined) {
        updateData.sectionsConfig = dto.sectionsConfig as Prisma.InputJsonValue;
      }

      return await this.prisma.universalDocumentFormat.update({
        where: { id },
        data: updateData,
      });
    } catch (error: any) {
      this.logger.error(
        `Error actualizando formato ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteFormat(id: string, user: UserContext) {
    const existing = await this.getFormatById(id, user);

    if (
      existing.scope === FormatVisibilityScope.PERSONAL &&
      existing.userId !== user.sub &&
      !this.hasAdminRole(user)
    ) {
      throw new ForbiddenException(
        'Solo el propietario puede eliminar este formato personal.',
      );
    }

    try {
      return await this.prisma.universalDocumentFormat.update({
        where: { id },
        data: { isActive: false, updatedById: user.sub },
      });
    } catch (error: any) {
      this.logger.error(
        `Error eliminando formato ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // VARIABLES DINÁMICAS Y ATAJOS (CRUD)
  // ==========================================

  async getVariables(user: UserContext, search?: string) {
    try {
      const where: Prisma.FormatVariableWhereInput = {
        tenantId: user.tenantId,
        isActive: true,
        OR: [
          { scope: FormatVisibilityScope.GLOBAL },
          { scope: FormatVisibilityScope.PERSONAL, userId: user.sub },
        ],
      };

      if (search) {
        where.AND = [
          {
            OR: [
              { key: { contains: search, mode: 'insensitive' } },
              { label: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      return await this.prisma.formatVariable.findMany({
        where,
        orderBy: [{ scope: 'asc' }, { key: 'asc' }],
      });
    } catch (error: any) {
      this.logger.error(
        `Error listando variables: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createVariable(dto: CreateVariableDto, user: UserContext) {
    const normalizedKey = dto.key
      .trim()
      .toUpperCase()
      .replace(/[\s.-]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');

    const isPersonal = dto.scope === FormatVisibilityScope.PERSONAL;
    const targetUserId = isPersonal ? user.sub : null;

    // Verificar si ya existe
    const existing = await this.prisma.formatVariable.findFirst({
      where: {
        tenantId: user.tenantId,
        userId: targetUserId,
        key: normalizedKey,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una variable con la clave '{{${normalizedKey}}}' para este ámbito.`,
      );
    }

    try {
      return await this.prisma.formatVariable.create({
        data: {
          tenantId: user.tenantId,
          scope: dto.scope || FormatVisibilityScope.PERSONAL,
          userId: targetUserId,
          key: normalizedKey,
          label: dto.label.trim(),
          category: dto.category?.trim() || 'GENERAL',
          sourceType: dto.sourceType || VariableSourceType.STATIC_TEXT,
          staticValue: dto.staticValue,
          systemPath: dto.systemPath,
          createdById: user.sub,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error creando variable: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateVariable(id: string, dto: UpdateVariableDto, user: UserContext) {
    const existing = await this.prisma.formatVariable.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Variable con ID ${id} no encontrada.`);
    }

    if (
      existing.scope === FormatVisibilityScope.PERSONAL &&
      existing.userId !== user.sub &&
      !this.hasAdminRole(user)
    ) {
      throw new ForbiddenException(
        'Solo el propietario puede editar esta variable personal.',
      );
    }

    try {
      const updateData: Prisma.FormatVariableUpdateInput = {
        updatedById: user.sub,
      };

      if (dto.label !== undefined) updateData.label = dto.label.trim();
      if (dto.category !== undefined)
        updateData.category = dto.category?.trim();
      if (dto.sourceType !== undefined) updateData.sourceType = dto.sourceType;
      if (dto.staticValue !== undefined)
        updateData.staticValue = dto.staticValue;
      if (dto.systemPath !== undefined) updateData.systemPath = dto.systemPath;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.prisma.formatVariable.update({
        where: { id },
        data: updateData,
      });
    } catch (error: any) {
      this.logger.error(
        `Error actualizando variable ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteVariable(id: string, user: UserContext) {
    const existing = await this.prisma.formatVariable.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Variable con ID ${id} no encontrada.`);
    }

    if (
      existing.scope === FormatVisibilityScope.PERSONAL &&
      existing.userId !== user.sub &&
      !this.hasAdminRole(user)
    ) {
      throw new ForbiddenException(
        'Solo el propietario puede eliminar esta variable personal.',
      );
    }

    try {
      return await this.prisma.formatVariable.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(
        `Error eliminando variable ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // PARSE & DROP (MEMORIA PURA - ZERO S3)
  // ==========================================

  async parseUploadedFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType?: string,
  ): Promise<ParseResult> {
    return this.parserService.parseFileBuffer(fileBuffer, fileName, mimeType);
  }

  // ==========================================
  // CATÁLOGO DE CAMPOS DEL SISTEMA
  // ==========================================

  getSystemCatalog() {
    return this.catalogService.getSystemCatalog();
  }

  // ==========================================
  // RENDERIZADO E INTERPOLACIÓN UNIVERSAL
  // ==========================================

  async renderFormat(
    formatId: string | null,
    dto: RenderFormatDto,
    user: UserContext,
  ): Promise<InterpolationResult> {
    let templateHtml = dto.customTemplateHtml;

    if (!templateHtml && formatId) {
      const format = await this.getFormatById(formatId, user);
      templateHtml = format.bodyTemplate;
    }

    if (!templateHtml) {
      return {
        interpolatedContent: '',
        substitutedVariables: [],
        missingVariables: [],
      };
    }

    // 1. Resuelve variables automáticas de BD
    const contextValues = await this.catalogService.resolveContextValues(
      user.tenantId,
      {
        clientId: dto.entityType === 'CLIENT' ? dto.entityId : undefined,
        employeeId: dto.entityType === 'EMPLOYEE' ? dto.entityId : undefined,
        proposalId: dto.entityType === 'PROPOSAL' ? dto.entityId : undefined,
      },
    );

    // 2. Resuelve variables fijas del usuario configuradas en FormatVariable
    const userVariables = await this.prisma.formatVariable.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        sourceType: VariableSourceType.STATIC_TEXT,
        OR: [
          { scope: FormatVisibilityScope.GLOBAL },
          { scope: FormatVisibilityScope.PERSONAL, userId: user.sub },
        ],
      },
    });

    for (const v of userVariables) {
      if (v.staticValue) {
        contextValues[v.key.toLowerCase()] = v.staticValue;
        contextValues[v.key] = v.staticValue;
      }
    }

    // 3. Fusiona con variables ad-hoc proporcionadas en el payload
    if (dto.additionalVariables) {
      Object.assign(contextValues, dto.additionalVariables);
    }

    // 4. Ejecuta la interpolación
    return this.interpolatorService.interpolate(templateHtml, contextValues);
  }
}
