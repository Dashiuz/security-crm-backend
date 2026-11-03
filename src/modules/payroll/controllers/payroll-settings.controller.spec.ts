import { Test, TestingModule } from '@nestjs/testing';
import { PayrollSettingsController } from './payroll-settings.controller';
import { PayrollSettingsService } from '../services/payroll-settings.service';

describe('PayrollSettingsController', () => {
  let controller: PayrollSettingsController;
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
      getSettings: jest
        .fn()
        .mockResolvedValue({ id: 'set-1', smmlv: 1750905.0 }),
      updateSettings: jest
        .fn()
        .mockResolvedValue({ id: 'set-1', smmlv: 1800000.0 }),
      getHolidays: jest.fn().mockResolvedValue([{ name: 'Año Nuevo' }]),
      generateHolidaysForYear: jest
        .fn()
        .mockResolvedValue([{ name: 'Año Nuevo' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollSettingsController],
      providers: [{ provide: PayrollSettingsService, useValue: service }],
    }).compile();

    controller = module.get<PayrollSettingsController>(
      PayrollSettingsController,
    );
  });

  it('should call getSettings with tenantId', async () => {
    const res = await controller.getSettings(mockReq);
    expect(res).toBeDefined();
    expect(service.getSettings).toHaveBeenCalledWith('tenant-1');
  });

  it('should call updateSettings with dto and userId', async () => {
    const dto = { smmlv: 1800000.0 };
    const res = await controller.updateSettings(mockReq, dto);
    expect(res).toBeDefined();
    expect(service.updateSettings).toHaveBeenCalledWith(
      'tenant-1',
      dto,
      'user-1',
    );
  });

  it('should call getHolidays with optional year', async () => {
    const res = await controller.getHolidays(mockReq, '2026');
    expect(res).toBeDefined();
    expect(service.getHolidays).toHaveBeenCalledWith('tenant-1', 2026);
  });

  it('should call generateHolidays with target year', async () => {
    const res = await controller.generateHolidays(mockReq, '2026');
    expect(res).toBeDefined();
    expect(service.generateHolidaysForYear).toHaveBeenCalledWith(
      'tenant-1',
      2026,
      'user-1',
    );
  });
});
