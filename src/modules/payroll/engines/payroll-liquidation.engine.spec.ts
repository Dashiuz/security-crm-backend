import {
  PayrollLiquidationEngine,
  LiquidationEngineInput,
} from './payroll-liquidation.engine';
import {
  EmployeeSalaryMode,
  DependencySettlementType,
  LeaveAndAbsenceType,
  PayrollConceptNature,
  PayrollLineOrigin,
  PermanentConceptScope,
  NoveltyPeriodicityRule,
  NoveltyOriginType,
  ArlRiskClass,
} from '@prisma/client';

describe('PayrollLiquidationEngine', () => {
  const defaultSystemConcepts = {
    basicSalaryConcept: {
      id: 'c-1',
      code: 1,
      name: 'SUELDO BASICO',
      nature: PayrollConceptNature.DEVENGO,
    },
    transportConcept: {
      id: 'c-10',
      code: 10,
      name: 'AUXILIO DE TRANSPORTE LEGAL',
      nature: PayrollConceptNature.DEVENGO,
    },
    healthConcept: {
      id: 'c-601',
      code: 601,
      name: 'APORTE SALUD EMPLEADO (4%)',
      nature: PayrollConceptNature.SEG_SOCIAL,
    },
    pensionConcept: {
      id: 'c-602',
      code: 602,
      name: 'APORTE PENSION EMPLEADO (4%)',
      nature: PayrollConceptNature.SEG_SOCIAL,
    },
    fspConcept: {
      id: 'c-603',
      code: 603,
      name: 'FONDO SOLIDARIDAD PENSIONAL (1%)',
      nature: PayrollConceptNature.SEG_SOCIAL,
    },
    retefuenteConcept: {
      id: 'c-550',
      code: 550,
      name: 'RETENCION EN LA FUENTE',
      nature: PayrollConceptNature.DEDUCCION,
    },
    advanceConcept: {
      id: 'c-509',
      code: 509,
      name: 'ANTICIPO DE QUINCENA',
      nature: PayrollConceptNature.DEDUCCION,
    },
    nightSurchargeConcept: {
      id: 'c-2',
      code: 2,
      name: 'RECARGO NOCTURNO (35%)',
      nature: PayrollConceptNature.DEVENGO,
    },
    extraDayConcept: {
      id: 'c-3',
      code: 3,
      name: 'HORAS EXTRAS DIURNAS (125%)',
      nature: PayrollConceptNature.DEVENGO,
    },
    extraNightConcept: {
      id: 'c-4',
      code: 4,
      name: 'HORAS EXTRAS NOCTURNAS (175%)',
      nature: PayrollConceptNature.DEVENGO,
    },
  };

  const defaultSettings = {
    smmlv: 1750905.0,
    transportAllowance: 249095.0,
    uvtValue: 49799.0,
    monthlyDivisorHours: 220,
    transportTopSmmlvMultiple: 2,
    enforceUgpp40PctRule: true,
    applyExonerationLaw1607: true,
    normalHourFactorPct: 100.0,
    nightSurchargePct: 35.0,
    extraDayPct: 125.0,
    extraNightPct: 175.0,
    employeeHealthPct: 4.0,
    employeePensionPct: 4.0,
    fspBasePct: 1.0,
    employerHealthPct: 8.5,
    employerPensionPct: 12.0,
    ccfPct: 4.0,
    senaPct: 2.0,
    icbfPct: 3.0,
  };

  it('should liquidate full 30-day month for standard MINIMUM_WAGE employee', () => {
    const input: LiquidationEngineInput = {
      employee: {
        id: 'emp-1',
        document: '1010123456',
        fullName: 'JUAN PEREZ GUARDA',
        payrollProfile: {
          salaryMode: EmployeeSalaryMode.MINIMUM_WAGE,
          customBaseSalary: 1750905.0,
          hasTransportAllowance: true,
          arlRiskClass: ArlRiskClass.RISK_IV,
        },
      },
      period: {
        id: 'per-1',
        year: 2026,
        month: 10,
        periodNumber: 3, // Mensual
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
      settings: defaultSettings,
      systemConcepts: defaultSystemConcepts,
    };

    const res = PayrollLiquidationEngine.calculate(input);

    expect(res.workedDays).toBe(30);
    expect(res.basicSalaryEarned).toBe(1750905.0);
    expect(res.transportAllowanceAmount).toBe(249095.0);
    expect(res.totalEarnings).toBe(1750905.0 + 249095.0); // 2.000.000
    expect(res.ibcEps).toBe(1750905.0);
    expect(res.healthEmployeeAmount).toBe(
      Math.round(1750905.0 * 0.04 * 100) / 100,
    ); // 70036.2
    expect(res.pensionEmployeeAmount).toBe(
      Math.round(1750905.0 * 0.04 * 100) / 100,
    ); // 70036.2
    expect(res.fspAmount).toBe(0);
    expect(res.withholdingTaxAmount).toBe(0);
    expect(res.netPayAmount).toBe(
      res.totalEarnings -
        (res.healthEmployeeAmount + res.pensionEmployeeAmount),
    );
    expect(res.isExoneratedLaw1607).toBe(true);
    expect(res.employerHealthAmount).toBe(0); // Exonerado
    expect(res.employerPensionAmount).toBe(
      Math.round(1750905.0 * 0.12 * 100) / 100,
    );
    expect(res.employerArlAmount).toBe(
      Math.round(1750905.0 * 0.0435 * 100) / 100,
    );
  });

  it('should liquidate multi-dependency rotation by average guaranteed modality', () => {
    const input: LiquidationEngineInput = {
      employee: {
        id: 'emp-2',
        document: '1020234567',
        fullName: 'PEDRO GOMEZ RELEVANTE',
        payrollProfile: {
          salaryMode: EmployeeSalaryMode.BY_DEPENDENCY,
          customBaseSalary: 1750905.0,
          hasTransportAllowance: true,
          arlRiskClass: ArlRiskClass.RISK_IV,
        },
      },
      period: {
        id: 'per-2',
        year: 2026,
        month: 11,
        periodNumber: 3,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
      settings: defaultSettings,
      systemConcepts: defaultSystemConcepts,
      dependencyAssignments: [
        {
          id: 'ass-1',
          dependencyId: 'dep-1',
          startDate: '2026-11-01',
          endDate: '2026-11-15',
          isPrimary: true,
          dependency: {
            id: 'dep-1',
            code: 101,
            name: 'PUESTO CONJUNTO A',
            monthlyPaidValue: 2000000.0,
            settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
            arlRiskClass: ArlRiskClass.RISK_IV,
            modality: {
              items: [
                {
                  conceptId: defaultSystemConcepts.nightSurchargeConcept.id,
                  concept: defaultSystemConcepts.nightSurchargeConcept,
                  percentage: 100.0,
                },
              ],
            },
          },
        },
        {
          id: 'ass-2',
          dependencyId: 'dep-2',
          startDate: '2026-11-16',
          endDate: '2026-11-30',
          isPrimary: false,
          dependency: {
            id: 'dep-2',
            code: 102,
            name: 'PUESTO BANCO B',
            monthlyPaidValue: 2200000.0,
            settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
            arlRiskClass: ArlRiskClass.RISK_IV,
            modality: {
              items: [
                {
                  conceptId: defaultSystemConcepts.nightSurchargeConcept.id,
                  concept: defaultSystemConcepts.nightSurchargeConcept,
                  percentage: 100.0,
                },
              ],
            },
          },
        },
      ],
    };

    const res = PayrollLiquidationEngine.calculate(input);

    expect(res.workedDays).toBe(30);
    // Span 1: 15 days of 2.000.000 -> 1.000.000 (Base SMMLV: 875.452.5, Excess: 124.547.5)
    // Span 2: 15 days of 2.200.000 -> 1.100.000 (Base SMMLV: 875.452.5, Excess: 224.547.5)
    expect(res.basicSalaryEarned).toBe(1750905.0);
    expect(res.overtimeAndSurchargesAmount).toBe(124547.5 + 224547.5);
    expect(
      res.lines.some((l) => l.origin === PayrollLineOrigin.MODALITY_GUARANTEED),
    ).toBe(true);
  });

  it('should enforce UGPP 40% rule and increase IBC when non-salarial payments exceed 40%', () => {
    const input: LiquidationEngineInput = {
      employee: {
        id: 'emp-3',
        document: '1030345678',
        fullName: 'CARLOS ALVAREZ SUPERVISOR',
        payrollProfile: {
          salaryMode: EmployeeSalaryMode.CUSTOM_FIXED,
          customBaseSalary: 3000000.0,
          hasTransportAllowance: false,
          arlRiskClass: ArlRiskClass.RISK_I,
        },
      },
      period: {
        id: 'per-3',
        year: 2026,
        month: 10,
        periodNumber: 3,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
      settings: defaultSettings,
      systemConcepts: defaultSystemConcepts,
      permanentConcepts: [
        {
          id: 'perm-1',
          conceptId: 'c-20',
          concept: {
            id: 'c-20',
            code: 20,
            name: 'BONO DE MERA LIBERALIDAD NO SALARIAL',
            nature: PayrollConceptNature.DEVENGO,
            isConstitutiveOfSalary: false,
            inUgpp40Pct: true,
          },
          scope: PermanentConceptScope.BY_EMPLOYEE,
          amount: 3000000.0, // 3M Salarial + 3M No Salarial = 6M Remuneración Total. 40% de 6M = 2.4M. Exceso = 600.000
          isProportionalToDays: false,
          applicationRule: NoveltyPeriodicityRule.ALL_PERIODS,
        },
      ],
    };

    const res = PayrollLiquidationEngine.calculate(input);

    expect(res.basicSalaryEarned).toBe(3000000.0);
    expect(res.bonusesNonSalarialAmount).toBe(3000000.0);
    expect(res.ugppTotalRemuneration).toBe(6000000.0);
    expect(res.ugppLimit40Pct).toBe(2400000.0);
    expect(res.ugppExcessAmount).toBe(600000.0);
    expect(res.ibcEps).toBe(3000000.0 + 600000.0); // 3.600.000
  });

  it('should deduct FSP (Fondo de Solidaridad Pensional) when IBC >= 4 SMMLV', () => {
    // 4 SMMLV = 4 * 1.750.905 = 7.003.620
    const input: LiquidationEngineInput = {
      employee: {
        id: 'emp-4',
        document: '1040456789',
        fullName: 'DIANA DIRECTORA OPERATIVA',
        payrollProfile: {
          salaryMode: EmployeeSalaryMode.CUSTOM_FIXED,
          customBaseSalary: 8000000.0,
          hasTransportAllowance: false,
          isPensioner: false,
        },
      },
      period: {
        id: 'per-4',
        year: 2026,
        month: 10,
        periodNumber: 3,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
      settings: defaultSettings,
      systemConcepts: defaultSystemConcepts,
    };

    const res = PayrollLiquidationEngine.calculate(input);

    expect(res.ibcAfp).toBe(8000000.0);
    expect(res.fspAmount).toBe(80000.0); // 1.0% de 8.000.000
    expect(res.lines.some((l) => l.conceptCode === 603)).toBe(true);
  });

  it('should deduct loan installment and fortnight advance in monthly closure', () => {
    const input: LiquidationEngineInput = {
      employee: {
        id: 'emp-5',
        document: '1050567890',
        fullName: 'LUIS PRÉSTAMO',
        payrollProfile: {
          salaryMode: EmployeeSalaryMode.MINIMUM_WAGE,
          customBaseSalary: 1750905.0,
          hasTransportAllowance: true,
        },
      },
      period: {
        id: 'per-5',
        year: 2026,
        month: 10,
        periodNumber: 3,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
      settings: defaultSettings,
      systemConcepts: defaultSystemConcepts,
      activeLoans: [
        {
          id: 'loan-1',
          loanCode: 'PR-2026-001',
          conceptId: 'c-501',
          concept: {
            id: 'c-501',
            code: 501,
            name: 'PRESTAMO EMPRESA',
            nature: PayrollConceptNature.DEDUCCION,
          },
          installmentAmount: 150000.0,
          remainingBalance: 450000.0,
          deductionRule: NoveltyPeriodicityRule.ALL_PERIODS,
        },
      ],
      pendingAdvanceItem: {
        id: 'adv-1',
        approvedAmount: 500000.0,
        isDeductedInPayroll: false,
      },
    };

    const res = PayrollLiquidationEngine.calculate(input);

    expect(res.loansDeductionAmount).toBe(150000.0);
    expect(res.advanceDeductionAmount).toBe(500000.0);
    expect(
      res.lines.some((l) => l.origin === PayrollLineOrigin.LOAN_INSTALLMENT),
    ).toBe(true);
    expect(
      res.lines.some((l) => l.origin === PayrollLineOrigin.FORTNIGHT_ADVANCE),
    ).toBe(true);
  });

  it('should deduct seventh day on unjustified absence (Art. 173 CST)', () => {
    const input: LiquidationEngineInput = {
      employee: {
        id: 'emp-6',
        document: '1060678901',
        fullName: 'ANDRES FALTA',
        payrollProfile: {
          salaryMode: EmployeeSalaryMode.MINIMUM_WAGE,
          customBaseSalary: 1750905.0,
          hasTransportAllowance: true,
        },
      },
      period: {
        id: 'per-6',
        year: 2026,
        month: 10,
        periodNumber: 3,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
      settings: defaultSettings,
      systemConcepts: defaultSystemConcepts,
      leaves: [
        {
          id: 'leave-1',
          leaveType: LeaveAndAbsenceType.UNJUSTIFIED_ABSENCE_AUS,
          conceptId: 'c-504',
          concept: {
            id: 'c-504',
            code: 504,
            name: 'TURNO NO LABORADO',
            nature: PayrollConceptNature.DEDUCCION,
          },
          startDate: '2026-10-05',
          endDate: '2026-10-05',
          totalDays: 1,
          employerDays: 0,
          entityDays: 0,
          employerRecognizedAmount: 0,
          entityRecognizedAmount: 0,
          totalLiquidatedAmount: 58363.5,
          affectsSeventhDay: true,
        },
      ],
    };

    const res = PayrollLiquidationEngine.calculate(input);

    expect(res.unpaidAbsenceDays).toBe(1);
    expect(res.seventhDaysLost).toBe(1);
    expect(res.workedDays).toBe(29);
    expect(
      res.lines.some(
        (l) => l.origin === PayrollLineOrigin.SEVENTH_DAY_DEDUCTION,
      ),
    ).toBe(true);
  });
});
