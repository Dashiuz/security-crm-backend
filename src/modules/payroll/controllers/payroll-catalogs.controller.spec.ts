import { Test, TestingModule } from '@nestjs/testing';
import { PayrollCatalogsController } from './payroll-catalogs.controller';
import { PayrollCatalogsService } from '../services/payroll-catalogs.service';
import { SocialSecurityEntityType } from '@prisma/client';

describe('PayrollCatalogsController', () => {
  let controller: PayrollCatalogsController;
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
      listEntities: jest
        .fn()
        .mockResolvedValue([{ id: 'ent-1', code: 'EPS010' }]),
      createEntity: jest
        .fn()
        .mockResolvedValue({ id: 'ent-1', code: 'EPS010' }),
      updateEntity: jest
        .fn()
        .mockResolvedValue({ id: 'ent-1', code: 'EPS010' }),
      listBanks: jest.fn().mockResolvedValue([{ id: 'b-1', code: '1007' }]),
      createBank: jest.fn().mockResolvedValue({ id: 'b-1', code: '1007' }),
      updateBank: jest.fn().mockResolvedValue({ id: 'b-1', code: '1007' }),
      listBranches: jest.fn().mockResolvedValue([{ id: 'br-1', code: 1 }]),
      listExitReasons: jest.fn().mockResolvedValue([{ id: 'ex-1', code: 1 }]),
      createExitReason: jest.fn().mockResolvedValue({ id: 'ex-1', code: 1 }),
      listHiringRequirements: jest
        .fn()
        .mockResolvedValue([{ id: 'hr-1', code: 1 }]),
      listSvspLevels: jest
        .fn()
        .mockResolvedValue([{ id: 'sv-1', code: '1101' }]),
      createSvspLevel: jest
        .fn()
        .mockResolvedValue({ id: 'sv-1', code: '1101' }),
      listPeriods: jest.fn().mockResolvedValue([{ id: 'p-1', code: 409 }]),
      createPeriod: jest.fn().mockResolvedValue({ id: 'p-1', code: 409 }),
      generateYearPeriods: jest.fn().mockResolvedValue([{ id: 'p-1' }]),
      listAcademies: jest.fn().mockResolvedValue([{ id: 'acad-1', code: 1 }]),
      createAcademy: jest.fn().mockResolvedValue({ id: 'acad-1', code: 1 }),
      updateAcademy: jest.fn().mockResolvedValue({ id: 'acad-1', code: 1 }),
      listCie10: jest.fn().mockResolvedValue([{ id: 'cie-1', code: 'J00' }]),
      createCie10: jest.fn().mockResolvedValue({ id: 'cie-1', code: 'J00' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollCatalogsController],
      providers: [{ provide: PayrollCatalogsService, useValue: service }],
    }).compile();

    controller = module.get<PayrollCatalogsController>(
      PayrollCatalogsController,
    );
  });

  it('should list entities with type filter', async () => {
    const res = await controller.listEntities(
      mockReq,
      SocialSecurityEntityType.EPS,
    );
    expect(res).toBeDefined();
    expect(service.listEntities).toHaveBeenCalledWith(
      'tenant-1',
      SocialSecurityEntityType.EPS,
    );
  });

  it('should create entity', async () => {
    const dto = {
      code: 'EPS010',
      name: 'EPS SURA',
      entityType: SocialSecurityEntityType.EPS,
      nit: '800088702',
      pluCode: 'EPS010',
    };
    const res = await controller.createEntity(mockReq, dto);
    expect(res).toBeDefined();
    expect(service.createEntity).toHaveBeenCalledWith(
      'tenant-1',
      dto,
      'user-1',
    );
  });

  it('should list and create banks', async () => {
    const list = await controller.listBanks(mockReq);
    expect(list).toBeDefined();

    const dto = { code: '1007', name: 'BANCOLOMBIA' };
    const res = await controller.createBank(mockReq, dto);
    expect(res).toBeDefined();
  });

  it('should list branches, exit reasons, hiring requirements, and svsp levels', async () => {
    expect(await controller.listBranches(mockReq)).toBeDefined();
    expect(await controller.listExitReasons(mockReq)).toBeDefined();
    expect(await controller.listHiringRequirements(mockReq)).toBeDefined();
    expect(await controller.listSvspLevels(mockReq)).toBeDefined();
    expect(await controller.listPeriods(mockReq, '2026')).toBeDefined();
    expect(await controller.listAcademies(mockReq)).toBeDefined();
    expect(
      await controller.createAcademy(mockReq, {
        code: 1,
        name: 'ASONAL',
        nit: '860012345-1',
      }),
    ).toBeDefined();
  });

  it('should list and create CIE-10 diagnosis codes', async () => {
    const list = await controller.listCie10(mockReq, 'J00');
    expect(list).toBeDefined();
    expect(service.listCie10).toHaveBeenCalledWith('tenant-1', 'J00');

    const dto = {
      code: 'J00',
      name: 'Rinofaringitis aguda (resfriado común)',
      familyCode: 'J00-J99',
    };
    const created = await controller.createCie10(mockReq, dto);
    expect(created).toBeDefined();
    expect(service.createCie10).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
  });

  it('should create individual and year periods', async () => {
    const periodDto = {
      code: 409,
      label: 'Nómina Enero 2026',
      year: 2026,
      month: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    };
    await controller.createPeriod(mockReq, periodDto);
    expect(service.createPeriod).toHaveBeenCalledWith(
      'tenant-1',
      periodDto,
      'user-1',
    );

    const yearDto = { year: 2026, baseCode: 2600 };
    await controller.generateYearPeriods(mockReq, yearDto);
    expect(service.generateYearPeriods).toHaveBeenCalledWith(
      'tenant-1',
      yearDto,
      'user-1',
    );
  });
});
