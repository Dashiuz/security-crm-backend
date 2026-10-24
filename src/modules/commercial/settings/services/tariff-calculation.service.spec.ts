import {
  TariffCalculationEngine,
  TariffInput,
} from './tariff-calculation.service';
import { CommercialSector, WeaponModality } from '@prisma/client';

describe('TariffCalculationEngine (Motor Tarifario SVSP 2026)', () => {
  const SMMLV_2026 = 1750905.0;
  const TRANSPORT_AUX_2026 = 249095.0;

  it('debe calcular con exactitud la tarifa 24 horas Comercial Permanente con Arma (Benchmark Oficial)', () => {
    // Escenario Benchmark:
    // SMMLV = $1.750.905
    // Sector: COMERCIAL_PUBLIC (8.8 SMMLV)
    // Modalidad: LETHAL_WEAPON (10% A&S)
    // Cobertura: 24h (15h diurnas, 9h nocturnas), 30 días facturables
    const input: TariffInput = {
      smmlv: SMMLV_2026,
      monthlyTransportAux: TRANSPORT_AUX_2026,
      sector: CommercialSector.COMMERCIAL_PUBLIC,
      weaponModality: WeaponModality.LETHAL_WEAPON,
      dayHours: 15,
      nightHours: 9,
      billableDays: 30,
      dayProportionFactor: 0.5597,
      nightProportionFactor: 0.4403,
      statutoryDayHours: 15,
      statutoryNightHours: 9,
      aiuRate: 0.1,
      ivaOnAiuRate: 0.19,
      retefuenteRate: 0.02,
      reteIcaRate: 0.0138,
    };

    const res = TariffCalculationEngine.calculate(input);

    // 1. Tarifa Base 24h = $1.750.905 * 8.8 = $15.407.964
    expect(res.tariffBase24h).toBe(15407964);

    // 2. Costo Directo Mensual 24h (30 días)
    expect(res.directCost).toBe(15407964);

    // 3. A&S (10%) = $1.540.796,40
    expect(res.adminSupervisionPct).toBe(0.1);
    expect(res.adminSupervisionValue).toBe(1540796.4);

    // 4. Subtotal antes de Impuestos = $16.948.760,40
    expect(res.subtotalBeforeTax).toBe(16948760.4);

    // 5. Base Gravable AIU (10%) = $1.694.876,04
    expect(res.aiuBaseValue).toBe(1694876.04);

    // 6. IVA sobre AIU (19%) = $322.026,45
    expect(res.ivaValue).toBe(322026.45);

    // 7. Total con IVA redondeado = $17.270.787
    expect(res.totalWithTax).toBe(17270787);

    // 8. Retenciones
    expect(res.retefuenteValue).toBe(33897.52);
    expect(res.reteIcaValue).toBe(233892.89);
  });

  it('debe calcular factores de proporcionalidad horaria legales (15h día / 9h noche)', () => {
    const proportions = TariffCalculationEngine.calculateStatutoryProportions(
      15,
      9,
    );
    expect(proportions.dayProportionFactor).toBe(0.625); // 15/24 = 0.625
    expect(proportions.nightProportionFactor).toBe(0.375); // 9/24 = 0.375
  });

  it('debe aplicar 8.6 SMMLV para Residencial Estratos 4, 5 y 6', () => {
    const input: TariffInput = {
      smmlv: SMMLV_2026,
      monthlyTransportAux: TRANSPORT_AUX_2026,
      sector: CommercialSector.RESIDENTIAL_STRATA_4_6,
      weaponModality: WeaponModality.NO_WEAPON,
      dayHours: 15,
      nightHours: 9,
      billableDays: 30,
    };

    const res = TariffCalculationEngine.calculate(input);
    expect(res.tariffBase24h).toBe(Math.round(SMMLV_2026 * 8.6));
    expect(res.adminSupervisionPct).toBe(0.1); // Residencial sin arma aplica 10%
  });

  it('debe aplicar 8% A&S para Comercial Sin Arma y 11% para Canino', () => {
    const resComSinArma = TariffCalculationEngine.calculate({
      smmlv: SMMLV_2026,
      monthlyTransportAux: TRANSPORT_AUX_2026,
      sector: CommercialSector.COMMERCIAL_PUBLIC,
      weaponModality: WeaponModality.NO_WEAPON,
      dayHours: 15,
      nightHours: 9,
      billableDays: 30,
    });
    expect(resComSinArma.adminSupervisionPct).toBe(0.08);

    const resCanine = TariffCalculationEngine.calculate({
      smmlv: SMMLV_2026,
      monthlyTransportAux: TRANSPORT_AUX_2026,
      sector: CommercialSector.COMMERCIAL_PUBLIC,
      weaponModality: WeaponModality.CANINE_SUPPORT,
      dayHours: 15,
      nightHours: 9,
      billableDays: 30,
    });
    expect(resCanine.adminSupervisionPct).toBe(0.11);
  });

  it('debe calcular adecuadamente turnos diurnos de 12 horas en 26 días', () => {
    const res12h = TariffCalculationEngine.calculate({
      smmlv: SMMLV_2026,
      monthlyTransportAux: TRANSPORT_AUX_2026,
      sector: CommercialSector.COMMERCIAL_PUBLIC,
      weaponModality: WeaponModality.LETHAL_WEAPON,
      dayHours: 12,
      nightHours: 0,
      billableDays: 26,
    });
    expect(res12h.directCost).toBeGreaterThan(0);
    expect(res12h.dailyRate).toBe(
      Math.round((res12h.subtotalBeforeTax / 26) * 100) / 100,
    );
  });
});
