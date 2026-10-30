import { Test, TestingModule } from '@nestjs/testing';
import { PayrollCatalogsService } from './payroll-catalogs.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SocialSecurityEntityType } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayrollCatalogsService', () => {
  let service: PayrollCatalogsService;
  let prisma: any;

  const mockEntity = {
    id: 'ent-1',
    tenantId: 'tenant-1',
    code: 'EPS010',
    name: 'EPS SURA',
    entityType: SocialSecurityEntityType.EPS,
    nit: '800088702',
    pluCode: 'EPS010',
    isActive: true,
  };

  const mockBank = {
    id: 'bank-1',
    tenantId: 'tenant-1',
    code: '1007',
    name: 'BANCOLOMBIA',
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      payrollEntity: {
        findMany: jest.fn().mockResolvedValue([mockEntity]),
        findFirst: jest.fn().mockResolvedValue(mockEntity),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-ent', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockEntity, ...data }),
          ),
      },
      payrollBank: {
        findMany: jest.fn().mockResolvedValue([mockBank]),
        findFirst: jest.fn().mockResolvedValue(mockBank),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-b', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockBank, ...data }),
          ),
      },
      payrollBranch: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'br-1', code: 1, name: 'BOGOTA' }]),
      },
      payrollExitReason: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'ex-1', code: 1, name: 'Renuncia' }]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-ex', ...data }),
          ),
      },
      payrollHiringRequirement: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'req-1', code: 1, name: 'Cedula' }]),
      },
      payrollSvspLevel: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'sv-1', code: '1101', name: 'Fundamentacion' },
          ]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-sv', ...data }),
          ),
      },
      payrollPeriod: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'p-1', code: 409, year: 2026, month: 11 }]),
      },
      payrollSecurityAcademy: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'acad-1', code: 1, name: 'ASONAL', nit: '860012345-1' },
          ]),
        findFirst: jest.fn().mockResolvedValue({
          id: 'acad-1',
          code: 1,
          name: 'ASONAL',
          nit: '860012345-1',
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-acad', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'acad-1', ...data }),
          ),
      },
      payrollCie10: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cie-1',
            code: 'J00',
            name: 'Rinofaringitis aguda (resfriado común)',
            familyCode: 'J00-J99',
            isActive: true,
          },
        ]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-cie', ...data }),
          ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollCatalogsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PayrollCatalogsService>(PayrollCatalogsService);
  });

  it('should list entities with optional entityType filter', async () => {
    const list = await service.listEntities(
      'tenant-1',
      SocialSecurityEntityType.EPS,
    );
    expect(list).toHaveLength(1);
    expect(prisma.payrollEntity.findMany).toHaveBeenCalled();
  });

  it('should create an entity or throw if code exists', async () => {
    const dto = {
      code: 'EPS005',
      name: 'SANITAS',
      entityType: SocialSecurityEntityType.EPS,
      nit: '800251440',
      pluCode: 'EPS005',
    };

    const created = await service.createEntity('tenant-1', dto, 'user-1');
    expect(created.code).toBe('EPS005');

    prisma.payrollEntity.findUnique.mockResolvedValueOnce(mockEntity);
    await expect(
      service.createEntity('tenant-1', dto, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should list banks', async () => {
    const banks = await service.listBanks('tenant-1');
    expect(banks).toHaveLength(1);
  });

  it('should list branches, exit reasons, requirements and svsp levels', async () => {
    const branches = await service.listBranches('tenant-1');
    expect(branches).toHaveLength(1);

    const reasons = await service.listExitReasons('tenant-1');
    expect(reasons).toHaveLength(1);

    const reqs = await service.listHiringRequirements('tenant-1');
    expect(reqs).toHaveLength(1);

    const levels = await service.listSvspLevels('tenant-1');
    expect(levels).toHaveLength(1);

    const periods = await service.listPeriods('tenant-1', 2026);
    expect(periods).toHaveLength(1);

    const academies = await service.listAcademies('tenant-1');
    expect(academies).toHaveLength(1);

    const createdAcad = await service.createAcademy(
      'tenant-1',
      { code: 2, name: 'COLOMBO LATINA', nit: '800054321-2' },
      'user-1',
    );
    expect(createdAcad.code).toBe(2);
  });

  it('should list and create CIE-10 diagnosis codes', async () => {
    const list = await service.listCie10('tenant-1', 'resfriado');
    expect(list).toHaveLength(1);
    expect(prisma.payrollCie10.findMany).toHaveBeenCalled();

    const created = await service.createCie10(
      'tenant-1',
      {
        code: 'M545',
        name: 'Lumbago no especificado',
        familyCode: 'M00-M99',
      },
      'user-1',
    );
    expect(created.code).toBe('M545');

    prisma.payrollCie10.findUnique.mockResolvedValueOnce({ id: 'existing' });
    await expect(
      service.createCie10(
        'tenant-1',
        { code: 'M545', name: 'Lumbago no especificado' },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
