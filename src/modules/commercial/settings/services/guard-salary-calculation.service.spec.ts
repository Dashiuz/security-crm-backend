import {
  GuardSalaryCalculationEngine,
  GuardPayrollSimulationInput,
} from './guard-salary-calculation.service';

describe('GuardSalaryCalculationEngine (Leyenda Oficial SVSP 2026)', () => {
  it('debe generar con exactitud milimétrica las 8 tarifas horarias oficiales de la SVSP 2026', () => {
    // Parámetros oficiales 2026:
    // SMMLV: $ 1.750.905
    // Divisor Mensual: 220 horas (44 horas semanales de acuerdo con la Ley 2101)
    // Base Hora Ordinaria Diurna: 1.750.905 / 220 = $ 7.958,66 -> $ 7.959
    const ref = GuardSalaryCalculationEngine.getSalaryReference2026(
      1750905.0,
      249095.0,
      44,
    );

    expect(ref.smmlv).toBe(1750905);
    expect(ref.transportAllowance).toBe(249095);
    expect(ref.totalMinimumGross).toBe(2000000);
    expect(ref.statutoryWeeklyHours).toBe(44);
    expect(ref.monthlyDivisorHours).toBe(220);
    expect(ref.baseHourlyRate).toBe(7959);

    // 1. Ord. Diurna (Base)
    expect(ref.hourlyRates.ordinaryDay.totalHourlyRate).toBe(7959);
    expect(ref.hourlyRates.ordinaryDay.surchargeValue).toBe(0);

    // 2. Ord. Nocturna (+35%) = $ 10.744 (Recargo: $ 2.785)
    expect(ref.hourlyRates.ordinaryNight.surchargeValue).toBe(2785);
    expect(ref.hourlyRates.ordinaryNight.totalHourlyRate).toBe(10744);

    // 3. Extra Diurna (+25%) = $ 9.948 (Recargo: $ 1.989)
    expect(ref.hourlyRates.overtimeDay.surchargeValue).toBe(1989);
    expect(ref.hourlyRates.overtimeDay.totalHourlyRate).toBe(9948);

    // 4. Extra Nocturna (+75%) = $ 13.927 (Recargo: $ 5.968)
    expect(ref.hourlyRates.overtimeNight.surchargeValue).toBe(5968);
    expect(ref.hourlyRates.overtimeNight.totalHourlyRate).toBe(13927);

    // 5. Dom/Fest Ord. Diur (+80%) = $ 14.325 (Recargo: $ 6.366)
    expect(ref.hourlyRates.sundayHolidayOrdDay.surchargeValue).toBe(6366);
    expect(ref.hourlyRates.sundayHolidayOrdDay.totalHourlyRate).toBe(14325);

    // 6. Dom/Fest Ord. Noct (+115%) = $ 17.111 (Recargo: $ 9.152)
    expect(ref.hourlyRates.sundayHolidayOrdNight.surchargeValue).toBe(9152);
    expect(ref.hourlyRates.sundayHolidayOrdNight.totalHourlyRate).toBe(17111);

    // 7. Dom/Fest Extra D. (+105%) = $ 16.315 (Recargo: $ 8.356)
    expect(ref.hourlyRates.sundayHolidayExtDay.surchargeValue).toBe(8356);
    expect(ref.hourlyRates.sundayHolidayExtDay.totalHourlyRate).toBe(16315);

    // 8. Dom/Fest Extra N. (+155%) = $ 20.294 (Recargo: $ 12.335)
    expect(ref.hourlyRates.sundayHolidayExtNight.surchargeValue).toBe(12335);
    expect(ref.hourlyRates.sundayHolidayExtNight.totalHourlyRate).toBe(20294);
  });

  it('debe validar la estructura de turno de 12 horas (8h ord + 4h ext)', () => {
    const ref = GuardSalaryCalculationEngine.getSalaryReference2026();
    expect(ref.shiftStructure.ordinaryHoursPerShift).toBe(8);
    expect(ref.shiftStructure.extraHoursPerShift).toBe(4);
    expect(ref.shiftStructure.totalShiftHours).toBe(12);
  });

  it('debe calcular deducciones de ley exactas (4% Salud + 4% Pensión sin auxilio de transporte)', () => {
    const input: GuardPayrollSimulationInput = {
      smmlv: 1750905.0,
      transportAllowance: 249095.0,
      statutoryWeeklyHours: 44,
      overtimeHoursNight: 10, // 10h extras nocturnas
      fixedBonusNonSalary: 100000.0,
    };

    const sim = GuardSalaryCalculationEngine.simulateGuardPayroll(input);

    // 10h extras nocturnas * $13.927 = $139.270
    expect(sim.overtimePay).toBe(139270);

    // Base imponible salarial para seguridad social (excluye auxilio de transporte)
    expect(sim.totalSalaryEarned).toBe(
      sim.baseSalary +
        sim.overtimePay +
        sim.nightSurcharges +
        sim.sundayHolidaySurcharges,
    );

    // 4% Salud y 4% Pensión
    const expectedHealth = Math.round(sim.totalSalaryEarned * 0.04);
    const expectedPension = Math.round(sim.totalSalaryEarned * 0.04);
    expect(sim.healthDeduction).toBe(expectedHealth);
    expect(sim.pensionDeduction).toBe(expectedPension);
    expect(sim.totalDeductions).toBe(expectedHealth + expectedPension);

    // Devengado total incluye bono no salarial y auxilio de transporte
    expect(sim.grossSalaryTotal).toBe(
      sim.totalSalaryEarned + sim.transportAllowance + 100000,
    );

    // Sueldo neto libre a retirar
    expect(sim.netTakeHomePay).toBe(sim.grossSalaryTotal - sim.totalDeductions);
  });
});
