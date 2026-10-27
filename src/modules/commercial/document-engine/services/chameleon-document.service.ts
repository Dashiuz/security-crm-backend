import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DocumentEngineRepository } from '../../repositories/document-engine.repository';
import { CommercialSettingsRepository } from '../../repositories/commercial-settings.repository';
import { AssetOptimizationService } from './asset-optimization.service';
import { SnippetInterpolationService } from './snippet-interpolation.service';
import { S3Service } from '../../../storage/services/s3.service';
import { MediaTypeCategory } from '../../../storage/dtos/upload-media.dto';
import {
  UpdateTenantDocumentSkinDto,
  CreateAuthorizedSignerDto,
  UpdateAuthorizedSignerDto,
  CreateSnippetDto,
  UpdateSnippetDto,
  InterpolateSnippetDto,
} from '../dtos';
import { UserContext } from '../../../../common/interfaces/user-context.interface';

@Injectable()
export class ChameleonDocumentService {
  private readonly logger = new Logger(ChameleonDocumentService.name);

  constructor(
    private readonly docEngineRepo: DocumentEngineRepository,
    private readonly commercialSettingsRepo: CommercialSettingsRepository,
    private readonly assetOptimizationService: AssetOptimizationService,
    private readonly snippetInterpolationService: SnippetInterpolationService,
    private readonly s3Service: S3Service,
  ) {}

  // ==========================================
  // 1. Identidad de Marca y Piel de Documento (Skin)
  // ==========================================

  async getSkin(user: UserContext) {
    let skin = await this.docEngineRepo.findSkinByTenantId(user.tenantId);

    if (!skin) {
      // Si no existe, inicializamos con los valores de la configuración comercial
      const settings = await this.commercialSettingsRepo.findByTenantId(
        user.tenantId,
      );
      if (!settings) {
        throw new NotFoundException(
          'Configuración comercial no encontrada para este tenant.',
        );
      }

      skin = await this.docEngineRepo.upsertSkin(
        user.tenantId,
        settings.id,
        {
          companyLegalName: 'EMPRESA DE SEGURIDAD PRIVADA',
          companyNit: '900.000.000-1',
          primaryBrandColorHex: '#1E1B4B',
          accentBrandColorHex: '#7C3AED',
          secondaryColorHex: '#F59E0B',
          neutralDarkHex: '#0F172A',
          neutralLightHex: '#F8FAFC',
          headerLayout: 'CLASSIC_MEMBRETE',
        },
        user.sub,
      );
    }

    if (!skin) {
      throw new NotFoundException(
        'No se pudo obtener la configuración de marca del documento.',
      );
    }

    return skin;
  }

  async updateSkin(dto: UpdateTenantDocumentSkinDto, user: UserContext) {
    const skin = await this.getSkin(user);

    return this.docEngineRepo.upsertSkin(
      user.tenantId,
      skin.commercialSettingsId || '',
      {
        ...dto,
        supervigilanciaLicDate: dto.supervigilanciaLicDate
          ? new Date(dto.supervigilanciaLicDate)
          : undefined,
        supervigilanciaLicExpiry: dto.supervigilanciaLicExpiry
          ? new Date(dto.supervigilanciaLicExpiry)
          : undefined,
      },
      user.sub,
    );
  }

