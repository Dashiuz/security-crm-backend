import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProspectService } from './prospect.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientStructureGeneratorService } from '../client/services/client-structure-generator.service';
import { ClientStatus } from '@prisma/client';

describe('ProspectService', () => {
  let service: ProspectService;
  let mockPrisma: any;
  let mockStructureGenerator: any;

  const mockUser: any = {
    sub: 'user-1',
    tenantId: 'tenant-1',
    userType: 'EMPLOYEE',
  };

  beforeEach(async () => {
    mockPrisma = {
      client: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      userClientAccess: {
        upsert: jest.fn(),
      },
    };

    mockStructureGenerator = {
      generateStructure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ClientStructureGeneratorService,
          useValue: mockStructureGenerator,
        },
      ],
    }).compile();

    service = module.get<ProspectService>(ProspectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a prospect successfully and map response', async () => {
      const dto: any = {
        name: 'Prospecto El Bosque',
        nit: '900999888-1',
      };

      const createdRecord = {
        id: 'prosp-1',
        ...dto,
        internalCode: 'PROSP-1234',
        clientStatus: ClientStatus.PROSPECT,
        tenantId: 'tenant-1',
        createdBy: { fullName: 'Admin User' },
      };

      mockPrisma.client.create.mockResolvedValue(createdRecord);
      mockPrisma.client.findFirst.mockResolvedValue(createdRecord);

      const result = await service.create(dto, mockUser);

      expect(mockPrisma.client.create).toHaveBeenCalled();
      expect(result.id).toBe('prosp-1');
      expect(result.createdBy).toBe('Admin User');
    });

    it('should invoke structureGenerator when structureConfig is provided', async () => {
      const dto: any = {
        name: 'Prospecto Con Torres',
        nit: '900999888-2',
        structureConfig: { towersAmount: 3 },
      };

      const createdRecord = {
        id: 'prosp-2',
        name: dto.name,
        nit: dto.nit,
        createdBy: 'system',
      };

      mockPrisma.client.create.mockResolvedValue(createdRecord);
      mockPrisma.client.findFirst.mockResolvedValue(createdRecord);
      mockStructureGenerator.generateStructure.mockResolvedValue({
        success: true,
      });

      const result = await service.create(dto, mockUser);

      expect(mockStructureGenerator.generateStructure).toHaveBeenCalledWith(
        'prosp-2',
        'tenant-1',
        dto.structureConfig,
        'user-1',
      );
      expect(result.id).toBe('prosp-2');
    });

    it('should throw BadRequestException if structureGenerator fails', async () => {
      const dto: any = {
        name: 'Prospecto Fallido',
        nit: '900999888-3',
        structureConfig: { towersAmount: 1 },
      };

      mockPrisma.client.create.mockResolvedValue({ id: 'prosp-3' });
      mockStructureGenerator.generateStructure.mockRejectedValue(
        new Error('Nomenclatura inválida'),
      );

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle P2002 conflict on duplicate NIT', async () => {
      const dto: any = { name: 'Duplicado NIT', nit: '900111222-1' };
      mockPrisma.client.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['nit'] },
      });

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle P2002 conflict on duplicate internalCode', async () => {
      const dto: any = { name: 'Duplicado Codigo', internalCode: 'DUP-01' };
      mockPrisma.client.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['internalCode'] },
      });

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all prospects for the tenant excluding deleted ones', async () => {
      const rows = [
        { id: 'p-1', name: 'P1', createdBy: 'Carlos' },
        { id: 'p-2', name: 'P2', createdBy: null },
      ];
      mockPrisma.client.findMany.mockResolvedValue(rows);

      const results = await service.findAll(mockUser);
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          clientStatus: ClientStatus.PROSPECT,
          deletedAt: null,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(results).toHaveLength(2);
      expect(results[1].createdBy).toBe('Sistema');
    });
  });

  describe('findOne', () => {
    it('should return prospect if found', async () => {
      const row = { id: 'p-1', name: 'P1', createdBy: { name: 'Maria' } };
      mockPrisma.client.findFirst.mockResolvedValue(row);

      const result = await service.findOne('p-1', mockUser);
      expect(result.id).toBe('p-1');
      expect(result.createdBy).toBe('Maria');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne('p-non-existent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update prospect and generate structure if requested', async () => {
      const existing = { id: 'p-1', name: 'Viejo' };
      mockPrisma.client.findFirst.mockResolvedValue(existing);
      mockPrisma.client.update.mockResolvedValue({ id: 'p-1', name: 'Nuevo' });
      mockStructureGenerator.generateStructure.mockResolvedValue({});

      const dto: any = {
        name: 'Nuevo',
        structureConfig: { towersAmount: 2 },
      };
      const result = await service.update('p-1', dto, mockUser);

      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({ name: 'Nuevo' }),
      });
      expect(mockStructureGenerator.generateStructure).toHaveBeenCalledWith(
        'p-1',
        'tenant-1',
        dto.structureConfig,
        'user-1',
      );
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should soft-delete prospect by updating isActive=false and deletedAt', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.client.update.mockResolvedValue({ id: 'p-1' });

      const result = await service.remove('p-1', mockUser);
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('convertToClient', () => {
    it('should throw BadRequestException if contract dates are invalid or missing', async () => {
      await expect(
        service.convertToClient('p-1', {} as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update clientStatus to ACTIVE and sync coordinator and commercial access', async () => {
      const dto: any = {
        contractNumber: 'CTR-2026-001',
        contractDate: '2026-01-01',
        lastContractDate: '2027-01-01',
        coordinatorInChargeId: 'coord-1',
        commercialContactId: 'comm-1',
      };

      const existing = { id: 'p-1', name: 'Convertido' };
      mockPrisma.client.findFirst.mockResolvedValue(existing);
      mockPrisma.client.update.mockResolvedValue(existing);
      mockPrisma.userClientAccess.upsert.mockResolvedValue({});

      const result = await service.convertToClient('p-1', dto, mockUser);

      expect(mockPrisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: expect.objectContaining({
            clientStatus: ClientStatus.ACTIVE,
          }),
        }),
      );
      expect(mockPrisma.userClientAccess.upsert).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });
  });
});
