import { NotFoundException, ConflictException } from '@nestjs/common';
import { CommercialSettingsService } from './commercial-settings.service';
import { UserContext } from '../../../../common/interfaces/user-context.interface';
import {
  CommercialSector,
  WeaponModality,
  ShiftScheduleType,
  WorkingDaysModality,
  ValueAddedCategory,
  InternalDepartment,
  Prisma,
} from '@prisma/client';

describe('CommercialSettingsService', () => {
  let service: CommercialSettingsService;
  let mockPrisma: any;

  const mockUser: UserContext = {
    sub: 'user-456',
    tenantId: 'tenant-abc',
    roles: ['ADMIN'],
    permissions: ['commercial:settings:read', 'commercial:settings:manage'],
  };

  const sampleSettings = {
    id: 'comm-set-1',
    tenantId: 'tenant-abc',
    defaultAiuRate: new Prisma.Decimal(0.1),
    defaultIvaOnAiuRate: new Prisma.Decimal(0.19),
    defaultRetefuenteRate: new Prisma.Decimal(0.02),
    defaultReteIcaRate: new Prisma.Decimal(0.0138),
    tariffPeriods: [],
    serviceCatalog: [],
    salaryMatrix: [],
    valueAddedCatalog: [],
    documentSkin: null,
    distributionRecipients: [],
    textSnippets: [],
  };

  beforeEach(() => {
    mockPrisma = {
      commercialSettings: {
        findFirst: jest.fn().mockResolvedValue(sampleSettings),
        findUniqueOrThrow: jest.fn().mockResolvedValue(sampleSettings),
        create: jest.fn().mockResolvedValue(sampleSettings),
        update: jest.fn().mockResolvedValue(sampleSettings),
      },
      tariffPeriodConfig: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      securityServiceCatalog: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      positionSalaryMatrix: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        create: jest.fn(),
      },
      valueAddedCatalogItem: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tenantDocumentSkin: {
        upsert: jest.fn(),
        create: jest.fn(),
      },
      serviceOrderDistributionRecipient: {
        upsert: jest.fn(),
        create: jest.fn(),
      },
      documentTextSnippet: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tenant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-abc', name: 'Noxia Security' }),
      },
    };

    service = new CommercialSettingsService(mockPrisma);
  });

  describe('getSettings', () => {
    it('debe retornar las configuraciones del tenant si existen', async () => {
      const res = await service.getSettings(mockUser);
      expect(mockPrisma.commercialSettings.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-abc' } }),
      );
      expect(res.id).toBe('comm-set-1');
    });

    it('debe auto-inicializar las configuraciones por defecto si no existen', async () => {
      mockPrisma.commercialSettings.findFirst.mockResolvedValueOnce(null);
      const res = await service.getSettings(mockUser);
      expect(mockPrisma.commercialSettings.create).toHaveBeenCalled();
      expect(mockPrisma.tariffPeriodConfig.create).toHaveBeenCalled();
      expect(mockPrisma.tenantDocumentSkin.create).toHaveBeenCalled();
      expect(res.id).toBe('comm-set-1');
    });
  });

  describe('updateSettings', () => {
    it('debe actualizar los parámetros tributarios y de reinversión', async () => {
      await service.updateSettings({ defaultAiuRate: 0.12 }, mockUser);
      expect(mockPrisma.commercialSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comm-set-1' },
          data: expect.objectContaining({
            defaultAiuRate: 0.12,
            updatedById: 'user-456',
          }),
        }),
      );
    });
  });

  describe('TariffPeriodConfig CRUD', () => {
    it('debe crear un tramo tarifario calculando las proporciones', async () => {
      mockPrisma.tariffPeriodConfig.create.mockResolvedValue({
        id: 'tp-1',
        year: 2026,
      });
      const res = await service.createTariffPeriod(
        {
          year: 2026,
          label: 'Oficial 2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          smmlv: 1750905,
          monthlyTransportAux: 249095,
          dailyTransportAux: 8303.17,
          statutoryWeeklyHours: 44,
        },
        mockUser,
      );

      expect(mockPrisma.tariffPeriodConfig.create).toHaveBeenCalled();
      expect(res.id).toBe('tp-1');
    });

    it('debe actualizar un tramo tarifario existente', async () => {
      mockPrisma.tariffPeriodConfig.findFirst.mockResolvedValue({
        id: 'tp-1',
        tenantId: 'tenant-abc',
      });
      mockPrisma.tariffPeriodConfig.update.mockResolvedValue({
        id: 'tp-1',
        year: 2027,
      });

      const res = await service.updateTariffPeriod(
        'tp-1',
        { year: 2027 },
        mockUser,
      );
      expect(res.year).toBe(2027);
    });

    it('debe lanzar NotFoundException si el tramo no existe al actualizar', async () => {
      mockPrisma.tariffPeriodConfig.findFirst.mockResolvedValue(null);
      await expect(
        service.updateTariffPeriod('non-existent', { year: 2027 }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe eliminar un tramo tarifario', async () => {
      mockPrisma.tariffPeriodConfig.findFirst.mockResolvedValue({
        id: 'tp-1',
        tenantId: 'tenant-abc',
      });
      const res = await service.deleteTariffPeriod('tp-1', mockUser);
      expect(mockPrisma.tariffPeriodConfig.delete).toHaveBeenCalledWith({
        where: { id: 'tp-1' },
      });
      expect(res.success).toBe(true);
    });
  });

  describe('ServiceCatalog CRUD', () => {
    it('debe listar los servicios del tenant', async () => {
      mockPrisma.securityServiceCatalog.findMany.mockResolvedValue([
        { id: 'srv-1', serviceCode: 1 },
      ]);
      const res = await service.getServiceCatalog(mockUser);
      expect(res).toHaveLength(1);
    });

    it('debe crear un nuevo servicio en el catálogo', async () => {
      mockPrisma.securityServiceCatalog.create.mockResolvedValue({
        id: 'srv-1',
        serviceCode: 1,
      });
      const res = await service.createServiceCatalog(
        {
          serviceCode: 1,
          name: 'Vigilancia 24h',
          targetPosition: 'Guarda Portero',
          sector: CommercialSector.COMMERCIAL_PUBLIC,
          weaponModality: WeaponModality.LETHAL_WEAPON,
          dailyTotalHours: 24,
          dayHours: 15,
          nightHours: 9,
          billableDaysPerMonth: 30,
          adminSupervisionPct: 0.1,
        },
        mockUser,
      );
      expect(res.id).toBe('srv-1');
    });

    it('debe manejar error P2002 lanzando ConflictException', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.x',
        },
      );
      mockPrisma.securityServiceCatalog.create.mockRejectedValue(p2002Error);

      await expect(
        service.createServiceCatalog(
          {
            serviceCode: 1,
            name: 'Vigilancia 24h',
            targetPosition: 'Guarda Portero',
            sector: CommercialSector.COMMERCIAL_PUBLIC,
            weaponModality: WeaponModality.LETHAL_WEAPON,
            dailyTotalHours: 24,
            dayHours: 15,
            nightHours: 9,
            billableDaysPerMonth: 30,
            adminSupervisionPct: 0.1,
          },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('SalaryMatrix and Distribution', () => {
    it('debe hacer upsert en la matriz salarial', async () => {
      mockPrisma.positionSalaryMatrix.upsert.mockResolvedValue({
        id: 'psm-1',
        positionTitle: 'Guarda Portero',
      });
      const res = await service.upsertSalaryMatrix(
        {
          items: [
            {
              positionTitle: 'Guarda Portero',
              baseSalary: 1750905,
              transportAllowance: 249095,
              estimatedOvertimePay: 600000,
              grossSalary: 2600000,
              healthDeduction: 90000,
              pensionDeduction: 90000,
              totalDeductions: 180000,
              netTakeHomePay: 2420000,
            },
          ],
        },
        mockUser,
      );

      expect(mockPrisma.positionSalaryMatrix.upsert).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('debe actualizar la matriz de distribución a dependencias', async () => {
      mockPrisma.serviceOrderDistributionRecipient.upsert.mockResolvedValue({
        id: 'rec-1',
        department: InternalDepartment.OPERATIONS,
      });

      const res = await service.updateDistributionRecipients(
        {
          recipients: [
            {
              department: InternalDepartment.OPERATIONS,
              recipientName: 'Director Ops',
              recipientEmail: 'ops@noxia.com',
            },
          ],
        },
        mockUser,
      );

      expect(
        mockPrisma.serviceOrderDistributionRecipient.upsert,
      ).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });
  });

  describe('ValueAdded and Snippets', () => {
    it('debe gestionar catálogo de valores agregados', async () => {
      mockPrisma.valueAddedCatalogItem.create.mockResolvedValue({
        id: 'vag-1',
        name: 'Locker 4P',
      });
      const created = await service.createValueAdded(
        {
          name: 'Locker 4P',
          category: ValueAddedCategory.POST_EQUIPMENT,
          internalReferenceCost: 450000,
        },
        mockUser,
      );
      expect(created.id).toBe('vag-1');
    });

    it('debe gestionar plantillas de texto', async () => {
      mockPrisma.documentTextSnippet.create.mockResolvedValue({
        id: 'snp-1',
        key: 'COVER_LETTER',
      });
      const created = await service.createTextSnippet(
        {
          key: 'COVER_LETTER',
          title: 'Carta',
          bodyTemplate: 'Hola {{client_name}}',
          category: 'LETTERS',
        },
        mockUser,
      );
      expect(created.id).toBe('snp-1');
    });
  });
});
