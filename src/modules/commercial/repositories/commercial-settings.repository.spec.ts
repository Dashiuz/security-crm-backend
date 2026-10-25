import { CommercialSettingsRepository } from './commercial-settings.repository';
import { ShiftScheduleType, InternalDepartment } from '@prisma/client';

describe('CommercialSettingsRepository', () => {
  let repository: CommercialSettingsRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      commercialSettings: {
        findFirst: jest.fn().mockResolvedValue({ id: 'set-1' }),
        create: jest.fn().mockResolvedValue({ id: 'set-1' }),
        update: jest.fn().mockResolvedValue({ id: 'set-1' }),
      },
      tariffPeriodConfig: {
        findMany: jest.fn().mockResolvedValue([{ id: 'tp-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'tp-1' }),
        create: jest.fn().mockResolvedValue({ id: 'tp-1' }),
        update: jest.fn().mockResolvedValue({ id: 'tp-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'tp-1' }),
      },
      securityServiceCatalog: {
        findMany: jest.fn().mockResolvedValue([{ id: 'sc-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'sc-1' }),
        create: jest.fn().mockResolvedValue({ id: 'sc-1' }),
        update: jest.fn().mockResolvedValue({ id: 'sc-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'sc-1' }),
      },
      positionSalaryMatrix: {
        findMany: jest.fn().mockResolvedValue([{ id: 'sm-1' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'sm-1' }),
        upsert: jest.fn().mockResolvedValue({ id: 'sm-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'sm-1' }),
      },
      valueAddedCatalogItem: {
        findMany: jest.fn().mockResolvedValue([{ id: 'va-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'va-1' }),
        create: jest.fn().mockResolvedValue({ id: 'va-1' }),
        update: jest.fn().mockResolvedValue({ id: 'va-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'va-1' }),
      },
      serviceOrderDistributionRecipient: {
        findMany: jest.fn().mockResolvedValue([{ id: 'dist-1' }]),
        upsert: jest.fn().mockResolvedValue({ id: 'dist-1' }),
      },
    };

    repository = new CommercialSettingsRepository(mockPrisma);
  });

  describe('CommercialSettings CRUD', () => {
    it('findByTenantId debe llamar a findFirst', async () => {
      const res = await repository.findByTenantId('ten-1');
      expect(mockPrisma.commercialSettings.findFirst).toHaveBeenCalled();
      expect(res?.id).toBe('set-1');
    });

    it('createSettings debe llamar a create', async () => {
      const res = await repository.createSettings({} as any);
      expect(mockPrisma.commercialSettings.create).toHaveBeenCalled();
      expect(res.id).toBe('set-1');
    });

    it('updateSettings debe llamar a update', async () => {
      const res = await repository.updateSettings('set-1', {} as any);
      expect(mockPrisma.commercialSettings.update).toHaveBeenCalled();
      expect(res.id).toBe('set-1');
    });
  });

  describe('TariffPeriod CRUD', () => {
    it('findTariffPeriods debe llamar a findMany', async () => {
      const res = await repository.findTariffPeriods('ten-1');
      expect(mockPrisma.tariffPeriodConfig.findMany).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('findTariffPeriodById debe llamar a findFirst', async () => {
      const res = await repository.findTariffPeriodById('tp-1', 'ten-1');
      expect(mockPrisma.tariffPeriodConfig.findFirst).toHaveBeenCalled();
      expect(res?.id).toBe('tp-1');
    });

    it('createTariffPeriod debe llamar a create', async () => {
      const res = await repository.createTariffPeriod({} as any);
      expect(mockPrisma.tariffPeriodConfig.create).toHaveBeenCalled();
      expect(res.id).toBe('tp-1');
    });

    it('updateTariffPeriod debe llamar a update', async () => {
      const res = await repository.updateTariffPeriod('tp-1', {} as any);
      expect(mockPrisma.tariffPeriodConfig.update).toHaveBeenCalled();
      expect(res.id).toBe('tp-1');
    });

    it('deleteTariffPeriod debe llamar a delete', async () => {
      const res = await repository.deleteTariffPeriod('tp-1');
      expect(mockPrisma.tariffPeriodConfig.delete).toHaveBeenCalled();
      expect(res.id).toBe('tp-1');
    });
  });

  describe('ServiceCatalog CRUD', () => {
    it('findServiceCatalog debe llamar a findMany', async () => {
      const res = await repository.findServiceCatalog('ten-1');
      expect(mockPrisma.securityServiceCatalog.findMany).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('findServiceCatalogItemById debe llamar a findFirst', async () => {
      const res = await repository.findServiceCatalogItemById('sc-1', 'ten-1');
      expect(mockPrisma.securityServiceCatalog.findFirst).toHaveBeenCalled();
      expect(res?.id).toBe('sc-1');
    });

    it('findServiceCatalogItemByCode debe llamar a findFirst con serviceCode', async () => {
      const res = await repository.findServiceCatalogItemByCode(101, 'ten-1');
      expect(mockPrisma.securityServiceCatalog.findFirst).toHaveBeenCalled();
      expect(res?.id).toBe('sc-1');
    });

    it('createServiceCatalogItem debe llamar a create', async () => {
      const res = await repository.createServiceCatalogItem({} as any);
      expect(mockPrisma.securityServiceCatalog.create).toHaveBeenCalled();
      expect(res.id).toBe('sc-1');
    });

    it('updateServiceCatalogItem debe llamar a update', async () => {
      const res = await repository.updateServiceCatalogItem('sc-1', {} as any);
      expect(mockPrisma.securityServiceCatalog.update).toHaveBeenCalled();
      expect(res.id).toBe('sc-1');
    });

    it('deleteServiceCatalogItem debe llamar a delete', async () => {
      const res = await repository.deleteServiceCatalogItem('sc-1');
      expect(mockPrisma.securityServiceCatalog.delete).toHaveBeenCalled();
      expect(res.id).toBe('sc-1');
    });
  });

  describe('SalaryMatrix CRUD', () => {
    it('findSalaryMatrix debe llamar a findMany', async () => {
      const res = await repository.findSalaryMatrix('ten-1');
      expect(mockPrisma.positionSalaryMatrix.findMany).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('findSalaryMatrixEntry debe llamar a findUnique', async () => {
      const res = await repository.findSalaryMatrixEntry(
        'ten-1',
        'Guarda',
        ShiftScheduleType.SCHEDULE_2X2X2,
      );
      expect(mockPrisma.positionSalaryMatrix.findUnique).toHaveBeenCalled();
      expect(res?.id).toBe('sm-1');
    });

    it('upsertSalaryMatrix debe llamar a upsert', async () => {
      const res = await repository.upsertSalaryMatrix(
        {} as any,
        {} as any,
        {} as any,
      );
      expect(mockPrisma.positionSalaryMatrix.upsert).toHaveBeenCalled();
      expect(res.id).toBe('sm-1');
    });

    it('deleteSalaryMatrix debe llamar a delete', async () => {
      const res = await repository.deleteSalaryMatrix('sm-1');
      expect(mockPrisma.positionSalaryMatrix.delete).toHaveBeenCalled();
      expect(res.id).toBe('sm-1');
    });
  });

  describe('ValueAdded & Distribution CRUD', () => {
    it('findValueAddedItems debe llamar a findMany', async () => {
      const res = await repository.findValueAddedItems('ten-1');
      expect(mockPrisma.valueAddedCatalogItem.findMany).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('findValueAddedItemById debe llamar a findFirst', async () => {
      const res = await repository.findValueAddedItemById('va-1', 'ten-1');
      expect(mockPrisma.valueAddedCatalogItem.findFirst).toHaveBeenCalled();
      expect(res?.id).toBe('va-1');
    });

    it('createValueAddedItem debe llamar a create', async () => {
      const res = await repository.createValueAddedItem({} as any);
      expect(mockPrisma.valueAddedCatalogItem.create).toHaveBeenCalled();
      expect(res.id).toBe('va-1');
    });

    it('updateValueAddedItem debe llamar a update', async () => {
      const res = await repository.updateValueAddedItem('va-1', {} as any);
      expect(mockPrisma.valueAddedCatalogItem.update).toHaveBeenCalled();
      expect(res.id).toBe('va-1');
    });

    it('deleteValueAddedItem debe llamar a delete', async () => {
      const res = await repository.deleteValueAddedItem('va-1');
      expect(mockPrisma.valueAddedCatalogItem.delete).toHaveBeenCalled();
      expect(res.id).toBe('va-1');
    });

    it('findDistributionRecipients debe llamar a findMany', async () => {
      const res = await repository.findDistributionRecipients('ten-1');
      expect(
        mockPrisma.serviceOrderDistributionRecipient.findMany,
      ).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('upsertDistributionRecipient debe llamar a upsert', async () => {
      const res = await repository.upsertDistributionRecipient(
        'ten-1',
        'set-1',
        InternalDepartment.CONTRACTS,
        'Juan Dest',
        'juan@noxia.com',
        'usr-1',
      );
      expect(
        mockPrisma.serviceOrderDistributionRecipient.upsert,
      ).toHaveBeenCalled();
      expect(res.id).toBe('dist-1');
    });
  });
});
