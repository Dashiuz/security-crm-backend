import { Test, TestingModule } from '@nestjs/testing';
import { PayrollShiftsService } from './payroll-shifts.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShiftDayCode, DependencyAssignmentRole } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayrollShiftsService', () => {
  let service: PayrollShiftsService;
  let prisma: any;

  const mockSequence = {
    id: 'seq-1',
    tenantId: 'tenant-1',
    code: '2X2X2',
    name: 'Secuencia 2 Diurnos, 2 Nocturnos, 2 Descansos (12H)',
    patternJson: ['D', 'D', 'N', 'N', 'X', 'X'],
    cycleDaysLength: 6,
    isActive: true,
  };

  const mockAssignment = {
    id: 'assign-1',
    tenantId: 'tenant-1',
    employeeId: 'emp-1',
    dependencyId: 'dep-1',
    assignmentRole: DependencyAssignmentRole.TITULAR,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      payrollShiftSequence: {
        findMany: jest.fn().mockResolvedValue([mockSequence]),
        findFirst: jest.fn().mockResolvedValue(mockSequence),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'seq-1', ...data }),
          ),
      },
      employeeDependencyAssignment: {
        findMany: jest.fn().mockResolvedValue([mockAssignment]),
        findFirst: jest.fn().mockResolvedValue(mockAssignment),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'assign-1', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockAssignment, ...data }),
          ),
      },
      payrollDependency: {
        findFirst: jest.fn().mockResolvedValue({ id: 'dep-1' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'dep-1',
            name: 'Puesto Principal',
            code: 'PST-01',
            employeeAssignments: [mockAssignment],
          },
        ]),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'emp-1' }),
      },
      payrollShiftRecord: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'rec-1', ...data }),
          ),
        upsert: jest
          .fn()
          .mockImplementation(({ create }) =>
            Promise.resolve({ id: 'rec-1', ...create }),
          ),
      },
      payrollLeaveAndAbsence: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollShiftsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PayrollShiftsService>(PayrollShiftsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sequences', () => {
    it('should list active sequences', async () => {
      const res = await service.listSequences('tenant-1');
      expect(res).toEqual([mockSequence]);
      expect(prisma.payrollShiftSequence.findMany).toHaveBeenCalled();
    });

    it('should create a new sequence', async () => {
      const res = await service.createSequence('tenant-1', 'user-1', {
        code: '4x2',
        name: '4 Trabajo 2 Descanso',
        patternJson: ['D', 'D', 'N', 'N', 'X', 'X'],
      });
      expect(res).toBeDefined();
      expect(prisma.payrollShiftSequence.create).toHaveBeenCalled();
    });
  });

  describe('assignments', () => {
    it('should create an employee dependency assignment', async () => {
      const res = await service.createAssignment('tenant-1', 'user-1', {
        employeeId: 'emp-1',
        dependencyId: 'dep-1',
        startDate: '2026-03-01',
      });
      expect(res).toBeDefined();
      expect(prisma.employeeDependencyAssignment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createAssignment('tenant-1', 'user-1', {
          employeeId: 'unknown',
          dependencyId: 'dep-1',
          startDate: '2026-03-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('malla de turnos (grid & generation)', () => {
    it('should return grid headers and rows', async () => {
      const grid = await service.getGrid('tenant-1', {
        year: 2026,
        month: 10,
        dependencyId: 'dep-1',
      });
      expect(grid.year).toBe(2026);
      expect(grid.month).toBe(10);
      expect(grid.totalDays).toBe(31);
      expect(grid.daysHeader.length).toBe(31);
      expect(grid.rows.length).toBe(1);
    });

    it('should generate month shifts for active assignments', async () => {
      const res = await service.generateMonth('tenant-1', 'user-1', {
        year: 2026,
        month: 10,
        dependencyId: 'dep-1',
      });

      expect(res.assignmentsProcessed).toBe(1);
      expect(res.recordsUpserted).toBe(31); // 31 days projected in October
    });

    it('should create a reinforcement shift', async () => {
      const res = await service.createReinforcement('tenant-1', 'user-1', {
        employeeId: 'emp-1',
        dependencyId: 'dep-1',
        shiftDate: '2026-10-15',
        hours: 12,
      });

      expect(res).toBeDefined();
      expect(prisma.payrollShiftRecord.create).toHaveBeenCalled();
    });
  });
});
