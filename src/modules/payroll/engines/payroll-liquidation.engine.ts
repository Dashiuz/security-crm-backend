import { Injectable } from '@nestjs/common';
import {
  EmployeeSalaryMode,
  DependencySettlementType,
  LeaveAndAbsenceType,
  ShiftDayCode,
  PayrollConceptNature,
  PayrollLineOrigin,
  PermanentConceptScope,
  NoveltyPeriodicityRule,
  NoveltyOriginType,
  ArlRiskClass,
} from '@prisma/client';
import { ModalityBreakdownEngine } from './modality-breakdown.engine';

export interface ConceptMini {
  id: string;
  code: number;
  name: string;
  nature: PayrollConceptNature;
  inUgpp40Pct?: boolean;
  inIbcEpsAfp?: boolean;
  inIbcArl?: boolean;
  inIbcCcf?: boolean;
  isConstitutiveOfSalary?: boolean;
}

export interface DependencyWithModality {
  id: string;
  code: number;
  name: string;
  monthlyPaidValue: number;
  settlementType: DependencySettlementType;
  arlRiskClass: ArlRiskClass;
  modality?: {
    items: Array<{
      conceptId: string;
      concept: ConceptMini;
      percentage: number | string;
    }>;
  } | null;
}

export interface DependencyAssignmentInput {
  id: string;
  dependencyId: string;
  startDate: Date | string;
  endDate: Date | string | null;
  isPrimary: boolean;
  dependency: DependencyWithModality;
}

export interface ShiftRecordInput {
  shiftDate: Date | string;
  shiftCode: ShiftDayCode;
  isReinforcement: boolean;
  dependencyId: string;
  ordinaryDayHours: number;
  nightSurchargeHours: number;
  sundayHolidayHours: number;
  overtimeDayHours: number;
  overtimeNightHours: number;
  overtimeHolidayDayHours: number;
  overtimeHolidayNightHours: number;
  leaveId?: string | null;
}

export interface LeaveInput {
  id: string;
  leaveType: LeaveAndAbsenceType;
  conceptId: string;
  concept: ConceptMini;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  employerDays: number;
  entityDays: number;
  employerRecognizedAmount: number;
  entityRecognizedAmount: number;
  totalLiquidatedAmount: number;
  affectsSeventhDay: boolean;
}

export interface PermanentConceptInput {
  id: string;
  conceptId: string;
  concept: ConceptMini;
  scope: PermanentConceptScope;
  dependencyId?: string | null;
  amount: number;
  isProportionalToDays: boolean;
  applicationRule: NoveltyPeriodicityRule;
}

export interface PeriodNoveltyInput {
  id: string;
  conceptId: string;
  concept: ConceptMini;
  dependencyId?: string | null;
  quantity: number;
  unitValue: number;
  totalValue: number;
  origin: NoveltyOriginType;
}

export interface LoanInput {
  id: string;
  loanCode: string;
  conceptId: string;
  concept: ConceptMini;
  installmentAmount: number;
  remainingBalance: number;
  deductionRule: NoveltyPeriodicityRule;
}

export interface LiquidationEngineInput {
  employee: {
    id: string;
    document: string;
    fullName: string;
    entryDate?: Date | string | null;
    retiredAt?: Date | string | null;
    payrollProfile?: {
      salaryMode: EmployeeSalaryMode;
      customBaseSalary: number;
      hasTransportAllowance: boolean;
      customAdvanceValue?: number | null;
      isPensioner?: boolean;
      pilaContributorType?: string;
      arlRiskClass?: ArlRiskClass;
      primaryDependencyId?: string | null;
      branchId?: string | null;
      bankId?: string | null;
      bankAccountType?: any;
      bankAccountNumber?: string | null;
    } | null;
    primaryDependency?: DependencyWithModality | null;
  };
  period: {
    id: string;
    year: number;
    month: number;
    periodNumber: number; // 1 = 1ra quincena, 2 = 2da quincena, 3 = mensual
    startDate: Date | string;
    endDate: Date | string;
  };
  settings: {
    smmlv: number;
    transportAllowance: number;
    uvtValue: number;
    monthlyDivisorHours: number;
    transportTopSmmlvMultiple?: number;
    enforceUgpp40PctRule?: boolean;
    applyExonerationLaw1607?: boolean;
    normalHourFactorPct?: number;
    nightSurchargePct?: number;
    extraDayPct?: number;
    extraNightPct?: number;
    sundayCompensatedPct?: number;
    holidaySurchargePct?: number;
    extraHolidayDayPct?: number;
    extraHolidayNightPct?: number;
    employeeHealthPct?: number;
    employeePensionPct?: number;
    fspBasePct?: number;
    employerHealthPct?: number;
    employerPensionPct?: number;
    ccfPct?: number;
    senaPct?: number;
    icbfPct?: number;
  };
  dependencyAssignments?: DependencyAssignmentInput[];
  shiftRecords?: ShiftRecordInput[];
  leaves?: LeaveInput[];
  permanentConcepts?: PermanentConceptInput[];
  periodNovelties?: PeriodNoveltyInput[];
  activeLoans?: LoanInput[];
  pendingAdvanceItem?: {
    id: string;
    approvedAmount: number;
    isDeductedInPayroll: boolean;
  } | null;
  systemConcepts: {
    basicSalaryConcept: ConceptMini;
    transportConcept: ConceptMini;
    healthConcept: ConceptMini;
    pensionConcept: ConceptMini;
    fspConcept: ConceptMini;
    retefuenteConcept: ConceptMini;
    advanceConcept: ConceptMini;
    nightSurchargeConcept?: ConceptMini;
    extraDayConcept?: ConceptMini;
    extraNightConcept?: ConceptMini;
    holidaySurchargeConcept?: ConceptMini;
    sundayCompensatedConcept?: ConceptMini;
    extraHolidayDayConcept?: ConceptMini;
    extraHolidayNightConcept?: ConceptMini;
  };
}

