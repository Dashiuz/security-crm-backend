import { DocumentEngineRepository } from './document-engine.repository';

describe('DocumentEngineRepository', () => {
  let repository: DocumentEngineRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenantDocumentSkin: {
        findUnique: jest.fn().mockResolvedValue({ id: 'skin-1' }),
        upsert: jest.fn().mockResolvedValue({ id: 'skin-1' }),
        update: jest.fn().mockResolvedValue({ id: 'skin-1' }),
      },
      authorizedSigner: {
        findMany: jest.fn().mockResolvedValue([{ id: 'sig-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'sig-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'sig-1' }),
        create: jest.fn().mockResolvedValue({ id: 'sig-1' }),
        update: jest.fn().mockResolvedValue({ id: 'sig-1' }),
      },
      documentTextSnippet: {
        findMany: jest.fn().mockResolvedValue([{ id: 'snp-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'snp-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'snp-1' }),
        create: jest.fn().mockResolvedValue({ id: 'snp-1' }),
        update: jest.fn().mockResolvedValue({ id: 'snp-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'snp-1' }),
      },
    };

    repository = new DocumentEngineRepository(mockPrisma);
  });

  describe('Skin CRUD', () => {
    it('findSkinByTenantId debe llamar a findUnique', async () => {
      const res = await repository.findSkinByTenantId('ten-1');
      expect(mockPrisma.tenantDocumentSkin.findUnique).toHaveBeenCalled();
      expect(res?.id).toBe('skin-1');
    });

    it('upsertSkin debe llamar a upsert', async () => {
      const res = await repository.upsertSkin(
        'ten-1',
        'comm-1',
        {} as any,
        'usr-1',
      );
      expect(mockPrisma.tenantDocumentSkin.upsert).toHaveBeenCalled();
      expect(res.id).toBe('skin-1');
    });

    it('updateSkinLogo debe llamar a update', async () => {
      const res = await repository.updateSkinLogo(
        'skin-1',
        'key.webp',
        'usr-1',
      );
      expect(mockPrisma.tenantDocumentSkin.update).toHaveBeenCalled();
      expect(res.id).toBe('skin-1');
    });
  });

  describe('AuthorizedSigner CRUD', () => {
    it('findSigners debe llamar a findMany', async () => {
      const res = await repository.findSigners('ten-1');
      expect(mockPrisma.authorizedSigner.findMany).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('findSignerById debe llamar a findFirst', async () => {
      const res = await repository.findSignerById('sig-1', 'ten-1');
      expect(mockPrisma.authorizedSigner.findFirst).toHaveBeenCalled();
      expect(res?.id).toBe('sig-1');
    });

    it('findSignerByEmail debe llamar a findUnique con clave compuesta', async () => {
      const res = await repository.findSignerByEmail(
        'carlos@noxia.com',
        'ten-1',
      );
      expect(mockPrisma.authorizedSigner.findUnique).toHaveBeenCalled();
      expect(res?.id).toBe('sig-1');
    });

    it('createSigner debe llamar a create', async () => {
      const res = await repository.createSigner({} as any);
      expect(mockPrisma.authorizedSigner.create).toHaveBeenCalled();
      expect(res.id).toBe('sig-1');
    });

    it('updateSigner debe llamar a update', async () => {
      const res = await repository.updateSigner('sig-1', {} as any);
      expect(mockPrisma.authorizedSigner.update).toHaveBeenCalled();
      expect(res.id).toBe('sig-1');
    });

    it('softDeleteSigner debe actualizar isActive a false', async () => {
      const res = await repository.softDeleteSigner('sig-1', 'usr-1');
      expect(mockPrisma.authorizedSigner.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sig-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
      expect(res.id).toBe('sig-1');
    });
  });

  describe('DocumentTextSnippet CRUD', () => {
    it('findSnippets debe llamar a findMany', async () => {
      const res = await repository.findSnippets('ten-1');
      expect(mockPrisma.documentTextSnippet.findMany).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('findSnippetById debe llamar a findFirst', async () => {
      const res = await repository.findSnippetById('snp-1', 'ten-1');
      expect(mockPrisma.documentTextSnippet.findFirst).toHaveBeenCalled();
      expect(res?.id).toBe('snp-1');
    });

    it('findSnippetByKey debe llamar a findUnique', async () => {
      const res = await repository.findSnippetByKey('KEY_1', 'ten-1');
      expect(mockPrisma.documentTextSnippet.findUnique).toHaveBeenCalled();
      expect(res?.id).toBe('snp-1');
    });

    it('createSnippet debe llamar a create', async () => {
      const res = await repository.createSnippet({} as any);
      expect(mockPrisma.documentTextSnippet.create).toHaveBeenCalled();
      expect(res.id).toBe('snp-1');
    });

    it('updateSnippet debe llamar a update', async () => {
      const res = await repository.updateSnippet('snp-1', {} as any);
      expect(mockPrisma.documentTextSnippet.update).toHaveBeenCalled();
      expect(res.id).toBe('snp-1');
    });

    it('deleteSnippet debe llamar a delete', async () => {
      const res = await repository.deleteSnippet('snp-1');
      expect(mockPrisma.documentTextSnippet.delete).toHaveBeenCalled();
      expect(res.id).toBe('snp-1');
    });
  });
});
