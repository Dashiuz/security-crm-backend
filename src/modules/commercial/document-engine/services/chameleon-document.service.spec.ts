import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ChameleonDocumentService } from './chameleon-document.service';
import { UserContext } from '../../../../common/interfaces/user-context.interface';

describe('ChameleonDocumentService', () => {
  let service: ChameleonDocumentService;
  let mockDocEngineRepo: any;
  let mockCommercialSettingsRepo: any;
  let mockAssetOptimizationService: any;
  let mockSnippetInterpolationService: any;
  let mockS3Service: any;

  const mockUser: UserContext = {
    sub: 'user-123',
    tenantId: 'tenant-abc',
    roles: ['ADMIN'],
    permissions: ['commercial:settings:manage'],
  };

  const sampleSkin = {
    id: 'skin-1',
    tenantId: 'tenant-abc',
    commercialSettingsId: 'comm-1',
    companyLegalName: 'SEGURIDAD NOXIA LTDA',
    companyNit: '900.123.456-7',
    primaryBrandColorHex: '#1E1B4B',
    accentBrandColorHex: '#7C3AED',
    secondaryColorHex: '#F59E0B',
    neutralDarkHex: '#0F172A',
    neutralLightHex: '#F8FAFC',
    headerLayout: 'CLASSIC_MEMBRETE',
    logoS3Key: 'tenants/tenant-abc/brand/skin-1/logo-abc.webp',
    signers: [],
    textSnippets: [],
  };

  const sampleSigner = {
    id: 'signer-1',
    tenantId: 'tenant-abc',
    documentSkinId: 'skin-1',
    fullName: 'Carlos Mendoza',
    idNumber: '10203040',
    corporateTitle: 'Director Comercial',
    email: 'carlos@noxia.com',
    roleScope: 'COMMERCIAL_DIRECTOR',
    signatureImageS3Key: 'tenants/tenant-abc/signers/signer-1/sig.png',
    isActive: true,
  };

  const sampleSnippet = {
    id: 'snp-1',
    tenantId: 'tenant-abc',
    key: 'COVER_LETTER',
    title: 'Carta Presentación',
    bodyTemplate: 'Estimado {{cliente}}',
    category: 'COMMERCIAL_PROPOSAL',
    availableVariables: ['cliente'],
    isDefault: false,
    isActive: true,
  };

  beforeEach(() => {
    mockDocEngineRepo = {
      findSkinByTenantId: jest.fn().mockResolvedValue(sampleSkin),
      upsertSkin: jest.fn().mockResolvedValue(sampleSkin),
      updateSkinLogo: jest.fn().mockResolvedValue(sampleSkin),
      findSigners: jest.fn().mockResolvedValue([sampleSigner]),
      findSignerById: jest.fn().mockResolvedValue(sampleSigner),
      findSignerByEmail: jest.fn().mockResolvedValue(null),
      createSigner: jest.fn().mockResolvedValue(sampleSigner),
      updateSigner: jest.fn().mockResolvedValue(sampleSigner),
      softDeleteSigner: jest
        .fn()
        .mockResolvedValue({ ...sampleSigner, isActive: false }),
      findSnippets: jest.fn().mockResolvedValue([sampleSnippet]),
      findSnippetById: jest.fn().mockResolvedValue(sampleSnippet),
      findSnippetByKey: jest.fn().mockResolvedValue(null),
      createSnippet: jest.fn().mockResolvedValue(sampleSnippet),
      updateSnippet: jest.fn().mockResolvedValue(sampleSnippet),
      deleteSnippet: jest.fn().mockResolvedValue(sampleSnippet),
    };

    mockCommercialSettingsRepo = {
      findByTenantId: jest
        .fn()
        .mockResolvedValue({ id: 'comm-1', tenantId: 'tenant-abc' }),
    };

    mockAssetOptimizationService = {
      processLogo: jest.fn().mockResolvedValue({
        buffer: Buffer.from('webp-logo'),
        mimeType: 'image/webp',
        extension: 'webp',
        width: 500,
        height: 150,
        sizeBytes: 15000,
      }),
      processSignature: jest.fn().mockResolvedValue({
        buffer: Buffer.from('png-sig'),
        mimeType: 'image/png',
        extension: 'png',
        width: 300,
        height: 100,
        sizeBytes: 8000,
      }),
    };

    mockSnippetInterpolationService = {
      extractVariables: jest.fn().mockReturnValue(['cliente']),
      interpolate: jest.fn().mockReturnValue({
        interpolatedContent: 'Estimado Banco de Bogotá',
        substitutedVariables: ['cliente'],
        missingVariables: [],
      }),
    };

    mockS3Service = {
      generateS3Key: jest
        .fn()
        .mockReturnValue('tenants/tenant-abc/test-key.webp'),
      uploadBuffer: jest.fn().mockResolvedValue({
        url: 'https://s3.amazonaws.com/test-key.webp',
        s3Key: 'tenants/tenant-abc/test-key.webp',
        sizeBytes: 15000,
      }),
    };

    service = new ChameleonDocumentService(
      mockDocEngineRepo,
      mockCommercialSettingsRepo,
      mockAssetOptimizationService,
      mockSnippetInterpolationService,
      mockS3Service,
    );
  });

  describe('Skin Management', () => {
    it('debe obtener la piel existente del tenant', async () => {
      const skin = await service.getSkin(mockUser);
      expect(mockDocEngineRepo.findSkinByTenantId).toHaveBeenCalledWith(
        'tenant-abc',
      );
      expect(skin.id).toBe('skin-1');
    });

    it('debe inicializar la piel por defecto si no existe', async () => {
      mockDocEngineRepo.findSkinByTenantId.mockResolvedValueOnce(null);
      const skin = await service.getSkin(mockUser);
      expect(mockCommercialSettingsRepo.findByTenantId).toHaveBeenCalledWith(
        'tenant-abc',
      );
      expect(mockDocEngineRepo.upsertSkin).toHaveBeenCalled();
      expect(skin.id).toBe('skin-1');
    });

    it('debe lanzar NotFoundException si no existen configuraciones comerciales previas', async () => {
      mockDocEngineRepo.findSkinByTenantId.mockResolvedValueOnce(null);
      mockCommercialSettingsRepo.findByTenantId.mockResolvedValueOnce(null);

      await expect(service.getSkin(mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe actualizar la piel de marca del tenant', async () => {
      const updated = await service.updateSkin(
        { primaryBrandColorHex: '#003366', companyLegalName: 'NUEVA RAZON' },
        mockUser,
      );
      expect(mockDocEngineRepo.upsertSkin).toHaveBeenCalled();
      expect(updated.id).toBe('skin-1');
    });

    it('debe optimizar y subir el logo del tenant con sharp y S3', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-logo-data'),
        originalname: 'logo.png',
      } as Express.Multer.File;

      const result = await service.uploadLogo(mockFile, mockUser);

      expect(mockAssetOptimizationService.processLogo).toHaveBeenCalledWith(
        mockFile.buffer,
      );
      expect(mockS3Service.uploadBuffer).toHaveBeenCalled();
      expect(mockDocEngineRepo.updateSkinLogo).toHaveBeenCalled();
      expect(result.s3Key).toBeDefined();
    });

    it('debe lanzar BadRequestException si el archivo de logo es inválido', async () => {
      await expect(service.uploadLogo(null as any, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Signers Management', () => {
    it('debe listar los firmantes autorizados del tenant', async () => {
      const signers = await service.getSigners(mockUser);
      expect(mockDocEngineRepo.findSigners).toHaveBeenCalledWith('tenant-abc');
      expect(signers).toHaveLength(1);
    });

    it('debe consultar firmante por id', async () => {
      const signer = await service.getSignerById('signer-1', mockUser);
      expect(signer.id).toBe('signer-1');
    });

    it('debe lanzar NotFoundException si el firmante no existe', async () => {
      mockDocEngineRepo.findSignerById.mockResolvedValueOnce(null);
      await expect(
        service.getSignerById('not-found', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe crear un firmante autorizado', async () => {
      const result = await service.createSigner(
        {
          fullName: 'Juan Perez',
          idNumber: '987654',
          corporateTitle: 'Gerente General',
          email: 'juan.perez@noxia.com',
        },
        mockUser,
      );
      expect(mockDocEngineRepo.createSigner).toHaveBeenCalled();
      expect(result.id).toBe('signer-1');
    });

    it('debe lanzar ConflictException si el email del firmante ya existe', async () => {
      mockDocEngineRepo.findSignerByEmail.mockResolvedValueOnce(sampleSigner);
      await expect(
        service.createSigner(
          {
            fullName: 'Juan',
            idNumber: '123',
            corporateTitle: 'Rep',
            email: 'carlos@noxia.com',
          },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('debe procesar y cargar firma digitalizada si se envía en base64 al crear', async () => {
      await service.createSigner(
        {
          fullName: 'Juan Perez',
          idNumber: '987654',
          corporateTitle: 'Gerente General',
          email: 'juan.new@noxia.com',
          signatureDataUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        },
        mockUser,
      );
      expect(mockAssetOptimizationService.processSignature).toHaveBeenCalled();
      expect(mockS3Service.uploadBuffer).toHaveBeenCalled();
    });

    it('debe actualizar firmante autorizado', async () => {
      const res = await service.updateSigner(
        'signer-1',
        { phone: '+57300123' },
        mockUser,
      );
      expect(mockDocEngineRepo.updateSigner).toHaveBeenCalled();
      expect(res.id).toBe('signer-1');
    });

    it('debe subir y optimizar firma de firmante mediante archivo', async () => {
      const mockFile = {
        buffer: Buffer.from('sig-data'),
      } as Express.Multer.File;
      const res = await service.uploadSignerSignature(
        'signer-1',
        mockFile,
        mockUser,
      );

      expect(mockAssetOptimizationService.processSignature).toHaveBeenCalled();
      expect(mockS3Service.uploadBuffer).toHaveBeenCalled();
      expect(res.s3Key).toBeDefined();
    });

    it('debe lanzar BadRequestException si el archivo de firma es nulo', async () => {
      await expect(
        service.uploadSignerSignature('signer-1', null as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe inhabilitar firmante autorizado (soft-delete)', async () => {
      const res = await service.deleteSigner('signer-1', mockUser);
      expect(mockDocEngineRepo.softDeleteSigner).toHaveBeenCalledWith(
        'signer-1',
        'user-123',
      );
      expect(res.success).toBe(true);
    });
  });

  describe('Snippets & Clauses Management', () => {
    it('debe listar los fragmentos de texto del tenant', async () => {
      const snippets = await service.getSnippets(mockUser);
      expect(mockDocEngineRepo.findSnippets).toHaveBeenCalledWith('tenant-abc');
      expect(snippets).toHaveLength(1);
    });

    it('debe consultar fragmento por id', async () => {
      const snippet = await service.getSnippetById('snp-1', mockUser);
      expect(snippet.id).toBe('snp-1');
    });

    it('debe lanzar NotFoundException si el fragmento no existe', async () => {
      mockDocEngineRepo.findSnippetById.mockResolvedValueOnce(null);
      await expect(
        service.getSnippetById('snp-unknown', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe crear un nuevo fragmento con extracción asistida de variables', async () => {
      const res = await service.createSnippet(
        {
          key: 'NEW_KEY',
          title: 'Nueva Cláusula',
          bodyTemplate: 'Cláusula con {{token1}}',
          category: 'LEGAL_CLAUSES',
        },
        mockUser,
      );
      expect(mockDocEngineRepo.createSnippet).toHaveBeenCalled();
      expect(res.id).toBe('snp-1');
    });

    it('debe lanzar ConflictException si la clave del fragmento ya existe', async () => {
      mockDocEngineRepo.findSnippetByKey.mockResolvedValueOnce(sampleSnippet);
      await expect(
        service.createSnippet(
          {
            key: 'COVER_LETTER',
            title: 'Repetida',
            bodyTemplate: 'Texto',
            category: 'COMMERCIAL_PROPOSAL',
          },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('debe actualizar fragmento de texto', async () => {
      const res = await service.updateSnippet(
        'snp-1',
        { title: 'Nuevo Título' },
        mockUser,
      );
      expect(mockDocEngineRepo.updateSnippet).toHaveBeenCalled();
      expect(res.id).toBe('snp-1');
    });

    it('debe eliminar fragmento no predeterminado', async () => {
      const res = await service.deleteSnippet('snp-1', mockUser);
      expect(mockDocEngineRepo.deleteSnippet).toHaveBeenCalledWith('snp-1');
      expect(res.success).toBe(true);
    });

    it('debe prohibir eliminar un fragmento predeterminado', async () => {
      mockDocEngineRepo.findSnippetById.mockResolvedValueOnce({
        ...sampleSnippet,
        isDefault: true,
      });

      await expect(service.deleteSnippet('snp-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe interpolar variables en un fragmento', async () => {
      const res = await service.interpolateSnippet(
        'snp-1',
        { variables: { cliente: 'Banco de Bogotá' } },
        mockUser,
      );

      expect(mockSnippetInterpolationService.interpolate).toHaveBeenCalled();
      expect(res.interpolatedContent).toBe('Estimado Banco de Bogotá');
    });
  });
});
