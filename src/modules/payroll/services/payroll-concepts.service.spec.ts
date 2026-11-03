import { Test, TestingModule } from '@nestjs/testing';
import { PayrollConceptsService } from './payroll-concepts.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PayrollConceptNature,
  PayrollProportionality,
  ShiftModalityClass,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayrollConceptsService', () => {
  let service: PayrollConceptsService;
  let prisma: any;

  const mockConcept = {
    id: 'c-1',
    tenantId: 'tenant-1',
    code: 1,
    name: 'SUELDO BASICO',
    nature: PayrollConceptNature.DEVENGO,
    proportionality: PayrollProportionality.DAYS,
    isDeletableOnLiquidation: false,
    isActive: true,
  };

  const mockModality = {
    id: 'm-1',
    tenantId: 'tenant-1',
    code: 1,
    name: 'TURNO 24H',
    shiftClass: ShiftModalityClass.ROTATING,
    items: [],
  };

  beforeEach(async () => {
    prisma = {
      payrollConcept: {
        findMany: jest.fn().mockResolvedValue([mockConcept]),
        findFirst: jest.fn().mockResolvedValue(mockConcept),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-c', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockConcept, ...data }),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payrollShiftModality: {
        findMany: jest.fn().mockResolvedValue([mockModality]),
        findFirst: jest.fn().mockResolvedValue(mockModality),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-m', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockModality, ...data }),
          ),
      },
      payrollModalityItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollConceptsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PayrollConceptsService>(PayrollConceptsService);
  });

  it('should list concepts', async () => {
    const list = await service.listConcepts('tenant-1', {
      nature: PayrollConceptNature.DEVENGO,
    });
    expect(list).toHaveLength(1);
    expect(prisma.payrollConcept.findMany).toHaveBeenCalled();
  });

  it('should get concept by id or throw 404', async () => {
    const c = await service.getConceptById('tenant-1', 'c-1');
    expect(c).toEqual(mockConcept);

    prisma.payrollConcept.findFirst.mockResolvedValueOnce(null);
    await expect(service.getConceptById('tenant-1', 'invalid')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should create a concept or throw if code already exists', async () => {
    const dto = {
      code: 10,
      name: 'AUX TRANSPORTE',
      nature: PayrollConceptNature.DEVENGO,
      proportionality: PayrollProportionality.DAYS,
    };

    const created = await service.createConcept('tenant-1', dto, 'user-1');
    expect(created.code).toBe(10);

    prisma.payrollConcept.findUnique.mockResolvedValueOnce(mockConcept);
    await expect(
      service.createConcept('tenant-1', dto, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update concept base matrix in batch', async () => {
    const matrix = [
      { conceptId: 'c-1', inLiq: true, inPri: true },
      { conceptId: 'c-2', inVac: true },
    ];
    const res = await service.updateBaseMatrix('tenant-1', matrix, 'user-1');
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
  });

  it('should create shift modality with 100% item validation', async () => {
    const modalityDto = {
      code: 2,
      name: 'TURNO 12H',
      shiftClass: ShiftModalityClass.DAY_SHIFT,
      items: [
        { conceptId: 'c-1', percentage: 70.0 },
        { conceptId: 'c-2', percentage: 30.0 },
      ],
    };

    const created = await service.createModality(
      'tenant-1',
      modalityDto,
      'user-1',
    );
    expect(created).toBeDefined();

    const invalidDto = {
      ...modalityDto,
      items: [
        { conceptId: 'c-1', percentage: 60.0 },
        { conceptId: 'c-2', percentage: 20.0 },
      ],
    };
    await expect(
      service.createModality('tenant-1', invalidDto, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
