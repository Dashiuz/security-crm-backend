import { PnlCalculatorService } from './pnl-calculator.service';
import { PnlHealthStatus, ShiftScheduleType, WeaponModality, CommercialSector, BenefitPeriodicity } from '@prisma/client';

describe('PnlCalculatorService', () => {
  let service: PnlCalculatorService;

  beforeEach(() => {
    service = new PnlCalculatorService();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('computePnl', () => {
    it('debe calcular correctamente una propuesta rentable (PROFITABLE >= 15%)', () => {
      const input = {
        contractDurationMonths: 12,
        promptPaymentDiscPercent: 0,
        items: [
          {
            positionTitle: 'Guarda 24 Horas',
            quantity: 2,
            scheduleType: ShiftScheduleType.SCHEDULE_2X2X2,
            weaponModality: WeaponModality.LETHAL_WEAPON,
            tariffCategory: CommercialSector.COMMERCIAL_PUBLIC,
            unitMonthlyBilledPrice: 12000000,
            unitMonthlyRealCost: 9000000,
          },
        ],
        valueAddedItems: [],
      };

      const result = service.computePnl(input);

      expect(result.subtotalMonthlyPreDisc).toBe(24000000);
      expect(result.promptPaymentDiscAmount).toBe(0);
      expect(result.subtotalMonthlyAfterDisc).toBe(24000000);
      expect(result.aiuBaseAmount).toBe(2400000); // 10%
      expect(result.ivaAmount).toBe(456000); // 19% de AIU (1.9% total)
      expect(result.totalMonthlyWithTax).toBe(24456000);
      expect(result.totalAnnualContractValue).toBe(293472000);

      // Costos y Margen
      expect(result.estimatedMonthlyRealCost).toBe(18000000);
      expect(result.monthlyVagAmortization).toBe(0);
      expect(result.totalMonthlyOperatingCost).toBe(18000000);
      expect(result.netMonthlyMarginAmount).toBe(6000000); // 24M - 18M
      expect(result.netMarginPercentage).toBe(25); // 6M / 24M = 25%
      expect(result.pnlStatus).toBe(PnlHealthStatus.PROFITABLE);
    });

    it('debe calcular semáforo ámbar (WARNING_LOW_MARGIN entre 8% y 14.99%)', () => {
      const input = {
        contractDurationMonths: 12,
        promptPaymentDiscPercent: 0,
        items: [
          {
            positionTitle: 'Guarda Portero',
            quantity: 1,
            scheduleType: ShiftScheduleType.SCHEDULE_2X2X2,
            weaponModality: WeaponModality.NO_WEAPON,
            tariffCategory: CommercialSector.RESIDENTIAL_STRATA_4_6,
            unitMonthlyBilledPrice: 10000000,
            unitMonthlyRealCost: 8800000,
          },
        ],
        valueAddedItems: [],
      };

      const result = service.computePnl(input);

      expect(result.netMonthlyMarginAmount).toBe(1200000); // 1.2M
      expect(result.netMarginPercentage).toBe(12); // 12%
      expect(result.pnlStatus).toBe(PnlHealthStatus.WARNING_LOW_MARGIN);
    });

    it('debe calcular semáforo rojo (DEFICIT_BLOCKED < 8%)', () => {
      const input = {
        contractDurationMonths: 12,
        promptPaymentDiscPercent: 0,
        items: [
          {
            positionTitle: 'Guarda Portero',
            quantity: 1,
            scheduleType: ShiftScheduleType.SCHEDULE_2X2X2,
            weaponModality: WeaponModality.NO_WEAPON,
            tariffCategory: CommercialSector.RESIDENTIAL_STRATA_4_6,
            unitMonthlyBilledPrice: 10000000,
            unitMonthlyRealCost: 9500000,
          },
        ],
        valueAddedItems: [],
      };

      const result = service.computePnl(input);

      expect(result.netMarginPercentage).toBe(5); // 5%
      expect(result.pnlStatus).toBe(PnlHealthStatus.DEFICIT_BLOCKED);
    });

    it('debe considerar descuento por pronto pago y amortización de valores agregados (VAG)', () => {
      const input = {
        contractDurationMonths: 10,
        promptPaymentDiscPercent: 5, // 5% descuento
        items: [
          {
            positionTitle: 'Supervisor Motorizado',
            quantity: 1,
            scheduleType: ShiftScheduleType.SCHEDULE_2X2X2,
            weaponModality: WeaponModality.LETHAL_WEAPON,
            tariffCategory: CommercialSector.COMMERCIAL_PUBLIC,
            unitMonthlyBilledPrice: 10000000,
            unitMonthlyRealCost: 7000000,
          },
        ],
        valueAddedItems: [
          {
            itemName: 'Cámaras de Seguridad CCTV',
            quantity: 2,
            periodicity: BenefitPeriodicity.SINGLE_ONE_TIME,
            itemInternalCost: 1000000, // Total 2,000,000 amortizado en 10 meses = 200,000/mes
          },
          {
            itemName: 'Mantenimiento Mensual Radios',
            quantity: 1,
            periodicity: BenefitPeriodicity.MONTHLY_RECURRING,
            itemInternalCost: 100000, // 100,000/mes
          },
          {
            itemName: 'Póliza Especial Anual',
            quantity: 1,
            periodicity: BenefitPeriodicity.ANNUAL_RENEWAL,
            itemInternalCost: 1000000, // 1 año (10 meses <= 12m) -> 1,000,000 / 10 = 100,000/mes
          },
        ],
      };

      const result = service.computePnl(input);

      expect(result.subtotalMonthlyPreDisc).toBe(10000000);
      expect(result.promptPaymentDiscPercent).toBe(5);
      expect(result.promptPaymentDiscAmount).toBe(500000);
      expect(result.subtotalMonthlyAfterDisc).toBe(9500000);

      // AIU 10% sobre subtotal con descuento
      expect(result.aiuBaseAmount).toBe(950000);
      expect(result.ivaAmount).toBe(180500); // 19% de 950,000
      expect(result.totalMonthlyWithTax).toBe(9680500);

      // VAG Amortizado: 200,000 + 100,000 + 100,000 = 400,000/mes
      expect(result.monthlyVagAmortization).toBe(400000);
      expect(result.estimatedMonthlyRealCost).toBe(7000000);
      expect(result.totalMonthlyOperatingCost).toBe(7400000);

      // Margen Neto: 9,500,000 - 7,400,000 = 2,100,000
      expect(result.netMonthlyMarginAmount).toBe(2100000);
      expect(result.netMarginPercentage).toBeCloseTo(22.11, 1);
      expect(result.pnlStatus).toBe(PnlHealthStatus.PROFITABLE);
    });

    it('debe manejar propuesta vacía retornando ceros y DEFICIT_BLOCKED', () => {
      const result = service.computePnl({
        contractDurationMonths: 12,
        promptPaymentDiscPercent: 0,
        items: [],
      });

      expect(result.subtotalMonthlyPreDisc).toBe(0);
      expect(result.totalMonthlyOperatingCost).toBe(0);
      expect(result.netMarginPercentage).toBe(0);
      expect(result.pnlStatus).toBe(PnlHealthStatus.DEFICIT_BLOCKED);
    });
  });
});
