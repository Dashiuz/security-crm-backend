import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { FormatEngineService } from './format-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentParserService } from './document-parser.service';
import { SystemCatalogService } from './system-catalog.service';
import { FormatInterpolationService } from './format-interpolation.service';
import {
  FormatCategory,
  FormatVisibilityScope,
  VariableSourceType,
} from '@prisma/client';
import { UserContext } from '../../../common/interfaces/user-context.interface';

describe('FormatEngineService', () => {
  let service: FormatEngineService;
  let prismaMock: any;
  let parserMock: any;
  let catalogMock: any;
  let interpolatorMock: any;

  const mockUser: UserContext = {
    sub: 'user-uuid-1',
    roles: ['COORDINATOR'],
    permissions: [],
    tenantId: 'tenant-uuid-1',
  };

  const mockAdminUser: UserContext = {
    sub: 'admin-uuid-1',
    roles: ['ADMIN'],
    permissions: [],
    tenantId: 'tenant-uuid-1',
  };

  beforeEach(async () => {
    prismaMock = {
      universalDocumentFormat: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      formatVariable: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    parserMock = {
      extractVariables: jest.fn().mockReturnValue(['cliente_nombre']),
      parseFileBuffer: jest.fn(),
    };

    catalogMock = {
      getSystemCatalog: jest.fn().mockReturnValue([]),
      resolveContextValues: jest
        .fn()
        .mockResolvedValue({ cliente_nombre: 'Acme Corp' }),
    };

    interpolatorMock = {
      interpolate: jest.fn().mockReturnValue({
        interpolatedContent: '<p>Acme Corp</p>',
        substitutedVariables: ['cliente_nombre'],
        missingVariables: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormatEngineService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: DocumentParserService, useValue: parserMock },
        { provide: SystemCatalogService, useValue: catalogMock },
        { provide: FormatInterpolationService, useValue: interpolatorMock },
      ],
    }).compile();

    service = module.get<FormatEngineService>(FormatEngineService);
  });

  describe('Formats CRUD', () => {
    it('getFormats should filter by category, scope, and search', async () => {
      prismaMock.universalDocumentFormat.findMany.mockResolvedValue([]);

      await service.getFormats(mockUser, {
        category: FormatCategory.COMMERCIAL,
        scope: FormatVisibilityScope.PERSONAL,
        search: 'minuta',
      });

      expect(prismaMock.universalDocumentFormat.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: mockUser.tenantId,
          isActive: true,
          category: FormatCategory.COMMERCIAL,
          scope: FormatVisibilityScope.PERSONAL,
          userId: mockUser.sub,
        }),
        orderBy: [{ isDefault: 'desc' }, { title: 'asc' }],
        include: {
          user: { select: { id: true, fullName: true, document: true } },
        },
      });
    });

    it('getFormatById should throw NotFoundException if format does not exist', async () => {
      prismaMock.universalDocumentFormat.findFirst.mockResolvedValue(null);

      await expect(service.getFormatById('fmt-999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getFormatById should throw ForbiddenException if personal format belongs to another user', async () => {
      prismaMock.universalDocumentFormat.findFirst.mockResolvedValue({
        id: 'fmt-1',
        scope: FormatVisibilityScope.PERSONAL,
        userId: 'other-user-uuid',
      });

      await expect(service.getFormatById('fmt-1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('getFormatById should allow access if user is ADMIN even if owned by another', async () => {
      prismaMock.universalDocumentFormat.findFirst.mockResolvedValue({
        id: 'fmt-1',
        scope: FormatVisibilityScope.PERSONAL,
        userId: 'other-user-uuid',
      });

      const result = await service.getFormatById('fmt-1', mockAdminUser);
      expect(result).toBeDefined();
    });

    it('getNextFormatCode should return FOR-COM-001 when no formats exist', async () => {
      prismaMock.universalDocumentFormat.findMany.mockResolvedValue([]);
      const res = await service.getNextFormatCode(
        FormatCategory.COMMERCIAL,
        mockUser,
      );
      expect(res.code).toBe('FOR-COM-001');
    });

    it('getNextFormatCode should increment to highest existing consecutive', async () => {
      prismaMock.universalDocumentFormat.findMany.mockResolvedValue([
        { code: 'FOR-OPE-001' },
        { code: 'FOR-OPE-005' },
        { code: 'FOR-OPE-002' },
      ]);
      const res = await service.getNextFormatCode(
        FormatCategory.OPERATIONS,
        mockUser,
      );
      expect(res.code).toBe('FOR-OPE-006');
    });

    it('createFormat should create format and extract detectedVariables if not given', async () => {
      prismaMock.universalDocumentFormat.create.mockResolvedValue({
        id: 'fmt-new',
      });

      const dto = {
        code: 'for-com-01',
        title: 'Formato Comercial',
        bodyTemplate: '<p>{{cliente_nombre}}</p>',
        scope: FormatVisibilityScope.PERSONAL,
      };

      const result = await service.createFormat(dto, mockUser);
      expect(result).toEqual({ id: 'fmt-new' });
      expect(prismaMock.universalDocumentFormat.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'FOR-COM-01',
          userId: mockUser.sub,
          detectedVariables: ['cliente_nombre'],
        }),
      });
    });

    it('updateFormat should verify ownership and update format fields', async () => {
      prismaMock.universalDocumentFormat.findFirst.mockResolvedValue({
        id: 'fmt-1',
        scope: FormatVisibilityScope.PERSONAL,
        userId: mockUser.sub,
      });
      prismaMock.universalDocumentFormat.update.mockResolvedValue({
        id: 'fmt-1',
        title: 'Nuevo Titulo',
      });

      const result = await service.updateFormat(
        'fmt-1',
        {
          title: 'Nuevo Titulo',
          bodyTemplate: '<div>{{cliente_nombre}}</div>',
        },
        mockUser,
      );

      expect(result.title).toBe('Nuevo Titulo');
      expect(prismaMock.universalDocumentFormat.update).toHaveBeenCalled();
    });

    it('deleteFormat should soft delete by setting isActive to false', async () => {
      prismaMock.universalDocumentFormat.findFirst.mockResolvedValue({
        id: 'fmt-1',
        scope: FormatVisibilityScope.GLOBAL,
      });
      prismaMock.universalDocumentFormat.update.mockResolvedValue({
        id: 'fmt-1',
        isActive: false,
      });

      const result = await service.deleteFormat('fmt-1', mockUser);
      expect(prismaMock.universalDocumentFormat.update).toHaveBeenCalledWith({
        where: { id: 'fmt-1' },
        data: { isActive: false, updatedById: mockUser.sub },
      });
    });
  });

  describe('Variables CRUD', () => {
    it('getVariables should search and list variables', async () => {
      prismaMock.formatVariable.findMany.mockResolvedValue([]);

      await service.getVariables(mockUser, 'test');
      expect(prismaMock.formatVariable.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: mockUser.tenantId,
          isActive: true,
        }),
        orderBy: [{ scope: 'asc' }, { key: 'asc' }],
      });
    });

    it('createVariable should throw ConflictException if key already exists in same scope', async () => {
      prismaMock.formatVariable.findFirst.mockResolvedValue({ id: 'var-1' });

      await expect(
        service.createVariable(
          {
            key: 'MI_VARIABLE',
            label: 'Mi Variable',
            scope: FormatVisibilityScope.PERSONAL,
          },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('createVariable should normalize key and persist variable', async () => {
      prismaMock.formatVariable.findFirst.mockResolvedValue(null);
      prismaMock.formatVariable.create.mockResolvedValue({ id: 'var-new' });

      const result = await service.createVariable(
        {
          key: 'mi variable.test-1',
          label: 'Mi Variable',
          scope: FormatVisibilityScope.PERSONAL,
          sourceType: VariableSourceType.STATIC_TEXT,
          staticValue: 'Valor fijo',
        },
        mockUser,
      );

      expect(result).toEqual({ id: 'var-new' });
      expect(prismaMock.formatVariable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'MI_VARIABLE_TEST_1',
          userId: mockUser.sub,
          staticValue: 'Valor fijo',
        }),
      });
    });

    it('updateVariable should throw NotFoundException if variable does not exist', async () => {
      prismaMock.formatVariable.findFirst.mockResolvedValue(null);

      await expect(
        service.updateVariable('var-999', { label: 'Update' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('updateVariable should update existing variable', async () => {
      prismaMock.formatVariable.findFirst.mockResolvedValue({
        id: 'var-1',
        scope: FormatVisibilityScope.PERSONAL,
        userId: mockUser.sub,
      });
      prismaMock.formatVariable.update.mockResolvedValue({
        id: 'var-1',
        label: 'Updated Label',
      });

      const result = await service.updateVariable(
        'var-1',
        { label: 'Updated Label' },
        mockUser,
      );
      expect(result.label).toBe('Updated Label');
    });

    it('deleteVariable should throw ForbiddenException if user does not own personal variable', async () => {
      prismaMock.formatVariable.findFirst.mockResolvedValue({
        id: 'var-1',
        scope: FormatVisibilityScope.PERSONAL,
        userId: 'other-user',
      });

      await expect(service.deleteVariable('var-1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deleteVariable should delete variable', async () => {
      prismaMock.formatVariable.findFirst.mockResolvedValue({
        id: 'var-1',
        scope: FormatVisibilityScope.PERSONAL,
        userId: mockUser.sub,
      });
      prismaMock.formatVariable.delete.mockResolvedValue({ id: 'var-1' });

      const result = await service.deleteVariable('var-1', mockUser);
      expect(result).toEqual({ id: 'var-1' });
    });
  });

  describe('Parse & Drop and System Catalog', () => {
    it('parseUploadedFile should delegate to parserService', async () => {
      const buffer = Buffer.from('test');
      parserMock.parseFileBuffer.mockResolvedValue({ html: '<p>test</p>' });

      const result = await service.parseUploadedFile(buffer, 'test.docx');
      expect(result.html).toBe('<p>test</p>');
      expect(parserMock.parseFileBuffer).toHaveBeenCalledWith(
        buffer,
        'test.docx',
        undefined,
      );
    });

    it('getSystemCatalog should delegate to catalogService', () => {
      service.getSystemCatalog();
      expect(catalogMock.getSystemCatalog).toHaveBeenCalled();
    });
  });

  describe('renderFormat', () => {
    it('should return empty result if no template is found', async () => {
      const result = await service.renderFormat(null, {}, mockUser);
      expect(result.interpolatedContent).toBe('');
    });

    it('should render format by id and merge database values, user static variables, and additionalVariables', async () => {
      prismaMock.universalDocumentFormat.findFirst.mockResolvedValue({
        id: 'fmt-1',
        bodyTemplate: '<p>{{cliente_nombre}} - {{MI_TOKEN}} - {{CUSTOM}}</p>',
        scope: FormatVisibilityScope.GLOBAL,
      });

      prismaMock.formatVariable.findMany.mockResolvedValue([
        { key: 'MI_TOKEN', staticValue: 'Token Value' },
      ]);

      const result = await service.renderFormat(
        'fmt-1',
        {
          entityType: 'CLIENT',
          entityId: 'client-1',
          additionalVariables: { CUSTOM: 'Adhoc Value' },
        },
        mockUser,
      );

      expect(catalogMock.resolveContextValues).toHaveBeenCalledWith(
        mockUser.tenantId,
        {
          clientId: 'client-1',
          employeeId: undefined,
          proposalId: undefined,
        },
      );
      expect(interpolatorMock.interpolate).toHaveBeenCalledWith(
        '<p>{{cliente_nombre}} - {{MI_TOKEN}} - {{CUSTOM}}</p>',
        expect.objectContaining({
          cliente_nombre: 'Acme Corp',
          mi_token: 'Token Value',
          MI_TOKEN: 'Token Value',
          CUSTOM: 'Adhoc Value',
        }),
      );
    });
  });
});
