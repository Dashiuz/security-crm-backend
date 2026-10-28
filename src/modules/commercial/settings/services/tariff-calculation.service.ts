import { CommercialSector, WeaponModality } from '@prisma/client';

export interface TariffInput {
  smmlv: number;
  monthlyTransportAux: number;
  sector: CommercialSector;
  weaponModality: WeaponModality;
  dayHours: number; // Horas diurnas en el turno (ej. 15 en 24h, 3 en 12h noche)
  nightHours: number; // Horas nocturnas en el turno (ej. 9 en 24h, 9 en 12h noche)
  billableDays: number; // Días facturables al mes (30, 26, 24, 22, 20, 10, 8, 2)
  customSectorMultiplier?: number;
  customAdminSupervisionPct?: number;
  aiuRate?: number; // Predeterminado 0.10 (10%)
  ivaOnAiuRate?: number; // Predeterminado 0.19 (19%)
  retefuenteRate?: number; // Predeterminado 0.02 (2%)
  reteIcaRate?: number; // Predeterminado 0.0138 (1.38%)
  discountPct?: number; // Porcentaje pronto pago (ej. 0.05 para 5%)

  // Parámetros de Proporcionalidad Dinámica (desde TariffPeriodConfig)
  dayProportionFactor?: number; // Default: 0.5597
  nightProportionFactor?: number; // Default: 0.4403
  statutoryDayHours?: number; // Default: 15
  statutoryNightHours?: number; // Default: 9
}

export interface TariffCalculationBreakdown {
  tariffBase24h: number;
  dayHourlyRateMonth: number;
  nightHourlyRateMonth: number;
  directCost: number;
  adminSupervisionPct: number;
  adminSupervisionValue: number;
  subtotalBeforeTax: number;
  discountValue: number;
  subtotalAfterDiscount: number;
  aiuBaseValue: number;
  ivaValue: number;
  retefuenteValue: number;
  reteIcaValue: number;
  totalWithTax: number;
  netCompanyToReceive: number;
  dailyRate: number;
}

export type TariffCalculationResult = TariffCalculationBreakdown;

export class TariffCalculationEngine {
  public static readonly DEFAULT_DAY_PROPORTION = 0.5597;
  public static readonly DEFAULT_NIGHT_PROPORTION = 0.4403;
  public static readonly DEFAULT_LEGAL_DAY_HOURS = 15;
  public static readonly DEFAULT_LEGAL_NIGHT_HOURS = 9;

