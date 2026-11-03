import { Test, TestingModule } from '@nestjs/testing';
import { PayrollSettlementController } from './payroll-settlement.controller';
import { PayrollSettlementService } from '../services/payroll-settlement.service';
import { PayrollDisbursementType, PayrollConceptNature } from '@prisma/client';

describe('PayrollSettlementController', () => {
  let controller: PayrollSettlementController;
  let service: any;

  const mockReq = {
    user: {
      tenantId: 'tenant-1',
      sub: 'user-1',
    },
  };

  const mockRes = {
    setHeader: jest.fn(),
    send: jest.fn().mockImplementation((val) => val),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;

  beforeEach(async () => {
    service = {
      getKpis: jest
        .fn()
        .mockResolvedValue({ totalEmployees: 10, totalNetPay: 18000000 }),
      liquidatePeriod: jest
        .fn()
        .mockResolvedValue({ success: true, settledEmployeesCount: 10 }),
      exportExcelWorkbook: jest
        .fn()
        .mockResolvedValue(Buffer.from('excel-mock')),
      getPayslipsPdf: jest.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF-1.4'),
        filename: 'desprendible.pdf',
      }),
      sendPayslipsEmail: jest.fn().mockResolvedValue({ sentCount: 10 }),
      closePeriod: jest.fn().mockResolvedValue({ success: true }),
      reopenPeriod: jest.fn().mockResolvedValue({ success: true }),
      findSettlements: jest.fn().mockResolvedValue([]),
      generateAdvanceSettlement: jest.fn().mockResolvedValue({ id: 'adv-1' }),
      findAdvanceSettlement: jest.fn().mockResolvedValue({ id: 'adv-1' }),
      updateAdvanceItem: jest.fn().mockResolvedValue({ id: 'item-1' }),
      approveAdvanceSettlement: jest
        .fn()
        .mockResolvedValue({ id: 'adv-1', status: 'APPROVED' }),
      generateAchFile: jest.fn().mockResolvedValue({ fileName: 'ACH.TXT' }),
      getSettlementById: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
      manualEditSettlement: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollSettlementController],
      providers: [{ provide: PayrollSettlementService, useValue: service }],
    }).compile();

    controller = module.get<PayrollSettlementController>(
      PayrollSettlementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get KPIs', async () => {
    const res = await controller.getKpis(mockReq, 'period-1');
    expect(res.totalEmployees).toBe(10);
    expect(service.getKpis).toHaveBeenCalledWith('tenant-1', 'period-1');
  });

  it('should liquidate period', async () => {
    const res = await controller.liquidatePeriod(mockReq, 'period-1', {
      preserveManualEdits: true,
    });
    expect(res.settledEmployeesCount).toBe(10);
    expect(service.liquidatePeriod).toHaveBeenCalledWith(
      'tenant-1',
      'period-1',
      { preserveManualEdits: true },
      'user-1',
    );
  });

  it('should export Excel audit', async () => {
    await controller.exportExcel(mockReq, 'period-1', mockRes);
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('should download payslip PDF', async () => {
    await controller.downloadPayslipsPdf(
      mockReq,
      'period-1',
      'emp-1',
      'false',
      mockRes,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('should send payslips email', async () => {
    const res = await controller.sendPayslipsEmail(mockReq, 'period-1', {
      employeeIds: ['emp-1'],
    });
    expect(res.sentCount).toBe(10);
    expect(service.sendPayslipsEmail).toHaveBeenCalledWith(
      'tenant-1',
      'period-1',
      { employeeIds: ['emp-1'] },
    );
  });

  it('should close and reopen period', async () => {
    await controller.closePeriod(mockReq, 'period-1');
    expect(service.closePeriod).toHaveBeenCalledWith(
      'tenant-1',
      'period-1',
      'user-1',
    );

    await controller.reopenPeriod(mockReq, 'period-1');
    expect(service.reopenPeriod).toHaveBeenCalledWith(
      'tenant-1',
      'period-1',
      'user-1',
    );
  });

  it('should find settlements and get by id', async () => {
    await controller.findSettlements(mockReq, 'period-1', { search: 'Test' });
    expect(service.findSettlements).toHaveBeenCalledWith(
      'tenant-1',
      'period-1',
      { search: 'Test' },
    );

    await controller.getSettlementById(mockReq, 'settlement-1');
    expect(service.getSettlementById).toHaveBeenCalledWith(
      'tenant-1',
      'settlement-1',
    );
  });

  it('should handle advances lifecycle', async () => {
    await controller.generateAdvances(mockReq, { year: 2026, month: 10 });
    expect(service.generateAdvanceSettlement).toHaveBeenCalled();

    await controller.findAdvances(mockReq, 2026, 10);
    expect(service.findAdvanceSettlement).toHaveBeenCalledWith(
      'tenant-1',
      2026,
      10,
    );

    await controller.updateAdvanceItem(mockReq, 'item-1', {
      approvedAmount: 800000,
    });
    expect(service.updateAdvanceItem).toHaveBeenCalledWith(
      'tenant-1',
      'item-1',
      { approvedAmount: 800000 },
      'user-1',
    );

    await controller.approveAdvances(mockReq, 'adv-1');
    expect(service.approveAdvanceSettlement).toHaveBeenCalledWith(
      'tenant-1',
      'adv-1',
      'user-1',
    );
  });

  it('should generate ACH file', async () => {
    const dto = {
      disbursementType: PayrollDisbursementType.PAYROLL_PERIOD,
      periodId: 'period-1',
    };
    await controller.generateAch(mockReq, dto);
    expect(service.generateAchFile).toHaveBeenCalledWith(
      'tenant-1',
      dto,
      'user-1',
    );
  });

  it('should edit settlement manually', async () => {
    const dto = {
      lines: [
        {
          conceptId: 'c-1',
          nature: PayrollConceptNature.DEVENGO,
          quantity: 1,
          unitValue: 10000,
          totalValue: 10000,
        },
      ],
    };
    await controller.manualEditSettlement(mockReq, 'settlement-1', dto);
    expect(service.manualEditSettlement).toHaveBeenCalledWith(
      'tenant-1',
      'settlement-1',
      dto,
      'user-1',
    );
  });
});
