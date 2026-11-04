import { Test, TestingModule } from '@nestjs/testing';
import { UniversalCodesRepository } from './universal-codes.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CodeType, CodePurpose, CodeStatus } from '@prisma/client';

describe('UniversalCodesRepository', () => {
  let repository: UniversalCodesRepository;
  let prisma: { universalCode: any };

  const mockCode = {
    id: 'code-1',
    tenantId: 'tenant-123',
    code: 'LORO-QR-1234',
    codeType: CodeType.QR_CODE,
    purpose: CodePurpose.PATROL_CHECKPOINT,
    title: 'Punto Norte',
    description: 'Ronda',
    department: 'Seguridad',
    clientId: 'client-1',
    status: CodeStatus.ACTIVE,
    metadata: {},
    createdById: 'user-1',
    updatedById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      $transaction: jest
        .fn()
        .mockImplementation((promises) => Promise.all(promises)),
      universalCode: {
        create: jest.fn().mockResolvedValue(mockCode),
        findFirst: jest.fn().mockResolvedValue(mockCode),
        findMany: jest.fn().mockResolvedValue([mockCode]),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([{ batchId: 'LOTE-1' }]),
        update: jest.fn().mockResolvedValue({ ...mockCode, title: 'Updated' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UniversalCodesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UniversalCodesRepository>(UniversalCodesRepository);
    prisma = module.get(PrismaService);
  });

  it('debe crear un código incluyendo createdBy, updatedBy y client', async () => {
    const res = await repository.create({
      tenantId: 'tenant-123',
      code: 'LORO-QR-1234',
      codeType: CodeType.QR_CODE,
      purpose: CodePurpose.PATROL_CHECKPOINT,
      title: 'Punto Norte',
    });
    expect(res).toEqual(mockCode);
    expect(prisma.universalCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          createdBy: expect.any(Object),
          updatedBy: expect.any(Object),
          client: expect.any(Object),
        }),
      }),
    );
  });

  it('debe buscar por código con tenantId', async () => {
    const res = await repository.findByCode('tenant-123', 'LORO-QR-1234');
    expect(res).toEqual(mockCode);
    expect(prisma.universalCode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-123',
          code: 'LORO-QR-1234',
          deletedAt: null,
        }),
      }),
    );
  });

  it('debe buscar por código de forma pública', async () => {
    const res = await repository.findByCodePublic('LORO-QR-1234');
    expect(res).toEqual(mockCode);
  });

  it('debe buscar por ID', async () => {
    const res = await repository.findById('tenant-123', 'code-1');
    expect(res).toEqual(mockCode);
  });

  it('debe listar con filtros y búsqueda', async () => {
    const res = await repository.findAll('tenant-123', {
      search: 'Norte',
      codeType: CodeType.QR_CODE,
      purpose: CodePurpose.PATROL_CHECKPOINT,
      status: CodeStatus.ACTIVE,
      clientId: 'client-1',
      skip: 0,
      take: 10,
    });
    expect(res).toEqual([mockCode]);
    expect(prisma.universalCode.findMany).toHaveBeenCalled();
  });

  it('debe contar con filtros', async () => {
    const count = await repository.count('tenant-123', { search: 'Norte' });
    expect(count).toBe(1);
  });

  it('debe actualizar el registro incluyendo updatedBy', async () => {
    const updated = await repository.update('tenant-123', 'code-1', {
      title: 'Updated',
    });
    expect(updated.title).toBe('Updated');
    expect(prisma.universalCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'code-1' },
        include: expect.objectContaining({
          updatedBy: expect.any(Object),
        }),
      }),
    );
  });

  it('debe ejecutar softDelete asignando deletedAt', async () => {
    await repository.softDelete('tenant-123', 'code-1');
    expect(prisma.universalCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'code-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('debe crear un lote en transacción con createBatch', async () => {
    const res = await repository.createBatch([
      {
        tenantId: 'tenant-123',
        code: 'LORO-1',
        title: 'Item 1',
        purpose: CodePurpose.INVENTORY_ASSET,
      },
    ]);
    expect(res).toBeDefined();
    expect(prisma.universalCode.create).toHaveBeenCalled();
  });

  it('debe actualizar ítems en lote con batchUpdate', async () => {
    const res = await repository.batchUpdate('tenant-123', [
      { id: 'code-1', data: { title: 'Updated Batch Title' } },
    ]);
    expect(res).toBeDefined();
    expect(prisma.universalCode.update).toHaveBeenCalled();
  });

  it('debe agrupar y contar lotes con findBatches', async () => {
    prisma.universalCode.findMany.mockResolvedValueOnce([
      {
        batchId: 'LOTE-1',
        purpose: CodePurpose.INVENTORY_ASSET,
        codeType: CodeType.BARCODE_128,
        department: 'Almacén',
        createdAt: new Date(),
      },
      {
        batchId: 'LOTE-1',
        purpose: CodePurpose.INVENTORY_ASSET,
        codeType: CodeType.BARCODE_128,
        department: 'Almacén',
        createdAt: new Date(),
      },
    ]);

    const batches = await repository.findBatches('tenant-123');
    expect(batches).toHaveLength(1);
    expect(batches[0].batchId).toBe('LOTE-1');
    expect(batches[0].count).toBe(2);
  });

  it('debe consultar y consolidar estadísticas con getStats', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      21, // total
      21, // active
      0, // inactive
      [{ batchId: 'LOTE-1' }], // batches
    ]);

    const stats = await repository.getStats('tenant-123');
    expect(stats.total).toBe(21);
    expect(stats.active).toBe(21);
    expect(stats.inactive).toBe(0);
    expect(stats.batchesCount).toBe(1);
  });
});
