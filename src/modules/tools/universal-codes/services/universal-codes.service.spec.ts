import { Test, TestingModule } from '@nestjs/testing';
import { UniversalCodesService } from './universal-codes.service';
import { UniversalCodesRepository } from '../repositories/universal-codes.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RequestContextService } from '../../../../common/context/request-context.service';
import { CodeType, CodePurpose, CodeStatus } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('UniversalCodesService', () => {
  let service: UniversalCodesService;
  let repository: jest.Mocked<UniversalCodesRepository>;
  let prisma: any;
  let contextService: jest.Mocked<RequestContextService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockUniversalCode = {
    id: 'code-1',
    tenantId: mockTenantId,
    code: 'LORO-QR-TEST-001',
    codeType: CodeType.QR_CODE,
    purpose: CodePurpose.PATROL_CHECKPOINT,
    title: 'Punto Garita 1',
    description: 'Ronda de cada hora',
    department: 'Operaciones',
    clientId: 'client-789',
    status: CodeStatus.ACTIVE,
    metadata: { floor: 1 },
    createdById: mockUserId,
    createdBy: {
      id: mockUserId,
      fullName: 'Supervisor Seguridad',
      document: '12345678',
    },
    updatedById: mockUserId,
    updatedBy: {
      id: mockUserId,
      fullName: 'Supervisor Seguridad',
      document: '12345678',
    },
    client: {
      id: 'client-789',
      name: 'Edificio Torre Real',
      internalCode: 'CLI-001',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findByCode: jest.fn(),
      findByCodePublic: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createBatch: jest.fn(),
      batchUpdate: jest.fn(),
      findBatches: jest.fn(),
      getStats: jest.fn(),
    };

    const mockPrisma = {
      client: {
        findFirst: jest.fn(),
      },
    };

    const mockCtx = {
      tenantId: mockTenantId,
      userId: mockUserId,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UniversalCodesService,
        { provide: UniversalCodesRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RequestContextService, useValue: mockCtx },
      ],
    }).compile();

    service = module.get<UniversalCodesService>(UniversalCodesService);
    repository = module.get(UniversalCodesRepository);
    prisma = module.get(PrismaService);
    contextService = module.get(RequestContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCanonicalCode', () => {
    it('debe generar código para QR_CODE con prefijo LORO-QR-', () => {
      const code = service.generateCanonicalCode(CodeType.QR_CODE);
      expect(code).toMatch(/^LORO-QR-[A-Z0-9]+-\d{4}$/);
    });

    it('debe generar código para BARCODE_128 con prefijo LORO-BAR-', () => {
      const code = service.generateCanonicalCode(CodeType.BARCODE_128);
      expect(code).toMatch(/^LORO-BAR-[A-Z0-9]+-\d{4}$/);
    });

    it('debe generar código válido para BARCODE_EAN13 con 13 dígitos y prefijo 770', () => {
      const code = service.generateCanonicalCode(CodeType.BARCODE_EAN13);
      expect(code).toMatch(/^770\d{10}$/);
      expect(code.length).toBe(13);
    });
  });

  describe('create', () => {
    it('debe registrar y emitir un código exitosamente con auto-generación', async () => {
      repository.findByCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUniversalCode as any);

      const result = await service.create({
        codeType: CodeType.QR_CODE,
        purpose: CodePurpose.PATROL_CHECKPOINT,
        title: 'Punto Garita 1',
      });

      expect(repository.create).toHaveBeenCalled();
      expect(result.id).toBe('code-1');
      expect(result.code).toBe('LORO-QR-TEST-001');
      expect(result.client?.name).toBe('Edificio Torre Real');
    });

    it('debe verificar la existencia del cliente si se provee clientId', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'client-789' });
      repository.findByCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUniversalCode as any);

      const result = await service.create({
        codeType: CodeType.QR_CODE,
        purpose: CodePurpose.PATROL_CHECKPOINT,
        title: 'Punto Garita 1',
        clientId: 'client-789',
      });

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-789', tenantId: mockTenantId },
        select: { id: true },
      });
      expect(result.id).toBe('code-1');
    });

    it('debe lanzar NotFoundException si el clientId provisto no existe', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          codeType: CodeType.QR_CODE,
          purpose: CodePurpose.PATROL_CHECKPOINT,
          title: 'Punto Garita 1',
          clientId: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si el código ya existe para el tenant', async () => {
      repository.findByCode.mockResolvedValue(mockUniversalCode as any);

      await expect(
        service.create({
          code: 'LORO-QR-TEST-001',
          codeType: CodeType.QR_CODE,
          purpose: CodePurpose.PATROL_CHECKPOINT,
          title: 'Punto Garita 1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar BadRequestException si no existe tenantId en el contexto', async () => {
      (contextService as any).tenantId = undefined;

      await expect(
        service.create(
          {
            codeType: CodeType.QR_CODE,
            purpose: CodePurpose.PATROL_CHECKPOINT,
            title: 'Punto Garita 1',
          },
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('debe retornar lista paginada y conteo de códigos', async () => {
      repository.findAll.mockResolvedValue([mockUniversalCode as any]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        purpose: CodePurpose.PATROL_CHECKPOINT,
      });

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('debe lanzar BadRequestException si no hay tenantId', async () => {
      (contextService as any).tenantId = undefined;

      await expect(service.findAll({}, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById', () => {
    it('debe retornar el código si existe', async () => {
      repository.findById.mockResolvedValue(mockUniversalCode as any);

      const result = await service.findById('code-1');
      expect(result.id).toBe('code-1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si no hay tenantId', async () => {
      (contextService as any).tenantId = undefined;

      await expect(service.findById('code-1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveCode', () => {
    it('debe resolver el código por contexto de tenant', async () => {
      repository.findByCode.mockResolvedValue(mockUniversalCode as any);

      const result = await service.resolveCode('loro-qr-test-001');
      expect(repository.findByCode).toHaveBeenCalledWith(
        mockTenantId,
        'LORO-QR-TEST-001',
      );
      expect(result.code).toBe('LORO-QR-TEST-001');
    });

    it('debe resolver el código públicamente si no hay tenantId en contexto', async () => {
      (contextService as any).tenantId = undefined;
      repository.findByCodePublic.mockResolvedValue(mockUniversalCode as any);

      const result = await service.resolveCode('loro-qr-test-001', undefined);
      expect(repository.findByCodePublic).toHaveBeenCalledWith(
        'LORO-QR-TEST-001',
      );
      expect(result.code).toBe('LORO-QR-TEST-001');
    });

    it('debe lanzar NotFoundException si el código no se encuentra', async () => {
      repository.findByCode.mockResolvedValue(null);

      await expect(service.resolveCode('UNKNOWN-CODE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('debe actualizar los datos del código correctamente', async () => {
      repository.findById.mockResolvedValue(mockUniversalCode as any);
      repository.update.mockResolvedValue({
        ...mockUniversalCode,
        title: 'Nuevo Título Garita',
      } as any);

      const result = await service.update('code-1', {
        title: 'Nuevo Título Garita',
      });

      expect(result.title).toBe('Nuevo Título Garita');
    });

    it('debe lanzar NotFoundException si el código a actualizar no existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe verificar clientId si se intenta cambiar a un cliente inexistente', async () => {
      repository.findById.mockResolvedValue(mockUniversalCode as any);
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.update('code-1', { clientId: 'invalid-client' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si no hay tenantId', async () => {
      (contextService as any).tenantId = undefined;

      await expect(
        service.update('code-1', { title: 'Test' }, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('debe ejecutar el soft delete correctamente', async () => {
      repository.findById.mockResolvedValue(mockUniversalCode as any);
      repository.softDelete.mockResolvedValue({
        ...mockUniversalCode,
        deletedAt: new Date(),
      } as any);

      const result = await service.remove('code-1');
      expect(repository.softDelete).toHaveBeenCalledWith(
        mockTenantId,
        'code-1',
      );
      expect(result.id).toBe('code-1');
    });

    it('debe lanzar NotFoundException si el código a eliminar no existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si no hay tenantId', async () => {
      (contextService as any).tenantId = undefined;

      await expect(service.remove('code-1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createBatch', () => {
    it('debe generar masivamente un lote de códigos con batchId autogenerado', async () => {
      const itemsMock = [
        {
          ...mockUniversalCode,
          id: 'b-1',
          code: 'LORO-BAR-1',
          batchId: 'LOTE-TEST',
        },
        {
          ...mockUniversalCode,
          id: 'b-2',
          code: 'LORO-BAR-2',
          batchId: 'LOTE-TEST',
        },
      ];
      repository.createBatch.mockResolvedValue(itemsMock as any);

      const result = await service.createBatch({
        codeType: CodeType.BARCODE_128,
        purpose: CodePurpose.INVENTORY_ASSET,
        quantity: 2,
        titlePattern: 'Cámara Seguridad',
        department: 'Almacén',
      });

      expect(repository.createBatch).toHaveBeenCalled();
      const calledItems = repository.createBatch.mock.calls[0][0];
      expect(calledItems).toHaveLength(2);
      expect(calledItems[0].title).toBe('Cámara Seguridad #1');
      expect(calledItems[1].title).toBe('Cámara Seguridad #2');
      expect(calledItems[0].batchId).toMatch(/^LOTE-/);
      expect(result).toHaveLength(2);
    });

    it('debe respetar un batchId personalizado provisto', async () => {
      repository.createBatch.mockResolvedValue([
        { ...mockUniversalCode, id: 'b-1', batchId: 'CUSTOM-BATCH' },
      ] as any);

      await service.createBatch({
        codeType: CodeType.QR_CODE,
        purpose: CodePurpose.PATROL_CHECKPOINT,
        quantity: 1,
        titlePattern: 'Garita',
        batchId: 'CUSTOM-BATCH',
      });

      const calledItems = repository.createBatch.mock.calls[0][0];
      expect(calledItems[0].batchId).toBe('CUSTOM-BATCH');
    });

    it('debe verificar clientId si se especifica', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.createBatch({
          codeType: CodeType.QR_CODE,
          purpose: CodePurpose.PATROL_CHECKPOINT,
          quantity: 2,
          titlePattern: 'Punto',
          clientId: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si no hay tenantId en createBatch', async () => {
      (contextService as any).tenantId = undefined;

      await expect(
        service.createBatch(
          {
            codeType: CodeType.QR_CODE,
            purpose: CodePurpose.PATROL_CHECKPOINT,
            quantity: 2,
            titlePattern: 'Punto',
          },
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('batchUpdate', () => {
    it('debe actualizar masivamente los items del lote', async () => {
      const updatedMock = [
        { ...mockUniversalCode, id: 'b-1', title: 'Cámara 1 Updated' },
      ];
      repository.batchUpdate.mockResolvedValue(updatedMock as any);

      const result = await service.batchUpdate({
        items: [
          {
            id: 'b-1',
            title: 'Cámara 1 Updated',
            metadata: { serial: 'SN-001' },
          },
        ],
      });

      expect(repository.batchUpdate).toHaveBeenCalledWith(mockTenantId, [
        {
          id: 'b-1',
          data: { title: 'Cámara 1 Updated', metadata: { serial: 'SN-001' } },
        },
      ]);
      expect(result).toHaveLength(1);
    });

    it('debe lanzar BadRequestException si no hay tenantId en batchUpdate', async () => {
      (contextService as any).tenantId = undefined;

      await expect(
        service.batchUpdate({ items: [{ id: 'b-1' }] }, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listBatches', () => {
    it('debe retornar el catálogo de lotes desde el repositorio', async () => {
      const batchesMock = [
        {
          batchId: 'LOTE-001',
          count: 20,
          purpose: CodePurpose.INVENTORY_ASSET,
          codeType: CodeType.BARCODE_128,
          department: 'Almacén',
          createdAt: new Date(),
        },
      ];
      repository.findBatches.mockResolvedValue(batchesMock as any);

      const result = await service.listBatches();
      expect(repository.findBatches).toHaveBeenCalledWith(mockTenantId);
      expect(result).toHaveLength(1);
      expect(result[0].batchId).toBe('LOTE-001');
    });

    it('debe lanzar BadRequestException si no hay tenantId en listBatches', async () => {
      (contextService as any).tenantId = undefined;

      await expect(service.listBatches(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('debe retornar estadísticas consolidadas del repositorio', async () => {
      const statsMock = {
        total: 21,
        active: 21,
        inactive: 0,
        batchesCount: 1,
      };
      repository.getStats.mockResolvedValue(statsMock);

      const result = await service.getStats();
      expect(repository.getStats).toHaveBeenCalledWith(mockTenantId);
      expect(result.total).toBe(21);
      expect(result.active).toBe(21);
      expect(result.inactive).toBe(0);
      expect(result.batchesCount).toBe(1);
    });

    it('debe lanzar BadRequestException si no hay tenantId en getStats', async () => {
      (contextService as any).tenantId = undefined;

      await expect(service.getStats(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
