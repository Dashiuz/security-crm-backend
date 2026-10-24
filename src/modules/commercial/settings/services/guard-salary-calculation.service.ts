import { ShiftScheduleType } from '@prisma/client';

export interface HourlyRateItem {
  name: string;
  code: string;
  baseRate: number;
  surchargePct: number;
  surchargeValue: number;
  totalHourlyRate: number;
}

export interface SvspSalaryReference2026 {
  smmlv: number; // $ 1.750.905
  transportAllowance: number; // $ 249.095
  totalMinimumGross: number; // $ 2.000.000 (SMMLV + Auxilio)
  statutoryWeeklyHours: number; // 44 horas semanales
  monthlyDivisorHours: number; // 220 horas
  baseHourlyRate: number; // $ 7.959

  // Matriz de las 8 Horas Oficiales SVSP
  hourlyRates: {
    ordinaryDay: HourlyRateItem; // $ 7.959
    ordinaryNight: HourlyRateItem; // $ 10.744 (Recargo: $ 2.785)
    overtimeDay: HourlyRateItem; // $ 9.948 (Recargo: $ 1.989)
    overtimeNight: HourlyRateItem; // $ 13.927 (Recargo: $ 5.968)
    sundayHolidayOrdDay: HourlyRateItem; // $ 14.325 (Recargo: $ 6.366)
    sundayHolidayOrdNight: HourlyRateItem; // $ 17.111 (Recargo: $ 9.152)
    sundayHolidayExtDay: HourlyRateItem; // $ 16.315 (Recargo: $ 8.356)
    sundayHolidayExtNight: HourlyRateItem; // $ 20.294 (Recargo: $ 12.335)
  };

  // Reglas de Turno y Deducciones de Nómina
  shiftStructure: {
    ordinaryHoursPerShift: number; // 8h
    extraHoursPerShift: number; // 4h
    totalShiftHours: number; // 12h
  };
  deductionRates: {
    healthPct: number; // 0.04 (4.0%)
    pensionPct: number; // 0.04 (4.0%)
  };
}

export interface GuardPayrollSimulationInput {
  smmlv?: number;
  transportAllowance?: number;
  statutoryWeeklyHours?: number;
  fixedBonusNonSalary?: number;
  vehicleAllowance?: number;
  scheduleType?: ShiftScheduleType;
  overtimeHoursDay?: number;
  overtimeHoursNight?: number;
  sundayHolidayHoursDay?: number;
  sundayHolidayHoursNight?: number;
}

export interface GuardPayrollSimulationResult {
  reference: SvspSalaryReference2026;
  baseSalary: number;
  transportAllowance: number;
  overtimePay: number;
  nightSurcharges: number;
  sundayHolidaySurcharges: number;
  totalSalaryEarned: number; // Base imponible para salud y pensión
  healthDeduction: number; // 4.0%
  pensionDeduction: number; // 4.0%
  totalDeductions: number; // 8.0%
  fixedBonusNonSalary: number;
  vehicleAllowance: number;
  grossSalaryTotal: number; // Total devengado con auxilio y bonos
  netTakeHomePay: number; // Sueldo neto bancario
}

export class GuardSalaryCalculationEngine {
  public static readonly DEFAULT_SMMLV_2026 = 1750905.0;
  public static readonly DEFAULT_TRANSPORT_2026 = 249095.0;
  public static readonly DEFAULT_WEEKLY_HOURS_2026 = 44;

  private static round(val: number): number {
    return Math.round(val);
  }

