import { Test, TestingModule } from '@nestjs/testing';
import { PayrollBenefitsController } from './payroll-benefits.controller';
import { PayrollBenefitsService } from '../services/payroll-benefits.service';
import { VacationSettlementType, SocialBenefitType } from '@prisma/client';

describe('PayrollBenefitsController', () => {
  let controller: PayrollBenefitsController;
  let service: any;

  beforeEach(async () => {
    service = {
      getBenefitsKpis: jest
        .fn()
        .mockResolvedValue({ totalActiveEmployees: 10 }),
      getVacationBook: jest.fn().mockResolvedValue([]),
      simulateVacation: jest.fn().mockResolvedValue({ netPayAmount: 500000 }),
      createVacationSettlement: jest.fn().mockResolvedValue({ id: 'vac-1' }),
      approveVacationSettlement: jest
        .fn()
        .mockResolvedValue({ id: 'vac-1', status: 'APPROVED' }),
      listVacationSettlements: jest.fn().mockResolvedValue([]),
      getVacationSlipPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF')),
      generateSocialBenefitBatch: jest
        .fn()
        .mockResolvedValue({ id: 'batch-1' }),
      listSocialBenefitBatches: jest.fn().mockResolvedValue([]),
      getSocialBenefitBatch: jest
        .fn()
        .mockResolvedValue({ id: 'batch-1', items: [] }),
      updateSocialBenefitItem: jest.fn().mockResolvedValue({ id: 'item-1' }),
      approveSocialBenefitBatch: jest
        .fn()
        .mockResolvedValue({ id: 'batch-1', status: 'APPROVED' }),
      injectBenefitToPayroll: jest.fn().mockResolvedValue({ injectedCount: 5 }),
      simulateFinalLiquidation: jest
        .fn()
        .mockResolvedValue({ netPayAmount: 1200000 }),
      createFinalContractSettlement: jest
        .fn()
        .mockResolvedValue({ id: 'fin-1' }),
      approveFinalContractSettlement: jest
        .fn()
        .mockResolvedValue({ id: 'fin-1', status: 'APPROVED' }),
      listFinalContractSettlements: jest.fn().mockResolvedValue([]),
      getFinalLiquidationPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF')),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollBenefitsController],
      providers: [{ provide: PayrollBenefitsService, useValue: service }],
    }).compile();

    controller = module.get<PayrollBenefitsController>(
      PayrollBenefitsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getBenefitsKpis to service', async () => {
    const res = await controller.getBenefitsKpis({ user: { tenantId: 't-1' } });
    expect(res.totalActiveEmployees).toBe(10);
    expect(service.getBenefitsKpis).toHaveBeenCalledWith('t-1');
  });

  it('should delegate simulateVacation to service', async () => {
    const dto = {
      employeeId: 'emp-1',
      vacationType: VacationSettlementType.ENJOYED_IN_TIME,
      enjoymentStartDate: '2026-06-01',
      businessDays: 15,
    };
    const res = await controller.simulateVacation(
      { user: { tenantId: 't-1' } },
      dto,
    );
    expect(res.netPayAmount).toBe(500000);
    expect(service.simulateVacation).toHaveBeenCalledWith('t-1', dto);
  });

  it('should delegate generateBatch to service', async () => {
    const dto = {
      benefitType: SocialBenefitType.PRIMA_FIRST_SEMESTER,
      year: 2026,
      cutoffDate: '2026-05-31',
      projectionEndDate: '2026-06-30',
    };
    const res = await controller.generateBatch(
      { user: { tenantId: 't-1', sub: 'u-1' } },
      dto,
    );
    expect(res!.id).toBe('batch-1');
    expect(service.generateSocialBenefitBatch).toHaveBeenCalledWith(
      't-1',
      dto,
      'u-1',
    );
  });

  it('should delegate stream PDF in getVacationPdf', async () => {
    const resMock = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    await controller.getVacationPdf(
      { user: { tenantId: 't-1' } },
      'vac-1',
      resMock,
    );
    expect(resMock.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(resMock.end).toHaveBeenCalled();
  });
});