  async uploadLogo(file: Express.Multer.File, user: UserContext) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Se requiere un archivo de imagen para el logotipo.',
      );
    }

    const skin = await this.getSkin(user);

    // 1. Optimizar con sharp a WebP < 25KB
    const processed = await this.assetOptimizationService.processLogo(
      file.buffer,
    );

    // 2. Generar S3 key canónica
    const s3Key = this.s3Service.generateS3Key({
      tenantId: user.tenantId,
      entityType: MediaTypeCategory.BRAND_LOGO,
      entityId: skin.id,
      fileName: `logo.${processed.extension}`,
    });

    // 3. Subir a S3
    const uploadResult = await this.s3Service.uploadBuffer(
      processed.buffer,
      s3Key,
      processed.mimeType,
    );

    // 4. Actualizar skin en base de datos
    await this.docEngineRepo.updateSkinLogo(
      skin.id,
      uploadResult.s3Key,
      user.sub,
    );

    return {
      message: 'Logotipo optimizado y actualizado exitosamente',
      s3Key: uploadResult.s3Key,
      url: uploadResult.url,
      dimensions: { width: processed.width, height: processed.height },
      sizeBytes: processed.sizeBytes,
    };
  }

  // ==========================================
  // 2. Firmantes Autorizados (AuthorizedSigners)
  // ==========================================

  async getSigners(user: UserContext) {
    return this.docEngineRepo.findSigners(user.tenantId);
  }

  async getSystemUsersAsSigners(user: UserContext) {
    const users = await this.docEngineRepo.findSystemUsersForSigners(
      user.tenantId,
    );
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      document: u.document,
      corporateTitle: u.position || u.department || 'Funcionario',
      hasSignature: !!u.signatureUrl,
      signatureUrl: u.signatureUrl,
      signatureMethod: u.signatureMethod,
    }));
  }

  async getSignerById(id: string, user: UserContext) {
    const signer = await this.docEngineRepo.findSignerById(id, user.tenantId);
    if (!signer) {
      throw new NotFoundException(`Firmante con ID ${id} no encontrado.`);
    }
    return signer;
  }

  async createSigner(dto: CreateAuthorizedSignerDto, user: UserContext) {
    const skin = await this.getSkin(user);

    const existing = await this.docEngineRepo.findSignerByEmail(
      dto.email,
      user.tenantId,
    );
    if (existing) {
      throw new ConflictException(
        `Ya existe un firmante autorizado con el correo ${dto.email} en esta organización.`,
      );
    }

    let signatureImageS3Key: string | undefined;

    // Si viene firma en base64 en la creación, procesar y optimizar con sharp
    if (dto.signatureDataUrl) {
      const base64Data = dto.signatureDataUrl.replace(
        /^data:image\/\w+;base64,/,
        '',
      );
      const rawBuffer = Buffer.from(base64Data, 'base64');
      const processed =
        await this.assetOptimizationService.processSignature(rawBuffer);

      const s3Key = this.s3Service.generateS3Key({
        tenantId: user.tenantId,
        entityType: MediaTypeCategory.SIGNER_SIGNATURE,
        entityId: dto.idNumber || 'sig',
        fileName: `sig.${processed.extension}`,
      });

      const uploaded = await this.s3Service.uploadBuffer(
        processed.buffer,
        s3Key,
        processed.mimeType,
      );
      signatureImageS3Key = uploaded.s3Key;
    }

    return this.docEngineRepo.createSigner({
      tenant: { connect: { id: user.tenantId } },
      documentSkin: { connect: { id: skin.id } },
      fullName: dto.fullName,
      idNumber: dto.idNumber,
      corporateTitle: dto.corporateTitle,
      email: dto.email,
      phone: dto.phone,
      roleScope: dto.roleScope,
      signatureImageS3Key,
      signatureUrl: dto.signatureDataUrl,
      isDefaultCommercial: dto.isDefaultCommercial ?? false,
      isDefaultLegal: dto.isDefaultLegal ?? false,
      createdById: user.sub,
      updatedById: user.sub,
    });
  }

  async updateSigner(
    id: string,
    dto: UpdateAuthorizedSignerDto,
    user: UserContext,
  ) {
    await this.getSignerById(id, user);

    let signatureImageS3Key: string | undefined;

    if (dto.signatureDataUrl) {
      const base64Data = dto.signatureDataUrl.replace(
        /^data:image\/\w+;base64,/,
        '',
      );
      const rawBuffer = Buffer.from(base64Data, 'base64');
      const processed =
        await this.assetOptimizationService.processSignature(rawBuffer);

      const s3Key = this.s3Service.generateS3Key({
        tenantId: user.tenantId,
        entityType: MediaTypeCategory.SIGNER_SIGNATURE,
        entityId: id,
        fileName: `sig.${processed.extension}`,
      });

      const uploaded = await this.s3Service.uploadBuffer(
        processed.buffer,
        s3Key,
        processed.mimeType,
      );
      signatureImageS3Key = uploaded.s3Key;
    }

    return this.docEngineRepo.updateSigner(id, {
      ...dto,
      signatureImageS3Key: signatureImageS3Key ?? undefined,
      signatureUrl: dto.signatureDataUrl ?? undefined,
      updatedById: user.sub,
    });
  }

  async uploadSignerSignature(
    id: string,
    file: Express.Multer.File,
    user: UserContext,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Se requiere el archivo de imagen de la firma.',
      );
    }

    const signer = await this.getSignerById(id, user);

    // 1. Optimizar con sharp: trim de márgenes transparentes + compresión PNG < 18KB
    const processed = await this.assetOptimizationService.processSignature(
      file.buffer,
    );

    // 2. Generar S3 key canónica
    const s3Key = this.s3Service.generateS3Key({
      tenantId: user.tenantId,
      entityType: MediaTypeCategory.SIGNER_SIGNATURE,
      entityId: signer.id,
      fileName: `sig.${processed.extension}`,
    });

    // 3. Subir a S3
    const uploadResult = await this.s3Service.uploadBuffer(
      processed.buffer,
      s3Key,
      processed.mimeType,
    );

    // 4. Actualizar firmante
    const updated = await this.docEngineRepo.updateSigner(signer.id, {
      signatureImageS3Key: uploadResult.s3Key,
      signatureUrl: uploadResult.url,
      updatedById: user.sub,
    });

    return {
      message: 'Firma digitalizada optimizada y cargada exitosamente',
      s3Key: uploadResult.s3Key,
      url: uploadResult.url,
      sizeBytes: processed.sizeBytes,
      signer: updated,
    };
  }

  async deleteSigner(id: string, user: UserContext) {
    await this.getSignerById(id, user);
    await this.docEngineRepo.softDeleteSigner(id, user.sub);
    return {
      success: true,
      message: 'Firmante inhabilitado exitosamente.',
    };
  }

  // ==========================================
  // 3. Fragmentos de Texto y Cláusulas TipTap
  // ==========================================

  async getSnippets(user: UserContext) {
    return this.docEngineRepo.findSnippets(user.tenantId);
  }

  async getSnippetById(id: string, user: UserContext) {
    const snippet = await this.docEngineRepo.findSnippetById(id, user.tenantId);
    if (!snippet) {
      throw new NotFoundException(`Cláusula con ID ${id} no encontrada.`);
    }
    return snippet;
  }

  async createSnippet(dto: CreateSnippetDto, user: UserContext) {
    const skin = await this.getSkin(user);

    const existing = await this.docEngineRepo.findSnippetByKey(
      dto.key,
      user.tenantId,
    );
    if (existing) {
      throw new ConflictException(
        `Ya existe un fragmento de texto con la clave [${dto.key}].`,
      );
    }

    // Si no se pasaron availableVariables, extraer automáticamente de bodyTemplate
    const variables =
      dto.availableVariables && dto.availableVariables.length > 0
        ? dto.availableVariables
        : this.snippetInterpolationService.extractVariables(dto.bodyTemplate);

    return this.docEngineRepo.createSnippet({
      tenant: { connect: { id: user.tenantId } },
      commercialSettings: { connect: { id: skin.commercialSettingsId || '' } },
      documentSkin: { connect: { id: skin.id } },
      key: dto.key,
      title: dto.title,
      bodyTemplate: dto.bodyTemplate,
      category: dto.category,
      availableVariables: variables,
      isDefault: dto.isDefault ?? false,
      createdById: user.sub,
      updatedById: user.sub,
    });
  }

  async updateSnippet(id: string, dto: UpdateSnippetDto, user: UserContext) {
    const snippet = await this.getSnippetById(id, user);

    let variables = dto.availableVariables;
    if (dto.bodyTemplate && (!variables || variables.length === 0)) {
      variables = this.snippetInterpolationService.extractVariables(
        dto.bodyTemplate,
      );
    }

    return this.docEngineRepo.updateSnippet(snippet.id, {
      ...dto,
      availableVariables: variables ?? undefined,
      updatedById: user.sub,
    });
  }

  async deleteSnippet(id: string, user: UserContext) {
    const snippet = await this.getSnippetById(id, user);

    if (snippet.isDefault) {
      throw new BadRequestException(
        'No es posible eliminar una cláusula o carta marcada como predeterminada.',
      );
    }

    await this.docEngineRepo.deleteSnippet(snippet.id);
    return {
      success: true,
      message: 'Cláusula eliminada exitosamente.',
    };
  }

  async interpolateSnippet(
    id: string,
    dto: InterpolateSnippetDto,
    user: UserContext,
  ) {
    let template = dto.template;

    if (!template) {
      const snippet = await this.getSnippetById(id, user);
      template = snippet.bodyTemplate;
    }

    return this.snippetInterpolationService.interpolate(
      template || '',
      dto.variables,
    );
  }
}
