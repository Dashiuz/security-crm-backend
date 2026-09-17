import { BadRequestException } from '@nestjs/common';
import { ResidentService } from './resident.service';
import { UserContext } from '../../../../common/interfaces/user-context.interface';

describe('ResidentService - SPEC-ADM-005 Structure Consistency', () => {
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

  beforeEach(() => {
    mockResidentRepo = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
    };
    mockPrisma = {
      client: {
        findFirst: jest.fn().mockResolvedValue({ id: 'client-1', tenantId: 'tenant-123' }),
      },
      unit: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      resident: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      fileImportLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    service = new ResidentService(mockResidentRepo, mockPrisma);
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
      service.importResidentsFromCsv('client-1', csvData, 'test.csv', mockUser),
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

    const result = await service.importResidentsFromCsv('client-1', csvData, 'test.csv', mockUser);

    expect(result.status).toBe('FAILED');
    expect(result.errorRows).toBe(1);
    expect(result.successRows).toBe(0);
    expect(result.errors[0].reason).toContain('no encontrada en la estructura del conjunto residencial');
    // Ensure unit was NOT auto-created
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
        unitName: ' torre 1 - 101 ', // with spaces & casing variation
      },
    ];

    const result = await service.importResidentsFromCsv('client-1', csvData, 'test.csv', mockUser);

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
});
