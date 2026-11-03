import { Test, TestingModule } from '@nestjs/testing';
import { PayrollNoveltiesController } from './payroll-novelties.controller';
import { PayrollNoveltiesService } from '../services/payroll-novelties.service';
import {
  LeaveAndAbsenceType,
  EpsClaimStatus,
  PayrollLoanStatus,
} from '@prisma/client';

describe('PayrollNoveltiesController', () => {
  let controller: PayrollNoveltiesController;
  let service: any;

  const mockReq = {
    user: {
      tenantId: 'tenant-1',
      sub: 'user-1',
    },
  };

  beforeEach(async () => {
    service = {
      getKpis: jest.fn().mockResolvedValue({ year: 2026, month: 10 }),
      previewLeave: jest.fn().mockResolvedValue({ totalDays: 5 }),
      listLeaves: jest.fn().mockResolvedValue([]),
      createLeave: jest.fn().mockResolvedValue({ id: 'leave-1' }),
      updateClaim: jest.fn().mockResolvedValue({ id: 'leave-1' }),
      deleteLeave: jest.fn().mockResolvedValue({ id: 'leave-1' }),
      listLoans: jest.fn().mockResolvedValue([]),
      createLoan: jest.fn().mockResolvedValue({ id: 'loan-1' }),
      updateLoanStatus: jest.fn().mockResolvedValue({ id: 'loan-1' }),
      recordLoanInstallment: jest.fn().mockResolvedValue({}),
      listPermanentConcepts: jest.fn().mockResolvedValue([]),
      createPermanentConcept: jest.fn().mockResolvedValue({ id: 'perm-1' }),
      deletePermanentConcept: jest.fn().mockResolvedValue({ id: 'perm-1' }),
      listPeriodNovelties: jest.fn().mockResolvedValue([]),
      createPeriodNovelty: jest.fn().mockResolvedValue({ id: 'nov-1' }),
      bulkImportPeriodNovelties: jest
        .fn()
        .mockResolvedValue({ importedCount: 5 }),
      deletePeriodNovelty: jest.fn().mockResolvedValue({ id: 'nov-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollNoveltiesController],
      providers: [{ provide: PayrollNoveltiesService, useValue: service }],
    }).compile();

    controller = module.get<PayrollNoveltiesController>(
      PayrollNoveltiesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getKpis to service', async () => {
    const res = await controller.getKpis(mockReq, '2026', '10');
    expect(res).toBeDefined();
    expect(service.getKpis).toHaveBeenCalledWith('tenant-1', 2026, 10);
  });

  it('should delegate previewLeave to service', async () => {
    const dto = {
      leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
      startDate: '2026-03-01',
      endDate: '2026-03-05',
    };
    await controller.previewLeave(mockReq, dto);
    expect(service.previewLeave).toHaveBeenCalledWith('tenant-1', dto);
  });

  it('should delegate createLeave to service', async () => {
    const dto = {
      employeeId: 'emp-1',
      leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
      startDate: '2026-03-01',
      endDate: '2026-03-05',
    };
    await controller.createLeave(mockReq, dto);
    expect(service.createLeave).toHaveBeenCalledWith('tenant-1', 'user-1', dto);
  });
});
