import { DocumentEngineController } from './document-engine.controller';

describe('DocumentEngineController', () => {
  let controller: DocumentEngineController;
  let mockService: any;

  const mockReq = {
    user: {
      sub: 'usr-1',
      tenantId: 'ten-1',
      roles: ['ADMIN'],
      permissions: ['commercial:settings:manage'],
    },
  };

  const sampleSkin = { id: 'skin-1', primaryBrandColorHex: '#1E1B4B' };
  const sampleSnippet = { id: 'snp-1', key: 'TEST_KEY' };

  beforeEach(() => {
    mockService = {
      getSkin: jest.fn().mockResolvedValue(sampleSkin),
      updateSkin: jest.fn().mockResolvedValue(sampleSkin),
      uploadLogo: jest.fn().mockResolvedValue({ s3Key: 'logo.webp' }),
      getSnippets: jest.fn().mockResolvedValue([sampleSnippet]),
      getSnippetById: jest.fn().mockResolvedValue(sampleSnippet),
      createSnippet: jest.fn().mockResolvedValue(sampleSnippet),
      updateSnippet: jest.fn().mockResolvedValue(sampleSnippet),
      deleteSnippet: jest.fn().mockResolvedValue({ success: true }),
      interpolateSnippet: jest.fn().mockResolvedValue({
        interpolatedContent: 'Rendered text',
      }),
    };

    controller = new DocumentEngineController(mockService);
  });

  describe('Skin endpoints', () => {
    it('debe consultar la piel de marca', async () => {
      const res = await controller.getSkin(mockReq);
      expect(mockService.getSkin).toHaveBeenCalledWith(mockReq.user);
      expect(res.id).toBe('skin-1');
    });

    it('debe actualizar la piel de marca', async () => {
      const dto = { primaryBrandColorHex: '#002244' };
      const res = await controller.updateSkin(dto, mockReq);
      expect(mockService.updateSkin).toHaveBeenCalledWith(dto, mockReq.user);
      expect(res.id).toBe('skin-1');
    });

    it('debe subir y optimizar el logotipo corporativo', async () => {
      const file = { buffer: Buffer.from('data') } as Express.Multer.File;
      const res = await controller.uploadLogo(file, mockReq);
      expect(mockService.uploadLogo).toHaveBeenCalledWith(file, mockReq.user);
      expect(res.s3Key).toBe('logo.webp');
    });
  });

  describe('Snippets endpoints', () => {
    it('debe listar los fragmentos de texto', async () => {
      const res = await controller.getSnippets(mockReq);
      expect(mockService.getSnippets).toHaveBeenCalledWith(mockReq.user);
      expect(res).toHaveLength(1);
    });

    it('debe consultar fragmento por id', async () => {
      const res = await controller.getSnippetById('snp-1', mockReq);
      expect(mockService.getSnippetById).toHaveBeenCalledWith('snp-1', mockReq.user);
      expect(res.id).toBe('snp-1');
    });

    it('debe crear un fragmento', async () => {
      const dto = {
        key: 'KEY_1',
        title: 'Title',
        bodyTemplate: 'Body',
        category: 'COMMERCIAL_PROPOSAL',
      };
      const res = await controller.createSnippet(dto, mockReq);
      expect(mockService.createSnippet).toHaveBeenCalledWith(dto, mockReq.user);
      expect(res.id).toBe('snp-1');
    });

    it('debe actualizar un fragmento', async () => {
      const res = await controller.updateSnippet('snp-1', { title: 'Updated' }, mockReq);
      expect(mockService.updateSnippet).toHaveBeenCalledWith('snp-1', { title: 'Updated' }, mockReq.user);
      expect(res.id).toBe('snp-1');
    });

    it('debe eliminar un fragmento', async () => {
      const res = await controller.deleteSnippet('snp-1', mockReq);
      expect(mockService.deleteSnippet).toHaveBeenCalledWith('snp-1', mockReq.user);
      expect(res.success).toBe(true);
    });

    it('debe probar la interpolación de fragmento', async () => {
      const dto = { variables: { test: 'val' } };
      const res = await controller.interpolateSnippet('snp-1', dto, mockReq);
      expect(mockService.interpolateSnippet).toHaveBeenCalledWith('snp-1', dto, mockReq.user);
      expect(res.interpolatedContent).toBe('Rendered text');
    });
  });
});
