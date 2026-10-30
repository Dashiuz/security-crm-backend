import { Test, TestingModule } from '@nestjs/testing';
import { PayrollBenefitsService } from './payroll-benefits.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PayrollBenefitsPdfService } from './payroll-benefits-pdf.service';
import {
  VacationSettlementType,
  SocialBenefitType,
  PayrollSettlementStatus,
} from '@prisma/client';

describe('PayrollBenefitsService', () => {
  let service: PayrollBenefitsService;
  let prisma: any;
  let pdfService: any;

  beforeEach(async () => {
    prisma = {
      employee: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      employeePayrollProfile: {
        update: jest.fn(),
      },
      payrollSettings: {
        findUnique: jest.fn(),
      },
      payrollHoliday: {
        findMany: jest.fn(),
      },
      payrollSettlementLine: {
        findMany: jest.fn(),
      },
      payrollVacationSettlement: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      payrollLeaveAndAbsence: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      payrollShiftRecord: {
        upsert: jest.fn(),
      },
      payrollSocialBenefitBatch: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      payrollSocialBenefitItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      payrollPeriod: {
        findFirst: jest.fn(),
      },
      payrollPeriodNovelty: {
        create: jest.fn(),
      },
      payrollConcept: {
        findFirst: jest.fn(),
      },
      payrollExitReason: {
        findFirst: jest.fn(),
      },
      payrollLoan: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      payrollFinalContractSettlement: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      employeeDependencyAssignment: {
        updateMany: jest.fn(),
      },
    };

    pdfService = {
      generateVacationSlipPdf: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-vacation')),
      generateFinalLiquidationPdf: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-final')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollBenefitsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PayrollBenefitsPdfService, useValue: pdfService },
      ],
    }).compile();

    service = module.get<PayrollBenefitsService>(PayrollBenefitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBenefitsKpis', () => {
    it('should return aggregated KPIs for active employees, batches and liquidations', async () => {
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          entryDate: new Date('2024-01-01'),
          payrollProfile: { customBaseSalary: 1500000 },
          vacationSettlements: [{ businessDays: 15 }],
        },
      ]);
      prisma.payrollSocialBenefitBatch.findFirst
        .mockResolvedValueOnce({
          label: 'Prima 1er Semestre 2026',
          status: 'DRAFT',
          totalBenefitAmount: 1500000,
          totalEmployees: 1,
        })
        .mockResolvedValueOnce(null);
      prisma.payrollFinalContractSettlement.count.mockResolvedValue(2);

      const res = await service.getBenefitsKpis('tenant-1');
      expect(res.totalActiveEmployees).toBe(1);
      expect(res.finalSettlementsCountThisYear).toBe(2);
      expect(res.latestPrimaBatch?.label).toBe('Prima 1er Semestre 2026');
    });
  });

  describe('simulateVacation', () => {
    it('should calculate vacation schedule and financial breakdown', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-1',
        document: '12345',
        firstName: 'Juan',
        lastName: 'Perez',
        payrollProfile: { customBaseSalary: 1500000 },
      });
      prisma.payrollSettings.findUnique.mockResolvedValue({
        saturdayIsWorkingDay: false,
      });
      prisma.payrollHoliday.findMany.mockResolvedValue([]);
      prisma.payrollSettlementLine.findMany.mockResolvedValue([]);

      const res = await service.simulateVacation('tenant-1', {
        employeeId: 'emp-1',
        vacationType: VacationSettlementType.ENJOYED_IN_TIME,
        enjoymentStartDate: '2026-06-01',
        businessDays: 15,
      });

      expect(res.employee.id).toBe('emp-1');
      expect(res.businessDays).toBe(15);
      expect(res.totalVacationBase).toBe(1500000);
      expect(res.netPayAmount).toBeGreaterThan(0);
    });
  });

  describe('approveVacationSettlement', () => {
    it('should approve vacation and execute 3-in-1 synchronization', async () => {
      prisma.payrollVacationSettlement.findFirst.mockResolvedValue({
        id: 'vac-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        employee: {
          id: 'emp-1',
          payrollProfile: { primaryDependencyId: 'dep-1' },
        },
        vacationType: VacationSettlementType.ENJOYED_IN_TIME,
        status: PayrollSettlementStatus.DRAFT,
        enjoymentStartDate: new Date('2026-06-01'),
        enjoymentEndDate: new Date('2026-06-19'),
        calendarDaysPaid: 19,
        businessDays: 15,
        grossVacationAmount: 800000,
      });

      prisma.payrollLeaveAndAbsence.create.mockResolvedValue({ id: 'leave-1' });
      prisma.payrollConcept.findFirst.mockResolvedValue({
        id: 'concept-vac',
        code: 23,
      });
      prisma.payrollShiftRecord.upsert.mockResolvedValue({});
      prisma.payrollVacationSettlement.update.mockResolvedValue({
        id: 'vac-1',
        status: PayrollSettlementStatus.APPROVED,
        linkedLeaveId: 'leave-1',
      });

      const res = await service.approveVacationSettlement('tenant-1', 'vac-1');
      expect(res.status).toBe(PayrollSettlementStatus.APPROVED);
      expect(prisma.payrollLeaveAndAbsence.create).toHaveBeenCalled();
      expect(prisma.payrollShiftRecord.upsert).toHaveBeenCalled();
    });
  });

  describe('generateSocialBenefitBatch', () => {
    it('should generate social benefit batch for active employees', async () => {
      prisma.payrollSettings.findUnique.mockResolvedValue({
        smmlv: 1423500,
        transportAllowance: 200000,
      });
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          entryDate: new Date('2025-01-01'),
          payrollProfile: {
            customBaseSalary: 1500000,
            primaryDependencyId: 'dep-1',
            cesantiasEntityId: 'ces-1',
            bankId: 'bank-1',
            bankAccountNumber: '987654321',
          },
        },
      ]);
      prisma.payrollSettlementLine.findMany.mockResolvedValue([]);
      prisma.payrollLeaveAndAbsence.findMany.mockResolvedValue([]);
      prisma.payrollSocialBenefitBatch.upsert.mockResolvedValue({
        id: 'batch-1',
        totalEmployees: 1,
      });
      prisma.payrollSocialBenefitItem.deleteMany.mockResolvedValue({});
      prisma.payrollSocialBenefitItem.createMany.mockResolvedValue({});
      prisma.payrollSocialBenefitBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        totalEmployees: 1,
        items: [],
      });

      const res = await service.generateSocialBenefitBatch('tenant-1', {
        benefitType: SocialBenefitType.PRIMA_FIRST_SEMESTER,
        year: 2026,
        cutoffDate: '2026-05-31',
        projectionEndDate: '2026-06-30',
      });

      expect(res!.id).toBe('batch-1');
      expect(prisma.payrollSocialBenefitItem.createMany).toHaveBeenCalled();
    });
  });

  describe('approveFinalContractSettlement', () => {
    it('should retire employee, close dependencies and pay off loans', async () => {
      prisma.payrollFinalContractSettlement.findFirst.mockResolvedValue({
        id: 'fin-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        exitReasonId: 'exit-1',
        retirementDate: new Date('2026-06-30'),
        blockForRehireBdn: true,
        loansDeductedAmount: 200000,
        status: PayrollSettlementStatus.DRAFT,
      });

      prisma.employee.update.mockResolvedValue({});
      prisma.employeeDependencyAssignment.updateMany.mockResolvedValue({});
      prisma.payrollLoan.updateMany.mockResolvedValue({});
      prisma.payrollFinalContractSettlement.update.mockResolvedValue({
        id: 'fin-1',
        status: PayrollSettlementStatus.APPROVED,
      });

      const res = await service.approveFinalContractSettlement(
        'tenant-1',
        'fin-1',
      );
      expect(res.status).toBe(PayrollSettlementStatus.APPROVED);
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
            isRetired: true,
          }),
        }),
      );
      expect(prisma.employeePayrollProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { employeeId: 'emp-1' },
          data: expect.objectContaining({
            isBlockedForRehire: true,
          }),
        }),
      );
      expect(prisma.payrollLoan.updateMany).toHaveBeenCalled();
    });
  });
});
