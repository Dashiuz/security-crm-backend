import { Test, TestingModule } from '@nestjs/testing';
import { PayrollSettlementService } from './payroll-settlement.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../../common/mail/mail.service';
import { PayrollLiquidationEngine } from '../engines/payroll-liquidation.engine';
import { BankAchGeneratorEngine } from '../engines/bank-ach-generator.engine';
import { PayrollPayslipPdfService } from './payroll-payslip-pdf.service';
import {
  PayrollSettlementStatus,
  PayrollPeriodStatus,
  PayrollDisbursementType,
  PayslipDeliveryStatus,
  PayrollConceptNature,
  PayrollLineOrigin,
  PayrollLoanStatus,
  EmployeeSalaryMode,
  ArlRiskClass,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayrollSettlementService', () => {
  let service: PayrollSettlementService;
  let prisma: any;
  let mailService: any;
  let liquidationEngine: any;
  let achGeneratorEngine: any;
  let payslipPdfService: any;

  const mockPeriod = {
    id: 'period-1',
    tenantId: 'tenant-1',
    code: 410,
    label: 'Nómina Mensual Octubre 2026',
    year: 2026,
    month: 10,
    periodNumber: 3,
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    status: PayrollPeriodStatus.OPEN,
  };

  const mockSettings = {
    id: 'set-1',
    tenantId: 'tenant-1',
    smmlv: 1750905,
    transportAllowance: 249095,
    uvtValue: 49799,
    monthlyDivisorHours: 230,
    weeklyWorkHours: 44,
    enforceUgpp40PctRule: true,
    applyExonerationLaw1607: true,
  };

  const mockConcept = {
    id: 'c-1',
    tenantId: 'tenant-1',
    code: 1,
    name: 'SUELDO BASICO',
    nature: PayrollConceptNature.DEVENGO,
    isActive: true,
    isConstitutiveOfSalary: true,
  };

  const mockEmployee = {
    id: 'emp-1',
    tenantId: 'tenant-1',
    documentType: 'CC',
    document: '1018456789',
    fullName: 'JUAN PEREZ GUARDA',
    email: 'juan.perez@test.com',
    entryDate: new Date('2025-01-01'),
    isActive: true,
    isRetired: false,
    payrollProfile: {
      salaryMode: EmployeeSalaryMode.CUSTOM_FIXED,
      customBaseSalary: 1800000,
      hasTransportAllowance: true,
      bankId: 'bank-1',
      bankAccountNumber: '987654321',
      bankAccountType: 'SAVINGS',
      arlRiskClass: ArlRiskClass.RISK_III,
    },
  };

  const mockSettlement = {
    id: 'settlement-1',
    tenantId: 'tenant-1',
    periodId: 'period-1',
    employeeId: 'emp-1',
    status: PayrollSettlementStatus.DRAFT,
    totalEarnings: 2000000,
    totalDeductions: 200000,
    netPayAmount: 1800000,
    totalEmployerCost: 450000,
    workedDays: 30,
    hasBankWarning: false,
    bankAccountNumber: '987654321',
    payslipEmailStatus: PayslipDeliveryStatus.NOT_SENT,
    lines: [],
    period: mockPeriod,
    employee: mockEmployee,
  };

  beforeEach(async () => {
    prisma = {
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(mockPeriod),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockPeriod, ...data }),
          ),
      },
      payrollSettings: {
        findFirst: jest.fn().mockResolvedValue(mockSettings),
        create: jest.fn().mockResolvedValue(mockSettings),
      },
      payrollConcept: {
        findMany: jest.fn().mockResolvedValue([mockConcept]),
      },
      employee: {
        findMany: jest.fn().mockResolvedValue([mockEmployee]),
      },
      payrollPeriodSettlement: {
        findMany: jest.fn().mockResolvedValue([mockSettlement]),
        findUnique: jest.fn().mockResolvedValue(mockSettlement),
        findFirst: jest.fn().mockResolvedValue(mockSettlement),
        upsert: jest.fn().mockResolvedValue(mockSettlement),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockSettlement, ...data }),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payrollSettlementLine: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      employeeDependencyAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payrollDependencyAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payrollShiftRecord: { findMany: jest.fn().mockResolvedValue([]) },
      payrollLeaveAndAbsence: { findMany: jest.fn().mockResolvedValue([]) },
      payrollPermanentConcept: { findMany: jest.fn().mockResolvedValue([]) },
      payrollPeriodNovelty: { findMany: jest.fn().mockResolvedValue([]) },
      payrollLoan: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'loan-1', remainingBalance: 500000 }),
        update: jest.fn().mockResolvedValue({ id: 'loan-1' }),
      },
      payrollLoanInstallment: {
        create: jest.fn().mockResolvedValue({ id: 'inst-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payrollAdvanceSettlement: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'adv-1',
          tenantId: 'tenant-1',
          year: 2026,
          month: 10,
          status: PayrollSettlementStatus.DRAFT,
          items: [],
        }),
        create: jest.fn().mockResolvedValue({ id: 'adv-1', items: [] }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'adv-1', totalAmount: 720000 }),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'adv-1', year: 2026, month: 10 }),
      },
      payrollAdvanceItem: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({
          id: 'adv-item-1',
          advanceSettlementId: 'adv-1',
          advanceSettlement: { status: PayrollSettlementStatus.DRAFT },
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'adv-item-1' }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'adv-item-1', approvedAmount: 720000 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payrollBankDisbursementBatch: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'batch-1', fileName: 'TEST.TXT' }),
      },
      tenantProfile: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ taxId: '900123456', legalName: 'EMPRESA TEST' }),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ name: 'EMPRESA TEST' }),
      },
    };

    mailService = {
      sendMail: jest.fn().mockResolvedValue({ id: 'mail-1' }),
    };

    liquidationEngine = {
      calculate: jest.fn().mockReturnValue({
        workedDays: 30,
        paidLeaveDays: 0,
        incapacityDays: 0,
        vacationDays: 0,
        unpaidAbsenceDays: 0,
        seventhDaysLost: 0,
        salaryModeSnapshot: EmployeeSalaryMode.CUSTOM_FIXED,
        baseSalaryMonthly: 1800000,
        basicSalaryEarned: 1800000,
        transportAllowanceAmount: 249095,
        overtimeAndSurchargesAmount: 0,
        leavesAndIncapacitiesAmount: 0,
        bonusesNonSalarialAmount: 0,
        otherEarningsAmount: 0,
        totalEarnings: 2049095,
        ugppTotalRemuneration: 1800000,
        ugppLimit40Pct: 720000,
        ugppNonSalarialTotal: 0,
        ugppExcessAmount: 0,
        ibcEps: 1800000,
        ibcAfp: 1800000,
        ibcArl: 1800000,
        ibcCcf: 1800000,
        healthEmployeeAmount: 72000,
        pensionEmployeeAmount: 72000,
        fspAmount: 0,
        withholdingTaxAmount: 0,
        loansDeductionAmount: 0,
        advanceDeductionAmount: 0,
        otherDeductionsAmount: 0,
        totalDeductions: 144000,
        netPayAmount: 1905095,
        isExoneratedLaw1607: true,
        employerHealthAmount: 0,
        employerPensionAmount: 216000,
        employerArlAmount: 43740,
        employerCcfAmount: 72000,
        employerSenaAmount: 0,
        employerIcbfAmount: 0,
        totalEmployerCost: 331740,
        lines: [
          {
            conceptId: 'c-1',
            conceptCode: 1,
            conceptName: 'SUELDO BASICO',
            nature: PayrollConceptNature.DEVENGO,
            origin: PayrollLineOrigin.DEPENDENCY_SPAN,
            quantity: 30,
            unitValue: 60000,
            totalValue: 1800000,
            isConstitutiveOfSalary: true,
            isDeletable: false,
            inIbcEpsAfp: true,
            inIbcArl: true,
            inIbcCcf: true,
            inUgpp40Pct: false,
          },
        ],
      }),
    };

    achGeneratorEngine = {
      generate: jest.fn().mockReturnValue({
        fileContent: '1018456789,1800000\n',
        fileName: 'PAB_202610.txt',
        mimeType: 'text/plain',
        totalRecords: 1,
        totalAmount: 1800000,
        skippedMissingAccountCount: 0,
        warnings: [],
      }),
    };

    payslipPdfService = {
      generatePayslipsPdf: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollSettlementService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: PayrollLiquidationEngine, useValue: liquidationEngine },
        { provide: BankAchGeneratorEngine, useValue: achGeneratorEngine },
        { provide: PayrollPayslipPdfService, useValue: payslipPdfService },
      ],
    }).compile();

    service = module.get<PayrollSettlementService>(PayrollSettlementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKpis', () => {
    it('should aggregate settlement metrics correctly', async () => {
      const kpis = await service.getKpis('tenant-1', 'period-1');
      expect(kpis.totalEmployees).toBe(1);
      expect(kpis.totalEarnings).toBe(2000000);
      expect(kpis.totalDeductions).toBe(200000);
      expect(kpis.totalNetPay).toBe(1800000);
      expect(kpis.draftCount).toBe(1);
      expect(kpis.bankWarningsCount).toBe(0);
    });
  });

  describe('liquidatePeriod', () => {
    it('should calculate liquidation for employees and upsert lines', async () => {
      const result = await service.liquidatePeriod(
        'tenant-1',
        'period-1',
        { preserveManualEdits: true },
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.settledEmployeesCount).toBe(1);
      expect(result.totalNetPay).toBe(1905095);
      expect(liquidationEngine.calculate).toHaveBeenCalled();
      expect(prisma.payrollPeriodSettlement.upsert).toHaveBeenCalled();
      expect(prisma.payrollSettlementLine.createMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if period is CLOSED', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValueOnce({
        ...mockPeriod,
        status: PayrollPeriodStatus.CLOSED,
      });

      await expect(
        service.liquidatePeriod('tenant-1', 'period-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findSettlements and getSettlementById', () => {
    it('should find settlements with query filters', async () => {
      const res = await service.findSettlements('tenant-1', 'period-1', {
        search: 'JUAN',
      });
      expect(res).toHaveLength(1);
      expect(prisma.payrollPeriodSettlement.findMany).toHaveBeenCalled();
    });

    it('should get individual settlement by id', async () => {
      const res = await service.getSettlementById('tenant-1', 'settlement-1');
      expect(res.id).toBe('settlement-1');
    });

    it('should throw NotFoundException if settlement does not exist', async () => {
      prisma.payrollPeriodSettlement.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.getSettlementById('tenant-1', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('manualEditSettlement', () => {
    it('should replace lines and recalculate net pay', async () => {
      const res = await service.manualEditSettlement(
        'tenant-1',
        'settlement-1',
        {
          notes: 'Bono especial aprobado',
          lines: [
            {
              conceptId: 'c-bono',
              nature: PayrollConceptNature.DEVENGO,
              quantity: 1,
              unitValue: 50000,
              totalValue: 50000,
            },
          ],
        },
        'user-1',
      );

      expect(prisma.payrollSettlementLine.deleteMany).toHaveBeenCalled();
      expect(prisma.payrollSettlementLine.createMany).toHaveBeenCalled();
      expect(prisma.payrollPeriodSettlement.update).toHaveBeenCalled();
      expect(res.isManuallyEdited).toBe(true);
    });
  });

  describe('closePeriod and reopenPeriod', () => {
    it('should close period, mark settlements approved and lock advances', async () => {
      const res = await service.closePeriod('tenant-1', 'period-1', 'user-1');
      expect(res.success).toBe(true);
      expect(prisma.payrollAdvanceItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDeductedInPayroll: true, updatedById: 'user-1' },
        }),
      );
      expect(prisma.payrollPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PayrollPeriodStatus.CLOSED, updatedById: 'user-1' },
        }),
      );
    });

    it('should reopen closed period and revert flags', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValueOnce({
        ...mockPeriod,
        status: PayrollPeriodStatus.CLOSED,
      });

      const res = await service.reopenPeriod('tenant-1', 'period-1', 'user-1');
      expect(res.success).toBe(true);
      expect(prisma.payrollAdvanceItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDeductedInPayroll: false, updatedById: 'user-1' },
        }),
      );
      expect(prisma.payrollPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PayrollPeriodStatus.OPEN, updatedById: 'user-1' },
        }),
      );
    });
  });

  describe('generateAdvanceSettlement and updateAdvanceItem', () => {
    it('should generate advance settlement for active employees', async () => {
      const res = await service.generateAdvanceSettlement(
        'tenant-1',
        { year: 2026, month: 10, defaultAdvancePct: 0.4 },
        'user-1',
      );
      expect(res.id).toBe('adv-1');
      expect(prisma.payrollAdvanceItem.upsert).toHaveBeenCalled();
    });

    it('should update advance item approved amount', async () => {
      const res = await service.updateAdvanceItem(
        'tenant-1',
        'adv-item-1',
        { approvedAmount: 750000, notes: 'Ajuste solicitado' },
        'user-1',
      );
      expect(res.approvedAmount).toBe(720000); // returns mocked update
      expect(prisma.payrollAdvanceItem.update).toHaveBeenCalled();
    });
  });

  describe('generateAchFile', () => {
    it('should generate ACH file for payroll period', async () => {
      const res = await service.generateAchFile(
        'tenant-1',
        {
          disbursementType: PayrollDisbursementType.PAYROLL_PERIOD,
          periodId: 'period-1',
          exportFormat: 'PAB_BANCOLOMBIA',
        },
        'user-1',
      );

      expect(res.fileName).toBe('PAB_202610.txt');
      expect(achGeneratorEngine.generate).toHaveBeenCalled();
      expect(prisma.payrollBankDisbursementBatch.create).toHaveBeenCalled();
    });
  });

  describe('getPayslipsPdf and sendPayslipsEmail', () => {
    it('should generate payslip PDF buffer and filename', async () => {
      const res = await service.getPayslipsPdf('tenant-1', 'period-1', 'emp-1');
      expect(res.buffer).toBeDefined();
      expect(res.filename).toContain('1018456789');
      expect(payslipPdfService.generatePayslipsPdf).toHaveBeenCalled();
    });

    it('should send payslip email with attachment via MailService', async () => {
      const res = await service.sendPayslipsEmail('tenant-1', 'period-1', {
        employeeIds: ['emp-1'],
      });

      expect(res.sentCount).toBe(1);
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'juan.perez@test.com',
          attachments: expect.arrayContaining([
            expect.objectContaining({ contentType: 'application/pdf' }),
          ]),
        }),
      );
    });
  });
});