  /**
   * Genera la tabla oficial de 8 tarifas horarias SVSP 2026
   */
  static getSalaryReference2026(
    smmlv = this.DEFAULT_SMMLV_2026,
    transport = this.DEFAULT_TRANSPORT_2026,
    weeklyHours = this.DEFAULT_WEEKLY_HOURS_2026,
  ): SvspSalaryReference2026 {
    const monthlyDivisorHours = weeklyHours * 5; // 44 * 5 = 220 horas
    const rawBaseHour = smmlv / monthlyDivisorHours; // 1.750.905 / 220 = 7.958,659...
    const baseHourlyRate = this.round(rawBaseHour); // $ 7.959

    const buildRate = (
      name: string,
      code: string,
      surchargePct: number,
    ): HourlyRateItem => {
      const surchargeValue = Math.floor(rawBaseHour * surchargePct);
      const totalHourlyRate = baseHourlyRate + surchargeValue;
      return {
        name,
        code,
        baseRate: baseHourlyRate,
        surchargePct,
        surchargeValue,
        totalHourlyRate,
      };
    };

    return {
      smmlv,
      transportAllowance: transport,
      totalMinimumGross: smmlv + transport,
      statutoryWeeklyHours: weeklyHours,
      monthlyDivisorHours,
      baseHourlyRate,
      hourlyRates: {
        ordinaryDay: {
          name: 'Ord. Diurna',
          code: 'ORD_DIUR',
          baseRate: baseHourlyRate,
          surchargePct: 0.0,
          surchargeValue: 0,
          totalHourlyRate: baseHourlyRate, // $ 7.959
        },
        ordinaryNight: buildRate('Ord. Nocturna', 'ORD_NOCT', 0.35), // $ 10.744 (Recargo: $ 2.785)
        overtimeDay: buildRate('Extra Diurna', 'EXT_DIUR', 0.25), // $ 9.948  (Recargo: $ 1.989)
        overtimeNight: buildRate('Extra Nocturna', 'EXT_NOCT', 0.75), // $ 13.927 (Recargo: $ 5.968)
        sundayHolidayOrdDay: buildRate('Dom/Fest Ord. Diur', 'DOM_ORD_D', 0.8), // $ 14.325 (Recargo: $ 6.366)
        sundayHolidayOrdNight: buildRate(
          'Dom/Fest Ord. Noct',
          'DOM_ORD_N',
          1.15,
        ), // $ 17.111 (Recargo: $ 9.152)
        sundayHolidayExtDay: buildRate('Dom/Fest Extra D.', 'DOM_EXT_D', 1.05), // $ 16.315 (Recargo: $ 8.356)
        sundayHolidayExtNight: buildRate(
          'Dom/Fest Extra N.',
          'DOM_EXT_N',
          1.55,
        ), // $ 20.294 (Recargo: $ 12.335)
      },
      shiftStructure: {
        ordinaryHoursPerShift: 8,
        extraHoursPerShift: 4,
        totalShiftHours: 12,
      },
      deductionRates: {
        healthPct: 0.04,
        pensionPct: 0.04,
      },
    };
  }

  /**
   * Simula la nómina integral de un guarda con deducciones de ley exactas
   */
  static simulateGuardPayroll(
    input: GuardPayrollSimulationInput,
  ): GuardPayrollSimulationResult {
    const ref = this.getSalaryReference2026(
      input.smmlv,
      input.transportAllowance,
      input.statutoryWeeklyHours,
    );

    const baseSalary = ref.smmlv;
    const transportAllowance = ref.transportAllowance;

    // Horas extras y recargos
    const overtimePay = this.round(
      (input.overtimeHoursDay ?? 0) *
        ref.hourlyRates.overtimeDay.totalHourlyRate +
        (input.overtimeHoursNight ?? 0) *
          ref.hourlyRates.overtimeNight.totalHourlyRate,
    );

    const nightSurcharges = this.round(
      (input.overtimeHoursNight ?? 0) *
        ref.hourlyRates.ordinaryNight.surchargeValue,
    );

    const sundayHolidaySurcharges = this.round(
      (input.sundayHolidayHoursDay ?? 0) *
        ref.hourlyRates.sundayHolidayOrdDay.surchargeValue +
        (input.sundayHolidayHoursNight ?? 0) *
          ref.hourlyRates.sundayHolidayOrdNight.surchargeValue,
    );

    // Base salarial para deducciones (excluye auxilio de transporte por ley)
    const totalSalaryEarned =
      baseSalary + overtimePay + nightSurcharges + sundayHolidaySurcharges;

    // Deducciones de Nómina (4.0% Salud + 4.0% Pensión)
    const healthDeduction = this.round(
      totalSalaryEarned * ref.deductionRates.healthPct,
    );
    const pensionDeduction = this.round(
      totalSalaryEarned * ref.deductionRates.pensionPct,
    );
    const totalDeductions = healthDeduction + pensionDeduction;

    const fixedBonusNonSalary = input.fixedBonusNonSalary ?? 0;
    const vehicleAllowance = input.vehicleAllowance ?? 0;

    const grossSalaryTotal =
      totalSalaryEarned +
      transportAllowance +
      fixedBonusNonSalary +
      vehicleAllowance;
    const netTakeHomePay = grossSalaryTotal - totalDeductions;

    return {
      reference: ref,
      baseSalary,
      transportAllowance,
      overtimePay,
      nightSurcharges,
      sundayHolidaySurcharges,
      totalSalaryEarned,
      healthDeduction,
      pensionDeduction,
      totalDeductions,
      fixedBonusNonSalary,
      vehicleAllowance,
      grossSalaryTotal,
      netTakeHomePay,
    };
  }
}
