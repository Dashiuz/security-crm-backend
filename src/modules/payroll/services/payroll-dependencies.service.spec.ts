import { Test, TestingModule } from '@nestjs/testing';
import { PayrollDependenciesService } from './payroll-dependencies.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModalityBreakdownEngine } from '../engines/modality-breakdown.engine';
import { DependencySettlementType, ArlRiskClass } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayrollDependenciesService', () => {
  let service: PayrollDependenciesService;
  let prisma: any;
  let breakdownEngine: ModalityBreakdownEngine;

  const mockDep = {
    id: 'dep-1',
    tenantId: 'tenant-1',
    code: 243,
    name: 'PORTERIA ALCALDIA',
    monthlyPaidValue: 2450000.0,
    dailyValue: 81666.67,
    settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
    arlRiskClass: ArlRiskClass.RISK_IV,
    branchId: 'b-1',
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      payrollDependency: {
        findMany: jest.fn().mockResolvedValue([mockDep]),
        findFirst: jest.fn().mockResolvedValue(mockDep),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'new-dep', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockDep, ...data }),
          ),
      },
      payrollSettings: {
        findUnique: jest.fn().mockResolvedValue({ smmlv: 1750905.0 }),
      },
      payrollShiftModality: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mod-1',
          items: [
            {
              conceptId: 'c-2',
              percentage: 100.0,
              concept: { code: 2, name: 'Recargo Nocturno' },
            },
          ],
        }),
      },
      serviceOrderPosition: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollDependenciesService,
        { provide: PrismaService, useValue: prisma },
        ModalityBreakdownEngine,
      ],
    }).compile();

    service = module.get<PayrollDependenciesService>(
      PayrollDependenciesService,
    );
    breakdownEngine = module.get<ModalityBreakdownEngine>(
      ModalityBreakdownEngine,
    );
  });

  it('should list dependencies', async () => {
    const list = await service.listDependencies('tenant-1');
    expect(list).toHaveLength(1);
    expect(prisma.payrollDependency.findMany).toHaveBeenCalled();
  });

  it('should get dependency by id or throw 404', async () => {
    const res = await service.getDependencyById('tenant-1', 'dep-1');
    expect(res).toEqual(mockDep);

    prisma.payrollDependency.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getDependencyById('tenant-1', 'invalid'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create dependency and calculate dailyValue', async () => {
    const dto = {
      code: 244,
      name: 'PUESTO 2',
      branchId: 'b-1',
      monthlyPaidValue: 2400000.0,
      settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
      arlRiskClass: ArlRiskClass.RISK_IV,
    };

    const created = await service.createDependency('tenant-1', dto, 'user-1');
    expect(created.dailyValue).toBe(80000.0);
    expect(prisma.payrollDependency.create).toHaveBeenCalled();
  });

  it('should throw BadRequestException if code is already taken', async () => {
    prisma.payrollDependency.findUnique.mockResolvedValueOnce(mockDep);
    const dto = {
      code: 243,
      name: 'DUPLICATE',
      branchId: 'b-1',
      monthlyPaidValue: 2000000.0,
      settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
      arlRiskClass: ArlRiskClass.RISK_IV,
    };

    await expect(
      service.createDependency('tenant-1', dto, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should compute dependencies KPIs', async () => {
    prisma.payrollDependency.findMany.mockResolvedValueOnce([
      { id: '1', isInternal: false, monthlyPaidValue: 2000000.0 },
      { id: '2', isInternal: true, monthlyPaidValue: 1500000.0 },
    ]);

    const kpis = await service.getDependenciesKpis('tenant-1');
    expect(kpis.totalPosts).toBe(2);
    expect(kpis.operativePosts).toBe(1);
    expect(kpis.internalPosts).toBe(1);
    expect(kpis.totalGuaranteedMonthlyPayroll).toBe(3500000.0);
  });

  it('should simulate breakdown via breakdownEngine', async () => {
    const sim = await service.simulateBreakdown('tenant-1', {
      monthlyPaidValue: 2450000.0,
      modalityId: 'mod-1',
      daysWorked: 30,
    });

    expect(sim.baseSalary).toBe(1750905.0);
    expect(sim.excessDistributed).toBe(699095.0);
    expect(sim.breakdownItems).toHaveLength(1);
  });
});