export interface GeneratedSettlementLine {
  conceptId: string;
  conceptCode: number;
  conceptName: string;
  dependencyId?: string | null;
  nature: PayrollConceptNature;
  origin: PayrollLineOrigin;
  quantity: number;
  unitValue: number;
  totalValue: number;
  isConstitutiveOfSalary: boolean;
  isDeletable: boolean;
  inIbcEpsAfp: boolean;
  inIbcArl: boolean;
  inIbcCcf: boolean;
  inUgpp40Pct: boolean;
  loanId?: string | null;
  leaveId?: string | null;
  notes?: string;
}

export interface LiquidationEngineResult {
  workedDays: number;
  paidLeaveDays: number;
  incapacityDays: number;
  vacationDays: number;
  unpaidAbsenceDays: number;
  seventhDaysLost: number;
  salaryModeSnapshot: EmployeeSalaryMode;
  baseSalaryMonthly: number;
  basicSalaryEarned: number;
  transportAllowanceAmount: number;
  overtimeAndSurchargesAmount: number;
  leavesAndIncapacitiesAmount: number;
  bonusesNonSalarialAmount: number;
  otherEarningsAmount: number;
  totalEarnings: number;
  ugppTotalRemuneration: number;
  ugppLimit40Pct: number;
  ugppNonSalarialTotal: number;
  ugppExcessAmount: number;
  ibcEps: number;
  ibcAfp: number;
  ibcArl: number;
  ibcCcf: number;
  healthEmployeeAmount: number;
  pensionEmployeeAmount: number;
  fspAmount: number;
  withholdingTaxAmount: number;
  loansDeductionAmount: number;
  advanceDeductionAmount: number;
  otherDeductionsAmount: number;
  totalDeductions: number;
  netPayAmount: number;
  isExoneratedLaw1607: boolean;
  employerHealthAmount: number;
  employerPensionAmount: number;
  employerArlAmount: number;
  employerCcfAmount: number;
  employerSenaAmount: number;
  employerIcbfAmount: number;
  totalEmployerCost: number;
  primaryDependencyId?: string | null;
  lines: GeneratedSettlementLine[];
}

@Injectable()
export class PayrollLiquidationEngine {
  calculate(input: LiquidationEngineInput): LiquidationEngineResult {
    return PayrollLiquidationEngine.calculate(input);
  }

  private static round(val: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((val + Number.EPSILON) * factor) / factor;
  }

