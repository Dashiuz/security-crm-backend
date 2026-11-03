import { Test, TestingModule } from '@nestjs/testing';
import { PayrollSettingsService } from './payroll-settings.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ColombianHolidayEngine } from '../engines/colombian-holiday.engine';

describe('PayrollSettingsService', () => {
  let service: PayrollSettingsService;
  let prisma: any;
  let holidayEngine: ColombianHolidayEngine;

  const mockSettings = {
    id: 'set-1',
    tenantId: 'tenant-1',
    smmlv: 1750905.0,
    transportAllowance: 249095.0,
    activeYear: 2026,
  };

  beforeEach(async () => {
    prisma = {
      payrollSettings: {
        findUnique: jest.fn().mockResolvedValue(mockSettings),
        create: jest.fn().mockResolvedValue(mockSettings),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...mockSettings, ...data }),
          ),
      },
      payrollHoliday: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest
          .fn()
          .mockImplementation(({ create }) => Promise.resolve(create)),
      },
      employeePayrollProfile: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      payrollDependency: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      employeeSalaryHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollSettingsService,
        { provide: PrismaService, useValue: prisma },
        ColombianHolidayEngine,
      ],
    }).compile();

    service = module.get<PayrollSettingsService>(PayrollSettingsService);
    holidayEngine = module.get<ColombianHolidayEngine>(ColombianHolidayEngine);
  });

  it('should get existing payroll settings', async () => {
    const result = await service.getSettings('tenant-1');
    expect(result).toEqual(mockSettings);
    expect(prisma.payrollSettings.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
    });
  });

  it('should auto-create settings if not found', async () => {
    prisma.payrollSettings.findUnique.mockResolvedValueOnce(null);
    const result = await service.getSettings('tenant-1');
    expect(prisma.payrollSettings.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1' },
    });
    expect(result).toEqual(mockSettings);
  });

  it('should update payroll settings', async () => {
    const updateDto = { smmlv: 1800000.0, activeYear: 2027 };
    const result = await service.updateSettings(
      'tenant-1',
      updateDto,
      'user-1',
    );
    expect(result.smmlv).toBe(1800000.0);
    expect(prisma.payrollSettings.update).toHaveBeenCalled();
  });

  it('should generate holidays for a given year using ColombianHolidayEngine', async () => {
    const result = await service.generateHolidaysForYear(
      'tenant-1',
      2026,
      'user-1',
    );
    expect(result).toHaveLength(18);
    expect(prisma.payrollHoliday.upsert).toHaveBeenCalledTimes(18);
  });
});
