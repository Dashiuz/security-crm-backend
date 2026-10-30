import { Test, TestingModule } from '@nestjs/testing';
import { PayrollNoveltiesService } from './payroll-novelties.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  LeaveAndAbsenceType,
  EpsClaimStatus,
  PayrollLoanStatus,
  PermanentConceptScope,
  NoveltyPeriodicityRule,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('PayrollNoveltiesService', () => {
  let service: PayrollNoveltiesService;
  let prisma: any;

  const mockEmployee = {
    id: 'emp-1',
    tenantId: 'tenant-1',
    basicSalary: 3000000,
    epsId: 'ent-eps-1',
    arlId: 'ent-arl-1',
  };

  const mockSettings = {
    tenantId: 'tenant-1',
    smmlv: 1750905,
    employerSickLeaveRatePct: 66.67,
    epsSickLeaveRateDays3To90Pct: 66.67,
    epsSickLeaveRateDays91To180Pct: 50.0,
  };

  const mockLeave = {
    id: 'leave-1',
    tenantId: 'tenant-1',
    employeeId: 'emp-1',
    leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-05'),
    totalDays: 5,
    employerDays: 2,
    entityDays: 3,
    claimStatus: EpsClaimStatus.PENDING_FILING,
    employerRecognizedAmount: 133340,
    entityRecognizedAmount: 200010,
    totalLiquidatedAmount: 333350,
  };

  const mockLoan = {
    id: 'loan-1',
    tenantId: 'tenant-1',
    employeeId: 'emp-1',
    conceptId: 'concept-1',
    principalAmount: 1000000,
    remainingBalance: 1000000,
    paidInstallments: 0,
    totalInstallments: 10,
    status: PayrollLoanStatus.ACTIVE,
    installments: [],
  };

  beforeEach(async () => {
    prisma = {
      payrollLeaveAndAbsence: {
        findMany: jest.fn().mockResolvedValue([mockLeave]),
        findFirst: jest.fn().mockResolvedValue(mockLeave),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'leave-1', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockLeave, ...data }),
          ),
        delete: jest.fn().mockResolvedValue(mockLeave),
      },
      payrollLoan: {
        findMany: jest.fn().mockResolvedValue([mockLoan]),
        findFirst: jest.fn().mockResolvedValue(mockLoan),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'loan-1', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockLoan, ...data }),
          ),
      },
      payrollLoanInstallment: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'inst-1', ...data }),
          ),
      },
      payrollPermanentConcept: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'perm-1' }),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'perm-1', ...data }),
          ),
        update: jest.fn().mockResolvedValue({ id: 'perm-1', isActive: false }),
      },
      payrollPeriodNovelty: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'nov-1' }),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'nov-1', ...data }),
          ),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        delete: jest.fn().mockResolvedValue({ id: 'nov-1' }),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue(mockEmployee),
      },
      payrollConcept: {
        findFirst: jest.fn().mockResolvedValue({ id: 'concept-1' }),
      },
      payrollSettings: {
        findUnique: jest.fn().mockResolvedValue(mockSettings),
      },
      payrollShiftRecord: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollNoveltiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PayrollNoveltiesService>(PayrollNoveltiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKpis', () => {
    it('should return novelties KPIs correctly', async () => {
      const kpis = await service.getKpis('tenant-1', 2026, 3);
      expect(kpis.year).toBe(2026);
      expect(kpis.month).toBe(3);
      expect(kpis.activeLeavesCount).toBe(1);
      expect(kpis.pendingClaimsCount).toBe(1);
      expect(kpis.totalPendingClaimAmount).toBe(200010);
      expect(kpis.activeLoansCount).toBe(1);
      expect(kpis.totalLoansOutstandingBalance).toBe(1000000);
    });
  });

  describe('previewLeave', () => {
    it('should calculate sick leave preview with employer and EPS split', async () => {
      const result = await service.previewLeave('tenant-1', {
        leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        employeeId: 'emp-1',
      });

      expect(result.totalDays).toBe(5);
      expect(result.employerDays).toBe(2);
      expect(result.entityDays).toBe(3);
      expect(result.claimStatus).toBe(EpsClaimStatus.PENDING_FILING);
    });
  });

  describe('createLeave', () => {
    it('should create leave and lock shift records', async () => {
      const created = await service.createLeave('tenant-1', 'user-1', {
        employeeId: 'emp-1',
        leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
        startDate: '2026-03-01',
        endDate: '2026-03-05',
      });

      expect(created).toBeDefined();
      expect(prisma.payrollLeaveAndAbsence.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createLeave('tenant-1', 'user-1', {
          employeeId: 'unknown',
          leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
          startDate: '2026-03-01',
          endDate: '2026-03-05',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('loans', () => {
    it('should create a loan successfully', async () => {
      const loan = await service.createLoan('tenant-1', 'user-1', {
        employeeId: 'emp-1',
        conceptId: 'concept-1',
        principalAmount: 500000,
        totalInstallments: 5,
        installmentAmount: 100000,
      });

      expect(loan).toBeDefined();
      expect(prisma.payrollLoan.create).toHaveBeenCalled();
    });

    it('should record installment and mark PAID_OFF when balance reaches 0', async () => {
      // Loan has 1,000,000 remaining. We pay 1,000,000
      const res = await service.recordLoanInstallment(
        'tenant-1',
        'loan-1',
        'user-1',
        {
          amount: 1000000,
        },
      );

      expect(res.installment).toBeDefined();
      expect(prisma.payrollLoanInstallment.create).toHaveBeenCalled();
      expect(prisma.payrollLoan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remainingBalance: 0,
            status: PayrollLoanStatus.PAID_OFF,
          }),
        }),
      );
    });
  });

  describe('permanent concepts', () => {
    it('should create permanent concept', async () => {
      const res = await service.createPermanentConcept('tenant-1', 'user-1', {
        scope: PermanentConceptScope.BY_EMPLOYEE,
        employeeId: 'emp-1',
        conceptId: 'concept-1',
        amount: 200000,
      });

      expect(res).toBeDefined();
      expect(prisma.payrollPermanentConcept.create).toHaveBeenCalled();
    });
  });

  describe('period novelties', () => {
    it('should bulk import period novelties', async () => {
      const res = await service.bulkImportPeriodNovelties(
        'tenant-1',
        'user-1',
        {
          novelties: [
            {
              periodId: 'per-1',
              employeeId: 'emp-1',
              conceptId: 'concept-1',
              noveltyDate: '2026-03-15',
              quantity: 4,
              totalValue: 60000,
            },
            {
              periodId: 'per-1',
              employeeId: 'emp-1',
              conceptId: 'concept-1',
              noveltyDate: '2026-03-16',
              quantity: 2,
              totalValue: 30000,
            },
          ],
        },
      );

      expect(res.importedCount).toBe(2);
    });
  });
});
