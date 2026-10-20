import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ResidentService } from './resident.service';
import { UserContext } from '../../../../common/interfaces/user-context.interface';
import { ResidentType, IdType } from '@prisma/client';

describe('ResidentService', () => {
  let service: ResidentService;
  let mockResidentRepo: any;
  let mockPrisma: any;

  const mockUser: UserContext = {
    sub: 'user-123',
    tenantId: 'tenant-123',
    roles: ['ADMIN'],
    permissions: ['resident:create', 'resident:manage'],
    userType: 'TENANT_ADMIN',
  };

  const mockResidenceManager: UserContext = {
    sub: 'manager-123',
    tenantId: 'tenant-123',
    roles: ['RESIDENCE_MANAGER'],
    permissions: ['resident:create', 'resident:manage'],
    userType: 'RESIDENCE_MANAGER',
    clientId: 'client-1',
  };

  beforeEach(() => {
    mockResidentRepo = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    mockPrisma = {
      client: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'client-1', tenantId: 'tenant-123' }),
      },
      unit: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      resident: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      fileImportLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    service = new ResidentService(mockResidentRepo, mockPrisma);
  });

  describe('create', () => {
    it('should create a resident successfully', async () => {
      const dto = {
        clientId: 'client-1',
        unitId: 'unit-1',
        residentType: ResidentType.OWNER,
        firstName: 'Juan',
        lastName: 'Perez',
        document: '12345678',
        phoneNumber: '3001234567',
        email: 'juan@example.com',
        birthdate: '1990-01-01',
      };

      mockPrisma.resident.findFirst.mockResolvedValue(null);
      mockResidentRepo.create.mockResolvedValue({ id: 'res-1' });
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        ...dto,
        createdBy: { fullName: 'Admin User' },
        unit: { tower: { towerName: 'Torre A' }, floor: { floorNumber: 1 } },
      });

      const result = await service.create(dto as any, mockUser);
      expect(mockResidentRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('res-1');
      expect((result as any).createdBy).toBe('Admin User');
    });

    it('should throw BadRequestException if unit already has an OWNER', async () => {
      const dto = {
        clientId: 'client-1',
        unitId: 'unit-1',
        residentType: ResidentType.OWNER,
        firstName: 'Juan',
        lastName: 'Perez',
        document: '12345678',
        phoneNumber: '3001234567',
      };

      mockPrisma.resident.findFirst.mockResolvedValue({
        id: 'res-existing-owner',
      });

      await expect(service.create(dto as any, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for RESIDENCE_MANAGER without clientId', async () => {
      const managerWithoutClient: UserContext = {
        ...mockResidenceManager,
        clientId: undefined,
      };

      const dto = {
        clientId: 'client-1',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
        firstName: 'Juan',
        lastName: 'Perez',
        document: '12345678',
        phoneNumber: '3001234567',
      };

      await expect(
        service.create(dto as any, managerWithoutClient),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce RESIDENCE_MANAGER assigned clientId', async () => {
      const dto = {
        clientId: 'another-client',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
        firstName: 'Juan',
        lastName: 'Perez',
        document: '12345678',
        phoneNumber: '3001234567',
      };

      mockResidentRepo.create.mockResolvedValue({ id: 'res-1' });
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        ...dto,
        clientId: 'client-1',
        createdBy: 'manager',
      });

      await service.create(dto as any, mockResidenceManager);
      expect(mockResidentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          client: { connect: { id: 'client-1' } },
        }),
      );
    });

    it('should throw ConflictException on P2002 duplicate document error', async () => {
      const dto = {
        clientId: 'client-1',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
        firstName: 'Juan',
        lastName: 'Perez',
        document: '12345678',
        phoneNumber: '3001234567',
      };

      mockResidentRepo.create.mockRejectedValue({
        code: 'P2002',
        message: 'Unique violation',
      });

      await expect(service.create(dto as any, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rethrow unexpected errors on creation', async () => {
      const dto = {
        clientId: 'client-1',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
        firstName: 'Juan',
        lastName: 'Perez',
        document: '12345678',
        phoneNumber: '3001234567',
      };

      mockResidentRepo.create.mockRejectedValue(new Error('DB crash'));

      await expect(service.create(dto as any, mockUser)).rejects.toThrow(
        'DB crash',
      );
    });
  });

  describe('findByClient', () => {
    it('should return residents for the client mapped to response DTOs', async () => {
      mockResidentRepo.findMany.mockResolvedValue([
        {
          id: 'res-1',
          firstName: 'Juan',
          createdBy: { name: 'Admin' },
        },
      ]);

      const result = await service.findByClient('client-1', mockUser);
      expect(result).toHaveLength(1);
      expect((result[0] as any).createdBy).toBe('Admin');
    });

    it('should return empty list if RESIDENCE_MANAGER queries another client', async () => {
      const result = await service.findByClient(
        'client-2',
        mockResidenceManager,
      );
      expect(result).toEqual([]);
      expect(mockResidentRepo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('autocomplete', () => {
    it('should search residents with trimmed query and limit', async () => {
      mockPrisma.resident.findMany.mockResolvedValue([
        { id: 'res-1', firstName: 'Juan', lastName: 'Perez', createdBy: null },
      ]);

      const result = await service.autocomplete(
        'client-1',
        'Juan',
        'unit-1',
        mockUser,
        10,
      );
      expect(mockPrisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          where: expect.objectContaining({
            tenantId: 'tenant-123',
            clientId: 'client-1',
            unitId: 'unit-1',
            OR: expect.any(Array),
          }),
        }),
      );
      expect((result[0] as any).createdBy).toBe('Sistema');
    });

    it('should handle autocomplete with empty query', async () => {
      mockPrisma.resident.findMany.mockResolvedValue([]);

      const result = await service.autocomplete(
        'client-1',
        '',
        undefined,
        mockUser,
      );
      expect(mockPrisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 15,
          where: expect.not.objectContaining({ OR: expect.anything() }),
        }),
      );
      expect(result).toEqual([]);
    });

    it('should enforce manager clientId in autocomplete', async () => {
      mockPrisma.resident.findMany.mockResolvedValue([]);

      await service.autocomplete(
        'another-client',
        'query',
        undefined,
        mockResidenceManager,
      );
      expect(mockPrisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'client-1',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return resident when found and tenant matches', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        clientId: 'client-1',
        firstName: 'Juan',
        createdBy: { email: 'admin@crm.com' },
      });

      const result = await service.findOne('res-1', mockUser);
      expect(result.id).toBe('res-1');
      expect((result as any).createdBy).toBe('admin@crm.com');
    });

    it('should throw NotFoundException if resident not found', async () => {
      mockResidentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('res-999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if tenant mismatch', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'another-tenant',
      });

      await expect(service.findOne('res-1', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if resident is soft-deleted', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        deletedAt: new Date(),
      });

      await expect(service.findOne('res-1', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for RESIDENCE_MANAGER out of client scope', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        clientId: 'client-2', // Different from manager's client-1
        deletedAt: null,
      });

      await expect(
        service.findOne('res-1', mockResidenceManager),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update resident successfully', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        clientId: 'client-1',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
        firstName: 'Juan',
        document: '12345678',
        createdBy: 'Sistema',
      });

      mockResidentRepo.update.mockResolvedValue({ id: 'res-1' });

      const result = await service.update(
        'res-1',
        { firstName: 'Juan Carlos', phoneNumber: '3009999999' },
        mockUser,
      );

      expect(mockResidentRepo.update).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({
          firstName: 'Juan Carlos',
          phoneNumber: '3009999999',
          updatedBy: { connect: { id: mockUser.sub } },
        }),
      );
      expect(result.id).toBe('res-1');
    });

    it('should throw BadRequestException if update targets OWNER and unit already has an OWNER', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
      });

      mockPrisma.resident.findFirst.mockResolvedValue({ id: 'res-2-owner' });

      await expect(
        service.update('res-1', { residentType: ResidentType.OWNER }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on P2002 error during update', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
      });

      mockResidentRepo.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.update('res-1', { document: '12345678' }, mockUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should rethrow unexpected errors during update', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        unitId: 'unit-1',
        residentType: ResidentType.TENANT,
      });

      mockResidentRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.update('res-1', { document: '12345678' }, mockUser),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should soft delete resident', async () => {
      mockResidentRepo.findOne.mockResolvedValue({
        id: 'res-1',
        tenantId: 'tenant-123',
        clientId: 'client-1',
      });
      mockResidentRepo.softDelete.mockResolvedValue({ id: 'res-1' });

      const result = await service.remove('res-1', mockUser);
      expect(mockResidentRepo.softDelete).toHaveBeenCalledWith(
        'res-1',
        mockUser.sub,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('importResidentsFromCsv', () => {
    it('should throw BadRequestException if RESIDENCE_MANAGER imports to another client', async () => {
      await expect(
        service.importResidentsFromCsv(
          'client-999',
          [],
          'test.csv',
          mockResidenceManager,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if client does not exist', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.importResidentsFromCsv('client-999', [], 'test.csv', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if client has no physical structure / 0 units', async () => {
      mockPrisma.unit.findMany.mockResolvedValue([]);

      const csvData = [
        {
          firstName: 'Juan',
          lastName: 'Perez',
          document: '12345678',
          phoneNumber: '3001234567',
          unitName: 'Torre 1 - 101',
        },
      ];

      await expect(
        service.importResidentsFromCsv(
          'client-1',
          csvData,
          'test.csv',
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail row import when unit name is not found in pre-existing structure (strict mode)', async () => {
      mockPrisma.unit.findMany.mockResolvedValue([
        { id: 'unit-101', unitName: 'Torre 1 - 101' },
      ]);

      const csvData = [
        {
          firstName: 'Juan',
          lastName: 'Perez',
          document: '12345678',
          phoneNumber: '3001234567',
          unitName: 'Torre 1 - 999', // Non-existent unit
        },
      ];

      const result = await service.importResidentsFromCsv(
        'client-1',
        csvData,
        'test.csv',
        mockUser,
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorRows).toBe(1);
      expect(result.successRows).toBe(0);
      expect(result.errors[0].reason).toContain(
        'no encontrada en la estructura del conjunto residencial',
      );
      expect(mockPrisma.unit.create).not.toHaveBeenCalled();
    });

    it('should successfully match existing unit and create resident', async () => {
      mockPrisma.unit.findMany.mockResolvedValue([
        { id: 'unit-101', unitName: 'Torre 1 - 101' },
      ]);
      mockPrisma.resident.create.mockResolvedValue({
        id: 'res-1',
        firstName: 'Juan',
        lastName: 'Perez',
        unitId: 'unit-101',
      });

      const csvData = [
        {
          firstName: 'Juan',
          lastName: 'Perez',
          document: '12345678',
          phoneNumber: '3001234567',
          unitName: ' torre 1 - 101 ',
        },
      ];

      const result = await service.importResidentsFromCsv(
        'client-1',
        csvData,
        'test.csv',
        mockUser,
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.successRows).toBe(1);
      expect(result.errorRows).toBe(0);
      expect(mockPrisma.resident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitId: 'unit-101',
            document: '12345678',
          }),
        }),
      );
    });

    it('should handle duplicate document during row import as error row', async () => {
      mockPrisma.unit.findMany.mockResolvedValue([
        { id: 'unit-101', unitName: '101' },
      ]);
      mockPrisma.resident.findFirst.mockResolvedValue({ id: 'res-existing' });

      const csvData = [
        {
          firstName: 'Juan',
          lastName: 'Perez',
          document: '12345678',
          phoneNumber: '3001234567',
          unitName: '101',
          residentType: 'TENANT',
        },
      ];

      const result = await service.importResidentsFromCsv(
        'client-1',
        csvData,
        'test.csv',
        mockUser,
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorRows).toBe(1);
      expect(result.errors[0].reason).toContain('Ya existe un residente');
    });

    it('should validate missing required fields in CSV rows', async () => {
      mockPrisma.unit.findMany.mockResolvedValue([
        { id: 'unit-101', unitName: '101' },
      ]);

      const csvData = [
        {
          firstName: '',
          lastName: 'Perez',
          document: '',
          unitName: '',
        },
      ];

      const result = await service.importResidentsFromCsv(
        'client-1',
        csvData,
        'test.csv',
        mockUser,
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorRows).toBe(1);
      expect(result.errors[0].reason).toContain(
        'Campos obligatorios faltantes',
      );
    });
  });
});