  private static parseUtcDate(input: Date | string): Date {
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-');
      return new Date(
        Date.UTC(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10),
        ),
      );
    }
    return new Date(
      Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
    );
  }

  /**
   * Main calculation pipeline
   */
  public static calculate(
    input: LiquidationEngineInput,
  ): LiquidationEngineResult {
    const { employee, period, settings, systemConcepts } = input;
    const profile = employee.payrollProfile;
    const modalityEngine = new ModalityBreakdownEngine();

    const pStart = this.parseUtcDate(period.startDate);
    const pEnd = this.parseUtcDate(period.endDate);

    const isFortnight = period.periodNumber === 1 || period.periodNumber === 2;
    const standardDays = isFortnight ? 15 : 30;

    // 1. Resolve effective contract window within period
    const empEntry = employee.entryDate
      ? this.parseUtcDate(employee.entryDate)
      : null;
    const empExit = employee.retiredAt
      ? this.parseUtcDate(employee.retiredAt)
      : null;

    const effStart = empEntry && empEntry > pStart ? empEntry : pStart;
    const effEnd = empExit && empExit < pEnd ? empExit : pEnd;

    const isPartialMonth =
      (empEntry && empEntry > pStart) || (empExit && empExit < pEnd);

    let contractDaysInPeriod = standardDays;
    if (isPartialMonth) {
      const diffMs = effEnd.getTime() - effStart.getTime();
      const calDays = Math.max(0, Math.round(diffMs / 86400000) + 1);
      contractDaysInPeriod = Math.min(standardDays, calDays);
    }

    // 2. Classify leaves in period
    const periodLeaves = input.leaves || [];
    let paidLeaveDays = 0;
    let incapacityDays = 0;
    let vacationDays = 0;
    let unpaidAbsenceDays = 0;
    let seventhDaysLost = 0;

    for (const l of periodLeaves) {
      const lStart = this.parseUtcDate(l.startDate);
      const lEnd = this.parseUtcDate(l.endDate);

      // Overlap with period
      const oStart = lStart > pStart ? lStart : pStart;
      const oEnd = lEnd < pEnd ? lEnd : pEnd;
      if (oStart <= oEnd) {
        const days =
          Math.round((oEnd.getTime() - oStart.getTime()) / 86400000) + 1;
        switch (l.leaveType) {
          case LeaveAndAbsenceType.SICK_LEAVE_EG:
          case LeaveAndAbsenceType.WORK_ACCIDENT_AT:
            incapacityDays += days;
            break;
          case LeaveAndAbsenceType.MATERNITY_PATERNITY_LMA:
          case LeaveAndAbsenceType.PAID_LEAVE_LR:
            paidLeaveDays += days;
            break;
          case LeaveAndAbsenceType.VACATION_TIME_VAC:
            vacationDays += days;
            break;
          case LeaveAndAbsenceType.UNPAID_LEAVE_LNR:
          case LeaveAndAbsenceType.DISCIPLINARY_SUSPENSION_SAN:
          case LeaveAndAbsenceType.UNJUSTIFIED_ABSENCE_AUS:
            unpaidAbsenceDays += days;
            if (l.affectsSeventhDay) {
              // Lose 1 seventh day per absence period
              seventhDaysLost += Math.max(1, Math.floor(days / 6));
            }
            break;
        }
      }
    }

    const totalOffDays =
      paidLeaveDays + incapacityDays + vacationDays + unpaidAbsenceDays;
    const workedDays = Math.max(0, contractDaysInPeriod - totalOffDays);

    // 3. Resolve Salary Mode and Base Salary
    const salaryMode = profile?.salaryMode || EmployeeSalaryMode.BY_DEPENDENCY;
    const smmlv = settings.smmlv || 1750905.0;
    let baseSalaryMonthly = smmlv;

    if (salaryMode === EmployeeSalaryMode.MINIMUM_WAGE) {
      baseSalaryMonthly = smmlv;
    } else if (salaryMode === EmployeeSalaryMode.CUSTOM_FIXED) {
      baseSalaryMonthly = Number(profile?.customBaseSalary || smmlv);
    }

    const generatedLines: GeneratedSettlementLine[] = [];

    // 4. Resolve Dependency Spans / Assignment
    const assignments = (input.dependencyAssignments || []).filter((a) => {
      const aStart = this.parseUtcDate(a.startDate);
      const aEnd = a.endDate ? this.parseUtcDate(a.endDate) : pEnd;
      return aStart <= pEnd && aEnd >= pStart;
    });

    let primaryDepId =
      profile?.primaryDependencyId || employee.primaryDependency?.id || null;
    if (assignments.length > 0 && !primaryDepId) {
      const primaryAss = assignments.find((a) => a.isPrimary) || assignments[0];
      primaryDepId = primaryAss.dependencyId;
    }

    let basicSalaryEarned = 0;
    let overtimeAndSurchargesAmount = 0;

    if (
      salaryMode === EmployeeSalaryMode.CUSTOM_FIXED ||
      salaryMode === EmployeeSalaryMode.MINIMUM_WAGE
    ) {
      // Direct proportion
      const earned = this.round((baseSalaryMonthly / 30.0) * workedDays);
      basicSalaryEarned += earned;

      generatedLines.push({
        conceptId: systemConcepts.basicSalaryConcept.id,
        conceptCode: systemConcepts.basicSalaryConcept.code,
        conceptName: systemConcepts.basicSalaryConcept.name,
        dependencyId: primaryDepId,
        nature: PayrollConceptNature.DEVENGO,
        origin: PayrollLineOrigin.DEPENDENCY_SPAN,
        quantity: workedDays,
        unitValue: this.round(baseSalaryMonthly / 30.0),
        totalValue: earned,
        isConstitutiveOfSalary: true,
        isDeletable: false,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inUgpp40Pct: false,
      });

      // Shift hours if any
      const shiftRecords = input.shiftRecords || [];
      const hourlyRate = this.round(
        baseSalaryMonthly / (settings.monthlyDivisorHours || 220),
      );

      for (const rec of shiftRecords) {
        if (
          Number(rec.nightSurchargeHours) > 0 &&
          systemConcepts.nightSurchargeConcept
        ) {
          const val = this.round(
            Number(rec.nightSurchargeHours) *
              hourlyRate *
              ((settings.nightSurchargePct || 35) / 100),
          );
          overtimeAndSurchargesAmount += val;
          generatedLines.push({
            conceptId: systemConcepts.nightSurchargeConcept.id,
            conceptCode: systemConcepts.nightSurchargeConcept.code,
            conceptName: systemConcepts.nightSurchargeConcept.name,
            dependencyId: rec.dependencyId,
            nature: PayrollConceptNature.DEVENGO,
            origin: PayrollLineOrigin.SHIFT_SCHEDULE,
            quantity: Number(rec.nightSurchargeHours),
            unitValue: this.round(
              hourlyRate * ((settings.nightSurchargePct || 35) / 100),
            ),
            totalValue: val,
            isConstitutiveOfSalary: true,
            isDeletable: true,
            inIbcEpsAfp: true,
            inIbcArl: true,
            inIbcCcf: true,
            inUgpp40Pct: false,
          });
        }
        if (
          Number(rec.overtimeDayHours) > 0 &&
          systemConcepts.extraDayConcept
        ) {
          const val = this.round(
            Number(rec.overtimeDayHours) *
              hourlyRate *
              ((settings.extraDayPct || 125) / 100),
          );
          overtimeAndSurchargesAmount += val;
          generatedLines.push({
            conceptId: systemConcepts.extraDayConcept.id,
            conceptCode: systemConcepts.extraDayConcept.code,
            conceptName: systemConcepts.extraDayConcept.name,
            dependencyId: rec.dependencyId,
            nature: PayrollConceptNature.DEVENGO,
            origin: PayrollLineOrigin.SHIFT_SCHEDULE,
            quantity: Number(rec.overtimeDayHours),
            unitValue: this.round(
              hourlyRate * ((settings.extraDayPct || 125) / 100),
            ),
            totalValue: val,
            isConstitutiveOfSalary: true,
            isDeletable: true,
            inIbcEpsAfp: true,
            inIbcArl: true,
            inIbcCcf: true,
            inUgpp40Pct: false,
          });
        }
        if (
          Number(rec.overtimeNightHours) > 0 &&
          systemConcepts.extraNightConcept
        ) {
          const val = this.round(
            Number(rec.overtimeNightHours) *
              hourlyRate *
              ((settings.extraNightPct || 175) / 100),
          );
          overtimeAndSurchargesAmount += val;
          generatedLines.push({
            conceptId: systemConcepts.extraNightConcept.id,
            conceptCode: systemConcepts.extraNightConcept.code,
            conceptName: systemConcepts.extraNightConcept.name,
            dependencyId: rec.dependencyId,
            nature: PayrollConceptNature.DEVENGO,
            origin: PayrollLineOrigin.SHIFT_SCHEDULE,
            quantity: Number(rec.overtimeNightHours),
            unitValue: this.round(
              hourlyRate * ((settings.extraNightPct || 175) / 100),
            ),
            totalValue: val,
            isConstitutiveOfSalary: true,
            isDeletable: true,
            inIbcEpsAfp: true,
            inIbcArl: true,
            inIbcCcf: true,
            inUgpp40Pct: false,
          });
        }
      }
    } else {
      // BY_DEPENDENCY
      if (assignments.length === 0) {
        // Fallback to employee primary dependency or SMMLV
        const fallbackDep = employee.primaryDependency;
        const depPaidValue = fallbackDep
          ? Number(fallbackDep.monthlyPaidValue)
          : smmlv;
        baseSalaryMonthly = depPaidValue;

        const earned = this.round((depPaidValue / 30.0) * workedDays);
        basicSalaryEarned += earned;

        generatedLines.push({
          conceptId: systemConcepts.basicSalaryConcept.id,
          conceptCode: systemConcepts.basicSalaryConcept.code,
          conceptName: systemConcepts.basicSalaryConcept.name,
          dependencyId: fallbackDep?.id || null,
          nature: PayrollConceptNature.DEVENGO,
          origin: PayrollLineOrigin.DEPENDENCY_SPAN,
          quantity: workedDays,
          unitValue: this.round(depPaidValue / 30.0),
          totalValue: earned,
          isConstitutiveOfSalary: true,
          isDeletable: false,
          inIbcEpsAfp: true,
          inIbcArl: true,
          inIbcCcf: true,
          inUgpp40Pct: false,
        });
      } else {
        // Divide worked days among assignments proportionally
        let remainingWorkedDays = workedDays;
        baseSalaryMonthly = Number(
          assignments[0].dependency.monthlyPaidValue || smmlv,
        );

        for (let i = 0; i < assignments.length; i++) {
          const ass = assignments[i];
          const dep = ass.dependency;
          const aStart = this.parseUtcDate(ass.startDate);
          const aEnd = ass.endDate ? this.parseUtcDate(ass.endDate) : pEnd;

          const cStart = aStart > pStart ? aStart : pStart;
          const cEnd = aEnd < pEnd ? aEnd : pEnd;

          const spanCalDays = Math.max(
            1,
            Math.round((cEnd.getTime() - cStart.getTime()) / 86400000) + 1,
          );
          const spanDays = Math.min(
            remainingWorkedDays,
            i === assignments.length - 1
              ? remainingWorkedDays
              : Math.min(spanCalDays, remainingWorkedDays),
          );
          remainingWorkedDays -= spanDays;

          if (spanDays <= 0) continue;

          if (
            dep.settlementType ===
              DependencySettlementType.BY_AVERAGE_GUARANTEED &&
            dep.modality?.items?.length
          ) {
            // Apply modality breakdown
            const items = dep.modality.items.map((it) => ({
              conceptId: it.conceptId,
              conceptCode: it.concept.code,
              conceptName: it.concept.name,
              percentage: Number(it.percentage),
            }));

            const breakdown = modalityEngine.calculateBreakdown({
              monthlyPaidValue: Number(dep.monthlyPaidValue),
              smmlv,
              daysWorked: spanDays,
              items,
            });

            basicSalaryEarned += breakdown.baseSalary;
            generatedLines.push({
              conceptId: systemConcepts.basicSalaryConcept.id,
              conceptCode: systemConcepts.basicSalaryConcept.code,
              conceptName: systemConcepts.basicSalaryConcept.name,
              dependencyId: dep.id,
              nature: PayrollConceptNature.DEVENGO,
              origin: PayrollLineOrigin.DEPENDENCY_SPAN,
              quantity: spanDays,
              unitValue: this.round(smmlv / 30.0),
              totalValue: breakdown.baseSalary,
              isConstitutiveOfSalary: true,
              isDeletable: false,
              inIbcEpsAfp: true,
              inIbcArl: true,
              inIbcCcf: true,
              inUgpp40Pct: false,
            });

            for (const it of breakdown.breakdownItems) {
              overtimeAndSurchargesAmount += it.calculatedValue;
              generatedLines.push({
                conceptId: it.conceptId,
                conceptCode: it.conceptCode,
                conceptName: it.conceptName,
                dependencyId: dep.id,
                nature: PayrollConceptNature.DEVENGO,
                origin: PayrollLineOrigin.MODALITY_GUARANTEED,
                quantity: spanDays,
                unitValue: it.calculatedValue,
                totalValue: it.calculatedValue,
                isConstitutiveOfSalary: true,
                isDeletable: true,
                inIbcEpsAfp: true,
                inIbcArl: true,
                inIbcCcf: true,
                inUgpp40Pct: false,
              });
            }
          } else {
            // BY_SCHEDULE or FIXED
            const earned = this.round(
              (Number(dep.monthlyPaidValue) / 30.0) * spanDays,
            );
            basicSalaryEarned += earned;

            generatedLines.push({
              conceptId: systemConcepts.basicSalaryConcept.id,
              conceptCode: systemConcepts.basicSalaryConcept.code,
              conceptName: systemConcepts.basicSalaryConcept.name,
              dependencyId: dep.id,
              nature: PayrollConceptNature.DEVENGO,
              origin: PayrollLineOrigin.DEPENDENCY_SPAN,
              quantity: spanDays,
              unitValue: this.round(Number(dep.monthlyPaidValue) / 30.0),
              totalValue: earned,
              isConstitutiveOfSalary: true,
              isDeletable: false,
              inIbcEpsAfp: true,
              inIbcArl: true,
              inIbcCcf: true,
              inUgpp40Pct: false,
            });
          }
        }
      }

      // Reinforcement shifts (turnos de refuerzo R)
      const reinforcements = (input.shiftRecords || []).filter(
        (r) => r.isReinforcement,
      );
      for (const reinf of reinforcements) {
        const hourlyRate = this.round(
          smmlv / (settings.monthlyDivisorHours || 220),
        );
        const hours = Number(reinf.ordinaryDayHours) || 12;
        const totalReinfVal = this.round(
          hours * hourlyRate * ((settings.extraDayPct || 125) / 100),
        );
        overtimeAndSurchargesAmount += totalReinfVal;

        generatedLines.push({
          conceptId: systemConcepts.basicSalaryConcept.id,
          conceptCode: 999, // Concepto de refuerzo
          conceptName: 'TURNO DE REFUERZO OPERATIVO (R)',
          dependencyId: reinf.dependencyId,
          nature: PayrollConceptNature.DEVENGO,
          origin: PayrollLineOrigin.REINFORCEMENT,
          quantity: hours,
          unitValue: hourlyRate,
          totalValue: totalReinfVal,
          isConstitutiveOfSalary: true,
          isDeletable: true,
          inIbcEpsAfp: true,
          inIbcArl: true,
          inIbcCcf: true,
          inUgpp40Pct: false,
        });
      }
    }

    // 5. Transport Allowance
    let transportAllowanceAmount = 0;
    const hasTransport = profile?.hasTransportAllowance !== false;
    const topMultiple = settings.transportTopSmmlvMultiple || 2;
    if (
      hasTransport &&
      baseSalaryMonthly <= smmlv * topMultiple &&
      workedDays > 0
    ) {
      transportAllowanceAmount = this.round(
        (settings.transportAllowance / 30.0) * workedDays,
      );
      generatedLines.push({
        conceptId: systemConcepts.transportConcept.id,
        conceptCode: systemConcepts.transportConcept.code,
        conceptName: systemConcepts.transportConcept.name,
        dependencyId: primaryDepId,
        nature: PayrollConceptNature.DEVENGO,
        origin: PayrollLineOrigin.TRANSPORT_ALLOWANCE,
        quantity: workedDays,
        unitValue: this.round(settings.transportAllowance / 30.0),
        totalValue: transportAllowanceAmount,
        isConstitutiveOfSalary: false,
        isDeletable: false,
        inIbcEpsAfp: false,
        inIbcArl: false,
        inIbcCcf: false,
        inUgpp40Pct: false,
      });
    }

    // 6. Seventh Day Deduction
    let seventhDayDeductionAmount = 0;
    if (seventhDaysLost > 0) {
      seventhDayDeductionAmount = this.round(
        (baseSalaryMonthly / 30.0) * seventhDaysLost,
      );
      generatedLines.push({
        conceptId: systemConcepts.basicSalaryConcept.id,
        conceptCode: 504,
        conceptName: 'DESCUENTO DOMINICAL PERDIDO (ART. 173 CST)',
        dependencyId: primaryDepId,
        nature: PayrollConceptNature.DEDUCCION,
        origin: PayrollLineOrigin.SEVENTH_DAY_DEDUCTION,
        quantity: seventhDaysLost,
        unitValue: this.round(baseSalaryMonthly / 30.0),
        totalValue: seventhDayDeductionAmount,
        isConstitutiveOfSalary: true,
        isDeletable: true,
        inIbcEpsAfp: true,
        inIbcArl: true,
        inIbcCcf: true,
        inUgpp40Pct: false,
      });
    }

    // 7. Leaves & Incapacities
    let leavesAndIncapacitiesAmount = 0;
    for (const l of periodLeaves) {
      if (Number(l.totalLiquidatedAmount) > 0) {
        leavesAndIncapacitiesAmount += Number(l.totalLiquidatedAmount);
        generatedLines.push({
          conceptId: l.conceptId,
          conceptCode: l.concept.code,
          conceptName: l.concept.name,
          dependencyId: primaryDepId,
          nature: l.concept.nature,
          origin: PayrollLineOrigin.LEAVE_OR_INCAPACITY,
          quantity: l.totalDays,
          unitValue: this.round(Number(l.totalLiquidatedAmount) / l.totalDays),
          totalValue: Number(l.totalLiquidatedAmount),
          isConstitutiveOfSalary: l.concept.isConstitutiveOfSalary ?? false,
          isDeletable: false,
          inIbcEpsAfp: l.concept.inIbcEpsAfp ?? true,
          inIbcArl: l.concept.inIbcArl ?? true,
          inIbcCcf: l.concept.inIbcCcf ?? true,
          inUgpp40Pct: l.concept.inUgpp40Pct ?? false,
          leaveId: l.id,
        });
      }
    }

    // 8. Permanent Concepts
    let bonusesNonSalarialAmount = 0;
    let otherEarningsAmount = 0;
    let otherDeductionsAmount = 0;

    const permanentConcepts = input.permanentConcepts || [];
    for (const pc of permanentConcepts) {
      const matchPeriodicity =
        pc.applicationRule === NoveltyPeriodicityRule.ALL_PERIODS ||
        (pc.applicationRule === NoveltyPeriodicityRule.FIRST_FORTNIGHT &&
          period.periodNumber === 1) ||
        (pc.applicationRule === NoveltyPeriodicityRule.SECOND_FORTNIGHT &&
          (period.periodNumber === 2 || period.periodNumber === 3));

      if (matchPeriodicity) {
        const val = pc.isProportionalToDays
          ? this.round((Number(pc.amount) / 30.0) * workedDays)
          : Number(pc.amount);

        if (pc.concept.nature === PayrollConceptNature.DEVENGO) {
          if (pc.concept.isConstitutiveOfSalary === false) {
            bonusesNonSalarialAmount += val;
          } else {
            otherEarningsAmount += val;
          }
        } else if (pc.concept.nature === PayrollConceptNature.DEDUCCION) {
          otherDeductionsAmount += val;
        }

        generatedLines.push({
          conceptId: pc.conceptId,
          conceptCode: pc.concept.code,
          conceptName: pc.concept.name,
          dependencyId: pc.dependencyId || primaryDepId,
          nature: pc.concept.nature,
          origin: PayrollLineOrigin.PERMANENT_CONCEPT,
          quantity: pc.isProportionalToDays ? workedDays : 1,
          unitValue: pc.isProportionalToDays
            ? this.round(Number(pc.amount) / 30.0)
            : val,
          totalValue: val,
          isConstitutiveOfSalary: pc.concept.isConstitutiveOfSalary ?? true,
          isDeletable: true,
          inIbcEpsAfp: pc.concept.inIbcEpsAfp ?? false,
          inIbcArl: pc.concept.inIbcArl ?? false,
          inIbcCcf: pc.concept.inIbcCcf ?? false,
          inUgpp40Pct: pc.concept.inUgpp40Pct ?? false,
        });
      }
    }

    // 9. Period Novelties
    const periodNovelties = input.periodNovelties || [];
    for (const pn of periodNovelties) {
      const val = Number(pn.totalValue);
      if (pn.concept.nature === PayrollConceptNature.DEVENGO) {
        if (pn.concept.isConstitutiveOfSalary === false) {
          bonusesNonSalarialAmount += val;
        } else {
          otherEarningsAmount += val;
        }
      } else if (pn.concept.nature === PayrollConceptNature.DEDUCCION) {
        otherDeductionsAmount += val;
      }

      generatedLines.push({
        conceptId: pn.conceptId,
        conceptCode: pn.concept.code,
        conceptName: pn.concept.name,
        dependencyId: pn.dependencyId || primaryDepId,
        nature: pn.concept.nature,
        origin: PayrollLineOrigin.PERIOD_NOVELTY,
        quantity: Number(pn.quantity) || 1,
        unitValue: Number(pn.unitValue) || val,
        totalValue: val,
        isConstitutiveOfSalary: pn.concept.isConstitutiveOfSalary ?? true,
        isDeletable: true,
        inIbcEpsAfp: pn.concept.inIbcEpsAfp ?? false,
        inIbcArl: pn.concept.inIbcArl ?? false,
        inIbcCcf: pn.concept.inIbcCcf ?? false,
        inUgpp40Pct: pn.concept.inUgpp40Pct ?? false,
      });
    }

    const totalEarnings = this.round(
      basicSalaryEarned +
        transportAllowanceAmount +
        overtimeAndSurchargesAmount +
        leavesAndIncapacitiesAmount +
        bonusesNonSalarialAmount +
        otherEarningsAmount,
    );

    // 10. UGPP 40% Rule (Ley 1393 de 2010 Art. 30)
    let salarialSum = 0;
    let nonSalarialUgppSum = 0;

    for (const line of generatedLines) {
      if (
        line.nature === PayrollConceptNature.DEVENGO ||
        line.nature === PayrollConceptNature.INCAPACIDAD
      ) {
        if (line.isConstitutiveOfSalary) {
          salarialSum += line.totalValue;
        } else if (line.inUgpp40Pct) {
          nonSalarialUgppSum += line.totalValue;
        }
      }
    }

    const ugppTotalRemuneration = this.round(salarialSum + nonSalarialUgppSum);
    const ugppLimit40Pct = this.round(ugppTotalRemuneration * 0.4);
    const ugppNonSalarialTotal = this.round(nonSalarialUgppSum);
    let ugppExcessAmount = 0;

    if (
      settings.enforceUgpp40PctRule !== false &&
      ugppNonSalarialTotal > ugppLimit40Pct
    ) {
      ugppExcessAmount = this.round(ugppNonSalarialTotal - ugppLimit40Pct);
    }

    // 11. IBCs Calculation with Floor & Ceiling
    const smmlvDailyFloor = this.round(smmlv / 30.0);
    const totalCoveredDays = Math.min(standardDays, workedDays + totalOffDays);
    const minIbcFloor = this.round(smmlvDailyFloor * totalCoveredDays);
    const maxIbcCeiling = this.round(smmlv * 25.0);

    let rawIbcEps = 0;
    let rawIbcArl = 0;
    let rawIbcCcf = 0;

    for (const line of generatedLines) {
      if (
        line.nature === PayrollConceptNature.DEVENGO ||
        line.nature === PayrollConceptNature.INCAPACIDAD
      ) {
        if (line.inIbcEpsAfp) rawIbcEps += line.totalValue;
        if (line.inIbcArl) rawIbcArl += line.totalValue;
        if (line.inIbcCcf) rawIbcCcf += line.totalValue;
      }
    }

    // Add UGPP excess
    rawIbcEps += ugppExcessAmount;
    rawIbcArl += ugppExcessAmount;

    // Subtract lost 7th days
    rawIbcEps = Math.max(0, rawIbcEps - seventhDayDeductionAmount);
    rawIbcArl = Math.max(0, rawIbcArl - seventhDayDeductionAmount);
    rawIbcCcf = Math.max(0, rawIbcCcf - seventhDayDeductionAmount);

    const ibcEps = Math.min(
      maxIbcCeiling,
      Math.max(minIbcFloor, this.round(rawIbcEps)),
    );
    const ibcAfp = ibcEps;
    const ibcArl = Math.min(
      maxIbcCeiling,
      Math.max(minIbcFloor, this.round(rawIbcArl)),
    );
    const ibcCcf = Math.min(
      maxIbcCeiling,
      Math.max(minIbcFloor, this.round(rawIbcCcf)),
    );

    // 12. Employee Social Security Deductions
    const isSena =
      profile?.pilaContributorType === '12' ||
      profile?.pilaContributorType === '19';
    const isPensioner = profile?.isPensioner === true;

    // Health: 4%
    const healthEmployeeAmount = isSena
      ? 0
      : this.round(ibcEps * ((settings.employeeHealthPct || 4.0) / 100));
    if (healthEmployeeAmount > 0) {
      generatedLines.push({
        conceptId: systemConcepts.healthConcept.id,
        conceptCode: systemConcepts.healthConcept.code,
        conceptName: systemConcepts.healthConcept.name,
        dependencyId: primaryDepId,
        nature: PayrollConceptNature.SEG_SOCIAL,
        origin: PayrollLineOrigin.SOCIAL_SECURITY,
        quantity: 1,
        unitValue: healthEmployeeAmount,
        totalValue: healthEmployeeAmount,
        isConstitutiveOfSalary: false,
        isDeletable: false,
        inIbcEpsAfp: false,
        inIbcArl: false,
        inIbcCcf: false,
        inUgpp40Pct: false,
      });
    }

    // Pension: 4%
    const pensionEmployeeAmount =
      isSena || isPensioner
        ? 0
        : this.round(ibcAfp * ((settings.employeePensionPct || 4.0) / 100));
    if (pensionEmployeeAmount > 0) {
      generatedLines.push({
        conceptId: systemConcepts.pensionConcept.id,
        conceptCode: systemConcepts.pensionConcept.code,
        conceptName: systemConcepts.pensionConcept.name,
        dependencyId: primaryDepId,
        nature: PayrollConceptNature.SEG_SOCIAL,
        origin: PayrollLineOrigin.SOCIAL_SECURITY,
        quantity: 1,
        unitValue: pensionEmployeeAmount,
        totalValue: pensionEmployeeAmount,
        isConstitutiveOfSalary: false,
        isDeletable: false,
        inIbcEpsAfp: false,
        inIbcArl: false,
        inIbcCcf: false,
        inUgpp40Pct: false,
      });
    }

    // FSP: Tiered 1% - 2% (from 4 SMMLV)
    let fspAmount = 0;
    if (!isSena && !isPensioner && ibcAfp >= smmlv * 4.0) {
      const multiple = ibcAfp / smmlv;
      let fspRate = 1.0;
      if (multiple >= 16 && multiple < 17) fspRate = 1.2;
      else if (multiple >= 17 && multiple < 18) fspRate = 1.4;
      else if (multiple >= 18 && multiple < 19) fspRate = 1.6;
      else if (multiple >= 19 && multiple <= 20) fspRate = 1.8;
      else if (multiple > 20) fspRate = 2.0;

      fspAmount = this.round(ibcAfp * (fspRate / 100));
      generatedLines.push({
        conceptId: systemConcepts.fspConcept.id,
        conceptCode: systemConcepts.fspConcept.code,
        conceptName: systemConcepts.fspConcept.name,
        dependencyId: primaryDepId,
        nature: PayrollConceptNature.SEG_SOCIAL,
        origin: PayrollLineOrigin.SOCIAL_SECURITY,
        quantity: 1,
        unitValue: fspAmount,
        totalValue: fspAmount,
        isConstitutiveOfSalary: false,
        isDeletable: false,
        inIbcEpsAfp: false,
        inIbcArl: false,
        inIbcCcf: false,
        inUgpp40Pct: false,
      });
    }

    // 13. Withholding Tax (Retefuente Art. 383 E.T.)
    let withholdingTaxAmount = 0;
    const uvt = settings.uvtValue || 49799.0;
    const grossTaxableIncome = Math.max(
      0,
      totalEarnings - transportAllowanceAmount,
    );
    const nonTaxableDeductions =
      healthEmployeeAmount + pensionEmployeeAmount + fspAmount;
    const netIncomeBeforeExempt = Math.max(
      0,
      grossTaxableIncome - nonTaxableDeductions,
    );
    const exemptLabor25Pct = this.round(netIncomeBeforeExempt * 0.25);
    const maxExemptUvt = 65.0 * uvt;
    const effectiveExempt = Math.min(exemptLabor25Pct, maxExemptUvt);

    const taxableBasePesos = Math.max(
      0,
      netIncomeBeforeExempt - effectiveExempt,
    );
    const taxableBaseUvt = this.round(taxableBasePesos / uvt);

    if (taxableBaseUvt > 95.0) {
      let taxUvt = 0;
      if (taxableBaseUvt <= 150.0) {
        taxUvt = (taxableBaseUvt - 95.0) * 0.19;
      } else if (taxableBaseUvt <= 360.0) {
        taxUvt = (taxableBaseUvt - 150.0) * 0.28 + 10.0;
      } else {
        taxUvt = (taxableBaseUvt - 360.0) * 0.33 + 69.0;
      }
      withholdingTaxAmount = this.round(taxUvt * uvt);
      generatedLines.push({
        conceptId: systemConcepts.retefuenteConcept.id,
        conceptCode: systemConcepts.retefuenteConcept.code,
        conceptName: systemConcepts.retefuenteConcept.name,
        dependencyId: primaryDepId,
        nature: PayrollConceptNature.DEDUCCION,
        origin: PayrollLineOrigin.SOCIAL_SECURITY,
        quantity: 1,
        unitValue: withholdingTaxAmount,
        totalValue: withholdingTaxAmount,
        isConstitutiveOfSalary: false,
        isDeletable: false,
        inIbcEpsAfp: false,
        inIbcArl: false,
        inIbcCcf: false,
        inUgpp40Pct: false,
      });
    }

    // 14. Loan Deductions
    let loansDeductionAmount = 0;
    const activeLoans = input.activeLoans || [];
    for (const loan of activeLoans) {
      const matchPeriodicity =
        loan.deductionRule === NoveltyPeriodicityRule.ALL_PERIODS ||
        (loan.deductionRule === NoveltyPeriodicityRule.FIRST_FORTNIGHT &&
          period.periodNumber === 1) ||
        (loan.deductionRule === NoveltyPeriodicityRule.SECOND_FORTNIGHT &&
          (period.periodNumber === 2 || period.periodNumber === 3));

      if (matchPeriodicity) {
        const toDeduct = Math.min(
          Number(loan.installmentAmount),
          Number(loan.remainingBalance),
        );
        if (toDeduct > 0) {
          loansDeductionAmount += toDeduct;
          generatedLines.push({
            conceptId: loan.conceptId,
            conceptCode: loan.concept.code,
            conceptName: `${loan.concept.name} (${loan.loanCode})`,
            dependencyId: primaryDepId,
            nature: PayrollConceptNature.DEDUCCION,
            origin: PayrollLineOrigin.LOAN_INSTALLMENT,
            quantity: 1,
            unitValue: toDeduct,
            totalValue: toDeduct,
            isConstitutiveOfSalary: false,
            isDeletable: true,
            inIbcEpsAfp: false,
            inIbcArl: false,
            inIbcCcf: false,
            inUgpp40Pct: false,
            loanId: loan.id,
          });
        }
      }
    }

    // 15. Fortnight Advance Deduction (Concept 509)
    let advanceDeductionAmount = 0;
    if (period.periodNumber === 3 || period.periodNumber === 2) {
      // Monthly closure or 2nd fortnight
      if (
        input.pendingAdvanceItem &&
        !input.pendingAdvanceItem.isDeductedInPayroll
      ) {
        const advVal = Number(input.pendingAdvanceItem.approvedAmount);
        if (advVal > 0) {
          advanceDeductionAmount = advVal;
          generatedLines.push({
            conceptId: systemConcepts.advanceConcept.id,
            conceptCode: systemConcepts.advanceConcept.code,
            conceptName: systemConcepts.advanceConcept.name,
            dependencyId: primaryDepId,
            nature: PayrollConceptNature.DEDUCCION,
            origin: PayrollLineOrigin.FORTNIGHT_ADVANCE,
            quantity: 1,
            unitValue: advVal,
            totalValue: advVal,
            isConstitutiveOfSalary: false,
            isDeletable: true,
            inIbcEpsAfp: false,
            inIbcArl: false,
            inIbcCcf: false,
            inUgpp40Pct: false,
          });
        }
      }
    }

    const totalDeductions = this.round(
      seventhDayDeductionAmount +
        healthEmployeeAmount +
        pensionEmployeeAmount +
        fspAmount +
        withholdingTaxAmount +
        loansDeductionAmount +
        advanceDeductionAmount +
        otherDeductionsAmount,
    );

    const netPayAmount = this.round(totalEarnings - totalDeductions);

    // 16. Employer Contributions & Law 1607 Exoneration
    const isExoneratedLaw1607 =
      settings.applyExonerationLaw1607 !== false && salarialSum < smmlv * 10.0;

    const employerHealthAmount = isExoneratedLaw1607
      ? 0.0
      : this.round(ibcEps * ((settings.employerHealthPct || 8.5) / 100));

    const employerPensionAmount = isSena
      ? 0.0
      : this.round(ibcAfp * ((settings.employerPensionPct || 12.0) / 100));

    // ARL Rate by Class
    const arlClass = profile?.arlRiskClass || ArlRiskClass.RISK_IV;
    let arlRatePct = 4.35;
    if (arlClass === ArlRiskClass.RISK_I) arlRatePct = 0.522;
    else if (arlClass === ArlRiskClass.RISK_II) arlRatePct = 1.044;
    else if (arlClass === ArlRiskClass.RISK_III) arlRatePct = 2.436;
    else if (arlClass === ArlRiskClass.RISK_V) arlRatePct = 6.96;

    const employerArlAmount = this.round(ibcArl * (arlRatePct / 100));
    const employerCcfAmount = isSena
      ? 0.0
      : this.round(ibcCcf * ((settings.ccfPct || 4.0) / 100));
    const employerSenaAmount =
      isExoneratedLaw1607 || isSena
        ? 0.0
        : this.round(ibcCcf * ((settings.senaPct || 2.0) / 100));
    const employerIcbfAmount =
      isExoneratedLaw1607 || isSena
        ? 0.0
        : this.round(ibcCcf * ((settings.icbfPct || 3.0) / 100));

    const totalEmployerCost = this.round(
      employerHealthAmount +
        employerPensionAmount +
        employerArlAmount +
        employerCcfAmount +
        employerSenaAmount +
        employerIcbfAmount,
    );

    return {
      workedDays,
      paidLeaveDays,
      incapacityDays,
      vacationDays,
      unpaidAbsenceDays,
      seventhDaysLost,
      salaryModeSnapshot: salaryMode,
      baseSalaryMonthly,
      basicSalaryEarned,
      transportAllowanceAmount,
      overtimeAndSurchargesAmount,
      leavesAndIncapacitiesAmount,
      bonusesNonSalarialAmount,
      otherEarningsAmount,
      totalEarnings,
      ugppTotalRemuneration,
      ugppLimit40Pct,
      ugppNonSalarialTotal,
      ugppExcessAmount,
      ibcEps,
      ibcAfp,
      ibcArl,
      ibcCcf,
      healthEmployeeAmount,
      pensionEmployeeAmount,
      fspAmount,
      withholdingTaxAmount,
      loansDeductionAmount,
      advanceDeductionAmount,
      otherDeductionsAmount,
      totalDeductions,
      netPayAmount,
      isExoneratedLaw1607,
      employerHealthAmount,
      employerPensionAmount,
      employerArlAmount,
      employerCcfAmount,
      employerSenaAmount,
      employerIcbfAmount,
      totalEmployerCost,
      primaryDependencyId: primaryDepId,
      lines: generatedLines,
    };
  }
}
