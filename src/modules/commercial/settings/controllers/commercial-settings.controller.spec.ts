import { CommercialSettingsController } from './commercial-settings.controller';
import { CommercialSettingsService } from '../services/commercial-settings.service';
import {
  CommercialSector,
  WeaponModality,
  InternalDepartment,
  ValueAddedCategory,
} from '@prisma/client';

describe('CommercialSettingsController', () => {
  let controller: CommercialSettingsController;
  let mockService: any;

  const mockReq = {
    user: {
      sub: 'user-123',
      tenantId: 'tenant-123',
      roles: ['ADMIN'],
      permissions: ['commercial:settings:read', 'commercial:settings:manage'],
    },
  };

  beforeEach(() => {
    mockService = {
      getSettings: jest.fn().mockResolvedValue({ id: 'set-1' }),
      updateSettings: jest
        .fn()
        .mockResolvedValue({ id: 'set-1', defaultAiuRate: 0.1 }),
      createTariffPeriod: jest.fn().mockResolvedValue({ id: 'tp-1' }),
      updateTariffPeriod: jest
        .fn()
        .mockResolvedValue({ id: 'tp-1', year: 2026 }),
      deleteTariffPeriod: jest.fn().mockResolvedValue({ success: true }),
      simulateTariff: jest.fn().mockResolvedValue({ totalWithTax: 17270787 }),
      simulateSalary: jest.fn().mockResolvedValue({ netTakeHomePay: 2485528 }),
      getServiceCatalog: jest.fn().mockResolvedValue([]),
      createServiceCatalog: jest.fn().mockResolvedValue({ id: 'srv-1' }),
      updateServiceCatalog: jest.fn().mockResolvedValue({ id: 'srv-1' }),
      deleteServiceCatalog: jest.fn().mockResolvedValue({ success: true }),
      getSalaryMatrix: jest.fn().mockResolvedValue([]),
      upsertSalaryMatrix: jest.fn().mockResolvedValue([]),
      deleteSalaryMatrix: jest.fn().mockResolvedValue({ success: true }),
      getValueAddedCatalog: jest.fn().mockResolvedValue([]),
      createValueAdded: jest.fn().mockResolvedValue({ id: 'vag-1' }),
      updateValueAdded: jest.fn().mockResolvedValue({ id: 'vag-1' }),
      deleteValueAdded: jest.fn().mockResolvedValue({ success: true }),
      updateDocumentSkin: jest.fn().mockResolvedValue({ id: 'skin-1' }),
      updateDistributionRecipients: jest.fn().mockResolvedValue([]),
      getTextSnippets: jest.fn().mockResolvedValue([]),
      createTextSnippet: jest.fn().mockResolvedValue({ id: 'snp-1' }),
      updateTextSnippet: jest.fn().mockResolvedValue({ id: 'snp-1' }),
      deleteTextSnippet: jest.fn().mockResolvedValue({ success: true }),
    };

    controller = new CommercialSettingsController(mockService);
  });

  it('debe consultar la configuración comercial', async () => {
    const res = await controller.getSettings(mockReq);
    expect(mockService.getSettings).toHaveBeenCalledWith(mockReq.user);
    expect(res?.id).toBe('set-1');
  });

  it('debe actualizar la configuración comercial', async () => {
    const res = await controller.updateSettings(
      { defaultAiuRate: 0.1 },
      mockReq,
    );
    expect(mockService.updateSettings).toHaveBeenCalledWith(
      { defaultAiuRate: 0.1 },
      mockReq.user,
    );
    expect(res.id).toBe('set-1');
  });

  it('debe simular tarifa de servicio', async () => {
    const dto = {
      sector: CommercialSector.COMMERCIAL_PUBLIC,
      weaponModality: WeaponModality.LETHAL_WEAPON,
      dayHours: 15,
      nightHours: 9,
      billableDays: 30,
    };
    const res = await controller.simulateTariff(dto, mockReq);
    expect(mockService.simulateTariff).toHaveBeenCalledWith(dto, mockReq.user);
    expect(res.totalWithTax).toBe(17270787);
  });

  it('debe simular nómina de guarda', async () => {
    const dto = { smmlv: 1750905 };
    const res = await controller.simulateSalary(dto);
    expect(mockService.simulateSalary).toHaveBeenCalledWith(dto);
    expect(res.netTakeHomePay).toBe(2485528);
  });

  it('debe invocar CRUD de catálogo de servicios', async () => {
    await controller.getServiceCatalog(mockReq);
    expect(mockService.getServiceCatalog).toHaveBeenCalledWith(mockReq.user);

    await controller.createServiceCatalog({} as any, mockReq);
    expect(mockService.createServiceCatalog).toHaveBeenCalledWith(
      {},
      mockReq.user,
    );

    await controller.updateServiceCatalog('srv-1', {} as any, mockReq);
    expect(mockService.updateServiceCatalog).toHaveBeenCalledWith(
      'srv-1',
      {},
      mockReq.user,
    );

    await controller.deleteServiceCatalog('srv-1', mockReq);
    expect(mockService.deleteServiceCatalog).toHaveBeenCalledWith(
      'srv-1',
      mockReq.user,
    );
  });

  it('debe invocar actualización de piel de documento y matriz de distribución', async () => {
    await controller.updateDocumentSkin(
      { primaryBrandColorHex: '#1E1B4B' },
      mockReq,
    );
    expect(mockService.updateDocumentSkin).toHaveBeenCalledWith(
      { primaryBrandColorHex: '#1E1B4B' },
      mockReq.user,
    );

    await controller.updateDistributionRecipients({ recipients: [] }, mockReq);
    expect(mockService.updateDistributionRecipients).toHaveBeenCalledWith(
      { recipients: [] },
      mockReq.user,
    );
  });

  it('debe invocar eliminación de registro de matriz salarial y operaciones de matriz', async () => {
    await controller.getSalaryMatrix(mockReq);
    expect(mockService.getSalaryMatrix).toHaveBeenCalledWith(mockReq.user);

    await controller.upsertSalaryMatrix({ items: [] } as any, mockReq);
    expect(mockService.upsertSalaryMatrix).toHaveBeenCalledWith(
      { items: [] },
      mockReq.user,
    );

    await controller.deleteSalaryMatrix('sm-1', mockReq);
    expect(mockService.deleteSalaryMatrix).toHaveBeenCalledWith(
      'sm-1',
      mockReq.user,
    );
  });

  it('debe invocar operaciones de tramos tarifarios', async () => {
    await controller.createTariffPeriod({ year: 2026 } as any, mockReq);
    expect(mockService.createTariffPeriod).toHaveBeenCalledWith(
      { year: 2026 },
      mockReq.user,
    );

    await controller.updateTariffPeriod('tp-1', { year: 2027 } as any, mockReq);
    expect(mockService.updateTariffPeriod).toHaveBeenCalledWith(
      'tp-1',
      { year: 2027 },
      mockReq.user,
    );

    await controller.deleteTariffPeriod('tp-1', mockReq);
    expect(mockService.deleteTariffPeriod).toHaveBeenCalledWith(
      'tp-1',
      mockReq.user,
    );
  });

  it('debe invocar operaciones de valores agregados', async () => {
    await controller.getValueAddedCatalog(mockReq);
    expect(mockService.getValueAddedCatalog).toHaveBeenCalledWith(mockReq.user);

    await controller.createValueAdded({ name: 'V' } as any, mockReq);
    expect(mockService.createValueAdded).toHaveBeenCalledWith(
      { name: 'V' },
      mockReq.user,
    );

    await controller.updateValueAdded('v-1', { name: 'V2' } as any, mockReq);
    expect(mockService.updateValueAdded).toHaveBeenCalledWith(
      'v-1',
      { name: 'V2' },
      mockReq.user,
    );

    await controller.deleteValueAdded('v-1', mockReq);
    expect(mockService.deleteValueAdded).toHaveBeenCalledWith(
      'v-1',
      mockReq.user,
    );
  });

  it('debe invocar operaciones de fragmentos de texto', async () => {
    await controller.getTextSnippets(mockReq);
    expect(mockService.getTextSnippets).toHaveBeenCalledWith(mockReq.user);

    await controller.createTextSnippet({ key: 'K' } as any, mockReq);
    expect(mockService.createTextSnippet).toHaveBeenCalledWith(
      { key: 'K' },
      mockReq.user,
    );

    await controller.updateTextSnippet('s-1', { key: 'K2' } as any, mockReq);
    expect(mockService.updateTextSnippet).toHaveBeenCalledWith(
      's-1',
      { key: 'K2' },
      mockReq.user,
    );

    await controller.deleteTextSnippet('s-1', mockReq);
    expect(mockService.deleteTextSnippet).toHaveBeenCalledWith(
      's-1',
      mockReq.user,
    );
  });
});
