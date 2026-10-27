import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FormatEngineController } from './format-engine.controller';
import { FormatEngineService } from '../services/format-engine.service';
import { FormatCategory, FormatVisibilityScope } from '@prisma/client';

describe('FormatEngineController', () => {
  let controller: FormatEngineController;
  let serviceMock: any;

  const mockReq = {
    user: {
      sub: 'user-123',
      tenantId: 'tenant-123',
      role: 'COORDINATOR',
    },
  };

  beforeEach(async () => {
    serviceMock = {
      getFormats: jest.fn().mockResolvedValue([]),
      getFormatById: jest.fn().mockResolvedValue({ id: 'fmt-1' }),
      createFormat: jest.fn().mockResolvedValue({ id: 'fmt-1' }),
      updateFormat: jest.fn().mockResolvedValue({ id: 'fmt-1' }),
      deleteFormat: jest.fn().mockResolvedValue({ id: 'fmt-1' }),
      getVariables: jest.fn().mockResolvedValue([]),
      createVariable: jest.fn().mockResolvedValue({ id: 'var-1' }),
      updateVariable: jest.fn().mockResolvedValue({ id: 'var-1' }),
      deleteVariable: jest.fn().mockResolvedValue({ id: 'var-1' }),
      getSystemCatalog: jest.fn().mockReturnValue([]),
      parseUploadedFile: jest.fn().mockResolvedValue({ html: '<p>parsed</p>' }),
      renderFormat: jest.fn().mockResolvedValue({ interpolatedContent: 'rendered' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormatEngineController],
      providers: [
        {
          provide: FormatEngineService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<FormatEngineController>(FormatEngineController);
  });

  describe('Formats Endpoints', () => {
    it('getFormats should delegate to service.getFormats', async () => {
      await controller.getFormats(
        mockReq,
        FormatCategory.OPERATIONS,
        FormatVisibilityScope.GLOBAL,
        'busqueda',
      );
      expect(serviceMock.getFormats).toHaveBeenCalledWith(mockReq.user, {
        category: FormatCategory.OPERATIONS,
        scope: FormatVisibilityScope.GLOBAL,
        search: 'busqueda',
      });
    });


    it('getFormatById should delegate to service.getFormatById', async () => {
      await controller.getFormatById(mockReq, 'fmt-1');
      expect(serviceMock.getFormatById).toHaveBeenCalledWith('fmt-1', mockReq.user);
    });

    it('createFormat should delegate to service.createFormat', async () => {
      const dto = { title: 'Test', bodyTemplate: 'test', code: 'T1' };
      await controller.createFormat(mockReq, dto as any);
      expect(serviceMock.createFormat).toHaveBeenCalledWith(dto, mockReq.user);
    });

    it('updateFormat should delegate to service.updateFormat', async () => {
      const dto = { title: 'Updated' };
      await controller.updateFormat(mockReq, 'fmt-1', dto as any);
      expect(serviceMock.updateFormat).toHaveBeenCalledWith('fmt-1', dto, mockReq.user);
    });

    it('deleteFormat should delegate to service.deleteFormat', async () => {
      await controller.deleteFormat(mockReq, 'fmt-1');
      expect(serviceMock.deleteFormat).toHaveBeenCalledWith('fmt-1', mockReq.user);
    });
  });

  describe('Variables Endpoints', () => {
    it('getVariables should delegate to service.getVariables', async () => {
      await controller.getVariables(mockReq, 'filtro');
      expect(serviceMock.getVariables).toHaveBeenCalledWith(mockReq.user, 'filtro');
    });

    it('createVariable should delegate to service.createVariable', async () => {
      const dto = { key: 'TEST', label: 'Test' };
      await controller.createVariable(mockReq, dto as any);
      expect(serviceMock.createVariable).toHaveBeenCalledWith(dto, mockReq.user);
    });

    it('updateVariable should delegate to service.updateVariable', async () => {
      const dto = { label: 'Updated' };
      await controller.updateVariable(mockReq, 'var-1', dto as any);
      expect(serviceMock.updateVariable).toHaveBeenCalledWith('var-1', dto, mockReq.user);
    });

    it('deleteVariable should delegate to service.deleteVariable', async () => {
      await controller.deleteVariable(mockReq, 'var-1');
      expect(serviceMock.deleteVariable).toHaveBeenCalledWith('var-1', mockReq.user);
    });
  });

  describe('System Catalog and Parse File', () => {
    it('getSystemCatalog should delegate to service', () => {
      controller.getSystemCatalog();
      expect(serviceMock.getSystemCatalog).toHaveBeenCalled();
    });

    it('parseUploadedFile should throw BadRequestException if no file is provided', async () => {
      await expect(controller.parseUploadedFile(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('parseUploadedFile should delegate to service if file is valid', async () => {
      const mockFile = {
        buffer: Buffer.from('abc'),
        originalname: 'test.docx',
        mimetype: 'application/docx',
      } as Express.Multer.File;

      const result = await controller.parseUploadedFile(mockFile);
      expect(result).toEqual({ html: '<p>parsed</p>' });
      expect(serviceMock.parseUploadedFile).toHaveBeenCalledWith(
        mockFile.buffer,
        'test.docx',
        'application/docx',
      );
    });
  });

  describe('Render Endpoints', () => {
    it('renderCustomHtml should call renderFormat with null formatId', async () => {
      const dto = { customTemplateHtml: '<p>test</p>' };
      await controller.renderCustomHtml(mockReq, dto as any);
      expect(serviceMock.renderFormat).toHaveBeenCalledWith(null, dto, mockReq.user);
    });

    it('renderSavedFormat should call renderFormat with formatId', async () => {
      const dto = { entityType: 'CLIENT', entityId: 'c1' };
      await controller.renderSavedFormat(mockReq, 'fmt-1', dto as any);
      expect(serviceMock.renderFormat).toHaveBeenCalledWith('fmt-1', dto, mockReq.user);
    });
  });
});