  private static roundTax(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private static roundCOP(val: number): number {
    return Math.round(val);
  }

  static calculateStatutoryProportions(dayHours = 15, nightHours = 9) {
    const total = dayHours + nightHours;
    const dayProportionFactor =
      total > 0
        ? Math.round((dayHours / total) * 10000) / 10000
        : this.DEFAULT_DAY_PROPORTION;
    const nightProportionFactor =
      total > 0
        ? Math.round((nightHours / total) * 10000) / 10000
        : this.DEFAULT_NIGHT_PROPORTION;
    return { dayProportionFactor, nightProportionFactor };
  }

  static calculate(input: TariffInput): TariffCalculationBreakdown {
    // 1. Multiplicador de Sector (múltiplos de SMMLV según circular SVSP)
    let multiplier = 8.8; // Comercial y Público
    if (
      input.customSectorMultiplier !== undefined &&
      input.customSectorMultiplier > 0
    ) {
      multiplier = input.customSectorMultiplier;
    } else if (input.sector === CommercialSector.RESIDENTIAL_STRATA_4_6) {
      multiplier = 9.77; // Circular SVSP 2026 oficial para estratos 4, 5 y 6
    } else if (input.sector === CommercialSector.RESIDENTIAL_STRATA_1_3) {
      multiplier = 7.66376105;
    }

    // 2. Tarifa Base 24h
    const tariffBase24h = this.roundCOP(input.smmlv * multiplier);

    // 3. Proporcionalidad Horaria Dinámica
    const dayFactor = input.dayProportionFactor ?? this.DEFAULT_DAY_PROPORTION;
    const nightFactor =
      input.nightProportionFactor ?? this.DEFAULT_NIGHT_PROPORTION;

    // Si no se especifican horas legales pero el factor es el de 2026 (0.4759), usar 13h/11h
    const defaultDayH =
      dayFactor === 0.4759 || Math.abs(dayFactor - 0.4759) < 0.001
        ? 13
        : this.DEFAULT_LEGAL_DAY_HOURS;
    const defaultNightH =
      nightFactor === 0.5241 || Math.abs(nightFactor - 0.5241) < 0.001
        ? 11
        : this.DEFAULT_LEGAL_NIGHT_HOURS;

    const legalDayHours = input.statutoryDayHours ?? defaultDayH;
    const legalNightHours = input.statutoryNightHours ?? defaultNightH;

    const dayHourlyRateMonth = (tariffBase24h * dayFactor) / legalDayHours;
    const nightHourlyRateMonth =
      (tariffBase24h * nightFactor) / legalNightHours;

    // 4. Costo Directo Mensual
    let directCost: number;
    // Si es un puesto 24h continuo de 30 días con proporciones normales (ej. 13h día / 11h noche o 15h día / 9h noche)
    if (
      input.billableDays === 30 &&
      input.dayHours + input.nightHours === 24 &&
      input.dayHours === legalDayHours &&
      input.nightHours === legalNightHours
    ) {
      directCost = tariffBase24h;
    } else {
      const dailyCost =
        dayHourlyRateMonth * input.dayHours +
        nightHourlyRateMonth * input.nightHours;
      directCost = this.roundTax((dailyCost / 30) * input.billableDays);
    }

    // 5. A&S (Administración y Supervisión)
    let adminSupervisionPct = 0.1;
    if (
      input.customAdminSupervisionPct !== undefined &&
      input.customAdminSupervisionPct >= 0
    ) {
      adminSupervisionPct = input.customAdminSupervisionPct;
    } else if (input.weaponModality === WeaponModality.CANINE_SUPPORT) {
      adminSupervisionPct = 0.11;
    } else if (
      input.sector === CommercialSector.COMMERCIAL_PUBLIC &&
      input.weaponModality === WeaponModality.NO_WEAPON
    ) {
      adminSupervisionPct = 0.08;
    }

    const adminSupervisionValue = this.roundTax(
      directCost * adminSupervisionPct,
    );
    const subtotalBeforeTax = this.roundTax(directCost + adminSupervisionValue);

    // 6. Descuento Financiero (Pronto Pago)
    const discountPct = input.discountPct ?? 0;
    const discountValue = this.roundTax(subtotalBeforeTax * discountPct);
    const subtotalAfterDiscount = this.roundTax(
      subtotalBeforeTax - discountValue,
    );

    // 7. Base Gravable AIU e IVA sobre AIU (19% sobre 10%)
    const aiuRate = input.aiuRate ?? 0.1;
    const ivaOnAiuRate = input.ivaOnAiuRate ?? 0.19;
    const aiuBaseValue = this.roundTax(subtotalAfterDiscount * aiuRate);
    const ivaValue = this.roundTax(aiuBaseValue * ivaOnAiuRate);

    // 8. Retenciones
    const retefuenteRate = input.retefuenteRate ?? 0.02;
    const reteIcaRate = input.reteIcaRate ?? 0.0138;
    const retefuenteValue = this.roundTax(aiuBaseValue * retefuenteRate);
    const reteIcaValue = this.roundTax(subtotalAfterDiscount * reteIcaRate);

    // 9. Totales Finales
    const totalWithTax = this.roundCOP(subtotalAfterDiscount + ivaValue);
    const netCompanyToReceive = this.roundTax(
      subtotalAfterDiscount + ivaValue - retefuenteValue - reteIcaValue,
    );
    const dailyRate = this.roundTax(subtotalBeforeTax / input.billableDays);

    return {
      tariffBase24h,
      dayHourlyRateMonth: this.roundTax(dayHourlyRateMonth),
      nightHourlyRateMonth: this.roundTax(nightHourlyRateMonth),
      directCost,
      adminSupervisionPct,
      adminSupervisionValue,
      subtotalBeforeTax,
      discountValue,
      subtotalAfterDiscount,
      aiuBaseValue,
      ivaValue,
      retefuenteValue,
      reteIcaValue,
      totalWithTax,
      netCompanyToReceive,
      dailyRate,
    };
  }

  static calculateRate(
    dto: {
      sector: CommercialSector;
      weaponModality: WeaponModality;
      dayHours: number;
      nightHours: number;
      billableDays: number;
      discountPct?: number;
      customSectorMultiplier?: number;
      customAdminSupervisionPct?: number;
      manualSmmlv?: number;
      manualTransportAux?: number;
      statutoryDayHours?: number;
      statutoryNightHours?: number;
      dayProportionFactor?: number;
      nightProportionFactor?: number;
      aiuRate?: number;
      ivaOnAiuRate?: number;
    },
    smmlv: number,
    commercialMultiplier = 8.8,
    strata46Multiplier = 9.77,
    strata13Multiplier = 7.66376105,
    dayFactor = 0.4759,
    nightFactor = 0.5241,
    statutoryDayHours = 13,
    statutoryNightHours = 11,
    monthlyTransportAux = 249095.0,
  ): TariffCalculationBreakdown {
    const finalSmmlv = dto.manualSmmlv ?? smmlv;
    let sectorMultiplier: number | undefined;
    if (dto.customSectorMultiplier) {
      sectorMultiplier = dto.customSectorMultiplier;
    } else if (dto.sector === CommercialSector.COMMERCIAL_PUBLIC) {
      sectorMultiplier = commercialMultiplier;
    } else if (dto.sector === CommercialSector.RESIDENTIAL_STRATA_4_6) {
      sectorMultiplier = strata46Multiplier;
    } else if (dto.sector === CommercialSector.RESIDENTIAL_STRATA_1_3) {
      sectorMultiplier = strata13Multiplier;
    }

    return this.calculate({
      smmlv: finalSmmlv,
      monthlyTransportAux: dto.manualTransportAux ?? monthlyTransportAux,
      sector: dto.sector,
      weaponModality: dto.weaponModality,
      dayHours: dto.dayHours,
      nightHours: dto.nightHours,
      billableDays: dto.billableDays,
      discountPct: dto.discountPct,
      customSectorMultiplier: sectorMultiplier,
      customAdminSupervisionPct: dto.customAdminSupervisionPct,
      dayProportionFactor: dto.dayProportionFactor ?? dayFactor,
      nightProportionFactor: dto.nightProportionFactor ?? nightFactor,
      statutoryDayHours: dto.statutoryDayHours ?? statutoryDayHours,
      statutoryNightHours: dto.statutoryNightHours ?? statutoryNightHours,
      aiuRate: dto.aiuRate,
      ivaOnAiuRate: dto.ivaOnAiuRate,
    });
  }
}
