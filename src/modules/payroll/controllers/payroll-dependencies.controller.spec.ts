import { Test, TestingModule } from '@nestjs/testing';
import { PayrollDependenciesController } from './payroll-dependencies.controller';
import { PayrollDependenciesService } from '../services/payroll-dependencies.service';
import { DependencySettlementType, ArlRiskClass } from '@prisma/client';

describe('PayrollDependenciesController', () => {
  let controller: PayrollDependenciesController;
  let service: any;

  const mockReq = {
    user: {
      tenantId: 'tenant-1',
      id: 'user-1',
      sub: 'user-1',
    },
  };

  beforeEach(async () => {
    service = {
      listDependencies: jest
        .fn()
        .mockResolvedValue([{ id: 'dep-1', code: 243 }]),
      getDependenciesKpis: jest.fn().mockResolvedValue({
        totalPosts: 10,
        totalGuaranteedMonthlyPayroll: 24500000.0,
      }),
      getDependencyById: jest
        .fn()
        .mockResolvedValue({ id: 'dep-1', code: 243 }),
      createDependency: jest.fn().mockResolvedValue({ id: 'dep-1', code: 243 }),
      updateDependency: jest.fn().mockResolvedValue({ id: 'dep-1', code: 243 }),
      deleteDependency: jest
        .fn()
        .mockResolvedValue({ id: 'dep-1', isActive: false }),
      syncFromServiceOrders: jest
        .fn()
        .mockResolvedValue({ syncedCount: 5, createdCount: 2 }),
      simulateBreakdown: jest.fn().mockResolvedValue({
        baseSalary: 1750905.0,
        excessDistributed: 699095.0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollDependenciesController],
      providers: [{ provide: PayrollDependenciesService, useValue: service }],
    }).compile();

    controller = module.get<PayrollDependenciesController>(
      PayrollDependenciesController,
    );
  });

  it('should list dependencies with filters', async () => {
    const res = await controller.listDependencies(
      mockReq,
      'b-1',
      'c-1',
      'false',
      'true',
      'porteria',
    );
    expect(res).toBeDefined();
    expect(service.listDependencies).toHaveBeenCalledWith('tenant-1', {
      branchId: 'b-1',
      clientId: 'c-1',
      isInternal: false,
      isActive: true,
      search: 'porteria',
    });
  });

  it('should get KPIs', async () => {
    const kpis = await controller.getKpis(mockReq);
    expect(kpis.totalPosts).toBe(10);
    expect(service.getDependenciesKpis).toHaveBeenCalledWith('tenant-1');
  });

  it('should create dependency', async () => {
    const dto = {
      code: 243,
      name: 'PORTERIA',
      branchId: 'b-1',
      monthlyPaidValue: 2450000.0,
      settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
      arlRiskClass: ArlRiskClass.RISK_IV,
    };
    const res = await controller.createDependency(mockReq, dto);
    expect(res).toBeDefined();
    expect(service.createDependency).toHaveBeenCalledWith(
      'tenant-1',
      dto,
      'user-1',
    );
  });

  it('should sync from service orders', async () => {
    const dto = { defaultBranchId: 'b-1' };
    const res = await controller.syncFromServiceOrders(mockReq, dto);
    expect(res.syncedCount).toBe(5);
    expect(service.syncFromServiceOrders).toHaveBeenCalledWith(
      'tenant-1',
      dto,
      'user-1',
    );
  });

  it('should simulate breakdown', async () => {
    const dto = {
      monthlyPaidValue: 2450000.0,
      modalityId: 'mod-1',
      daysWorked: 30,
    };
    const res = await controller.simulateBreakdown(mockReq, dto);
    expect(res.baseSalary).toBe(1750905.0);
    expect(service.simulateBreakdown).toHaveBeenCalledWith('tenant-1', dto);
  });
});
