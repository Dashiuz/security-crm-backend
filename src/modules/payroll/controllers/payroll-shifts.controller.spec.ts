import { Test, TestingModule } from '@nestjs/testing';
import { PayrollShiftsController } from './payroll-shifts.controller';
import { PayrollShiftsService } from '../services/payroll-shifts.service';
import { ShiftDayCode } from '@prisma/client';

describe('PayrollShiftsController', () => {
  let controller: PayrollShiftsController;
  let service: any;

  const mockReq = {
    user: {
      tenantId: 'tenant-1',
      sub: 'user-1',
    },
  };

  beforeEach(async () => {
    service = {
      listSequences: jest.fn().mockResolvedValue([]),
      createSequence: jest.fn().mockResolvedValue({ id: 'seq-1' }),
      listAssignments: jest.fn().mockResolvedValue([]),
      createAssignment: jest.fn().mockResolvedValue({ id: 'assign-1' }),
      updateAssignment: jest.fn().mockResolvedValue({ id: 'assign-1' }),
      getGrid: jest.fn().mockResolvedValue({ rows: [] }),
      generateMonth: jest.fn().mockResolvedValue({ assignmentsProcessed: 1 }),
      bulkUpdateRecords: jest.fn().mockResolvedValue({ updatedCount: 2 }),
      createReinforcement: jest.fn().mockResolvedValue({ id: 'reinf-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollShiftsController],
      providers: [{ provide: PayrollShiftsService, useValue: service }],
    }).compile();

    controller = module.get<PayrollShiftsController>(PayrollShiftsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate listSequences to service', async () => {
    await controller.listSequences(mockReq);
    expect(service.listSequences).toHaveBeenCalledWith('tenant-1');
  });

  it('should delegate getGrid to service', async () => {
    await controller.getGrid(mockReq, '2026', '10', 'dep-1');
    expect(service.getGrid).toHaveBeenCalledWith('tenant-1', {
      year: 2026,
      month: 10,
      dependencyId: 'dep-1',
      branchId: undefined,
    });
  });

  it('should delegate generateMonth to service', async () => {
    const dto = { year: 2026, month: 10, dependencyId: 'dep-1' };
    await controller.generateMonth(mockReq, dto);
    expect(service.generateMonth).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      dto,
    );
  });
});
