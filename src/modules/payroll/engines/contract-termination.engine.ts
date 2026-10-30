import { EmploymentContractType } from '@prisma/client';
import { SocialBenefitsAndVacationsEngine } from './social-benefits-and-vacations.engine';

export interface FinalLiquidationCalculationInput {
  hireDate: Date | string;
  retirementDate: Date | string;
  contractType: EmploymentContractType;
  contractEndDate?: Date | string | null;
  isJustCause: boolean;
  applyIndemnification?: boolean;
  unpaidLeaveDaysTotal?: number;
  lastBasicSalary: number;
  cesantiasAverageBase: number;
  primaAverageBase: number;
  vacationAverageBase: number;
  vacationEnjoyedDaysTotal?: number;
  unpaidLeaveDaysCurrentYear?: number;
  unpaidLeaveDaysCurrentSemester?: number;
  smmlv: number;
  transportAllowanceAmount: number;
  includePendingPayroll?: boolean;
  pendingPayrollDays?: number;
  pendingOvertimeAmount?: number;
  loansDeductedAmount?: number;
  otherEarningsAmount?: number;
  otherDeductionsAmount?: number;
}

export interface FinalLiquidationCalculationResult {
  totalContractDays360: number;
  unpaidLeaveDaysTotal: number;
  netServiceDaysTotal: number;
  lastBasicSalary: number;
  transportAllowanceApplicable: number;
  cesantiasAverageBase: number;
  primaAverageBase: number;
  vacationAverageBase: number;
  cesantiasPendingDays: number;
  cesantiasAmount: number;
  interestsCesantiasAmount: number;
  primaPendingDays: number;
  primaAmount: number;
  vacationTotalAccruedDays: number;
  vacationEnjoyedDays: number;
  vacationPendingBusinessDays: number;
  vacationAmount: number;
  includePendingPayroll: boolean;
  pendingPayrollDays: number;
  pendingBasicSalaryAmount: number;
  pendingTransportAmount: number;
  pendingOvertimeAmount: number;
  pendingHealthDeduction: number;
  pendingPensionDeduction: number;
  applyIndemnification: boolean;
  indemnificationDays: number;
  indemnificationAmount: number;
  otherEarningsAmount: number;
  loansDeductedAmount: number;
  otherDeductionsAmount: number;
  totalBenefitsAndEarnings: number;
  totalDeductions: number;
  netPayAmount: number;
}

export class ContractTerminationEngine {
  /**
   * Deterministic calculation for Final Contract Settlement (Art. 64, 65, 186-249 CST).
   */
  static calculateFinalLiquidation(
    input: FinalLiquidationCalculationInput,
  ): FinalLiquidationCalculationResult {
    const {
      hireDate,
      retirementDate,
      contractType,
      contractEndDate,
      isJustCause,
      applyIndemnification: manualApplyIndemnification,
      unpaidLeaveDaysTotal = 0,
      lastBasicSalary,
      cesantiasAverageBase,
      primaAverageBase,
      vacationAverageBase,
      vacationEnjoyedDaysTotal = 0,
      unpaidLeaveDaysCurrentYear = 0,
      unpaidLeaveDaysCurrentSemester = 0,
      smmlv,
      transportAllowanceAmount,
      includePendingPayroll = true,
      pendingPayrollDays = 0,
      pendingOvertimeAmount = 0,
      loansDeductedAmount = 0,
      otherEarningsAmount = 0,
      otherDeductionsAmount = 0,
    } = input;

    const hire = typeof hireDate === 'string' ? new Date(hireDate) : hireDate;
    const ret =
      typeof retirementDate === 'string'
        ? new Date(retirementDate)
        : retirementDate;

    // 1. Service Times Base 360
    const totalContractDays360 =
      SocialBenefitsAndVacationsEngine.calculateDays360(hire, ret);
    const netServiceDaysTotal = Math.max(
      0,
      totalContractDays360 - unpaidLeaveDaysTotal,
    );

    const retYear = ret.getUTCFullYear();
    const retMonth = ret.getUTCMonth() + 1;

    // Cesantías start date: Jan 1 of retirement year, or hire date if hired this year
    const yearStart = new Date(Date.UTC(retYear, 0, 1));
    const cesantiasStartDate = hire > yearStart ? hire : yearStart;
    const rawCesantiasDays = SocialBenefitsAndVacationsEngine.calculateDays360(
      cesantiasStartDate,
      ret,
    );
    const cesantiasPendingDays = Math.max(
      0,
      rawCesantiasDays - unpaidLeaveDaysCurrentYear,
    );

    // Prima start date: Jan 1 or Jul 1 of retirement year
    const semesterStartMonth = retMonth <= 6 ? 0 : 6;
    const semesterStart = new Date(Date.UTC(retYear, semesterStartMonth, 1));
    const primaStartDate = hire > semesterStart ? hire : semesterStart;
    const rawPrimaDays = SocialBenefitsAndVacationsEngine.calculateDays360(
      primaStartDate,
      ret,
    );
    const primaPendingDays = Math.max(
      0,
      rawPrimaDays - unpaidLeaveDaysCurrentSemester,
    );

    // Vacations total accrued in full employment history (15 business days per 360 net days)
    const vacationTotalAccruedDays = this.round2(
      (netServiceDaysTotal * 15) / 360,
    );
    const vacationPendingBusinessDays = Math.max(
      0,
      this.round2(vacationTotalAccruedDays - vacationEnjoyedDaysTotal),
    );

    // 2. Proportional Benefits
    const cesantiasAmount = this.round2(
      (cesantiasAverageBase * cesantiasPendingDays) / 360,
    );
    const interestsCesantiasAmount = this.round2(
      (cesantiasAmount * cesantiasPendingDays * 0.12) / 360,
    );
    const primaAmount = this.round2(
      (primaAverageBase * primaPendingDays) / 360,
    );
    const vacationAmount = this.round2(
      (vacationAverageBase / 30) * vacationPendingBusinessDays,
    );

    // 3. Pending Payroll (Month of Retirement)
    let pendingBasicSalaryAmount = 0;
    let pendingTransportAmount = 0;
    let pendingHealthDeduction = 0;
    let pendingPensionDeduction = 0;

    if (includePendingPayroll && pendingPayrollDays > 0) {
      pendingBasicSalaryAmount = this.round2(
        (lastBasicSalary / 30) * pendingPayrollDays,
      );
      if (lastBasicSalary <= 2 * smmlv) {
        pendingTransportAmount = this.round2(
          (transportAllowanceAmount / 30) * pendingPayrollDays,
        );
      }
      const wageBase = pendingBasicSalaryAmount + pendingOvertimeAmount;
      pendingHealthDeduction = this.round2(wageBase * 0.04);
      pendingPensionDeduction = this.round2(wageBase * 0.04);
    }

    // 4. Indemnification Art. 64 CST
    const shouldIndemnify = manualApplyIndemnification ?? !isJustCause;
    let indemnificationDays = 0;
    let indemnificationAmount = 0;

    if (shouldIndemnify) {
      if (
        contractType === EmploymentContractType.FIXED_TERM &&
        contractEndDate
      ) {
        const cEnd =
          typeof contractEndDate === 'string'
            ? new Date(contractEndDate)
            : contractEndDate;
        if (cEnd > ret) {
          const daysRemaining =
            SocialBenefitsAndVacationsEngine.calculateDays360(ret, cEnd) - 1;
          indemnificationDays = Math.max(15, daysRemaining);
        } else {
          indemnificationDays = 15;
        }
      } else if (contractType === EmploymentContractType.INDEFINITE) {
        const isLowSalary = lastBasicSalary < 10 * smmlv;
        if (isLowSalary) {
          if (netServiceDaysTotal <= 360) {
            indemnificationDays = 30;
          } else {
            const extraDays = ((netServiceDaysTotal - 360) * 20) / 360;
            indemnificationDays = this.round2(30 + extraDays);
          }
        } else {
          if (netServiceDaysTotal <= 360) {
            indemnificationDays = 20;
          } else {
            const extraDays = ((netServiceDaysTotal - 360) * 15) / 360;
            indemnificationDays = this.round2(20 + extraDays);
          }
        }
      } else {
        // WORK_OR_LABOR, APPRENTICESHIP, etc.
        indemnificationDays = 15;
      }

      indemnificationAmount = this.round2(
        (lastBasicSalary / 30) * indemnificationDays,
      );
    }

    // 5. Consolidated Totals
    const totalBenefitsAndEarnings = this.round2(
      cesantiasAmount +
        interestsCesantiasAmount +
        primaAmount +
        vacationAmount +
        pendingBasicSalaryAmount +
        pendingTransportAmount +
        pendingOvertimeAmount +
        indemnificationAmount +
        otherEarningsAmount,
    );

    const totalDeductions = this.round2(
      pendingHealthDeduction +
        pendingPensionDeduction +
        loansDeductedAmount +
        otherDeductionsAmount,
    );

    const netPayAmount = this.round2(
      Math.max(0, totalBenefitsAndEarnings - totalDeductions),
    );

    const transportAllowanceApplicable =
      lastBasicSalary <= 2 * smmlv ? transportAllowanceAmount : 0;

    return {
      totalContractDays360,
      unpaidLeaveDaysTotal,
      netServiceDaysTotal,
      lastBasicSalary: this.round2(lastBasicSalary),
      transportAllowanceApplicable: this.round2(transportAllowanceApplicable),
      cesantiasAverageBase: this.round2(cesantiasAverageBase),
      primaAverageBase: this.round2(primaAverageBase),
      vacationAverageBase: this.round2(vacationAverageBase),
      cesantiasPendingDays,
      cesantiasAmount,
      interestsCesantiasAmount,
      primaPendingDays,
      primaAmount,
      vacationTotalAccruedDays,
      vacationEnjoyedDays: this.round2(vacationEnjoyedDaysTotal),
      vacationPendingBusinessDays,
      vacationAmount,
      includePendingPayroll,
      pendingPayrollDays,
      pendingBasicSalaryAmount,
      pendingTransportAmount,
      pendingOvertimeAmount: this.round2(pendingOvertimeAmount),
      pendingHealthDeduction,
      pendingPensionDeduction,
      applyIndemnification: shouldIndemnify,
      indemnificationDays: this.round2(indemnificationDays),
      indemnificationAmount,
      otherEarningsAmount: this.round2(otherEarningsAmount),
      loansDeductedAmount: this.round2(loansDeductedAmount),
      otherDeductionsAmount: this.round2(otherDeductionsAmount),
      totalBenefitsAndEarnings,
      totalDeductions,
      netPayAmount,
    };
  }

  private static round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }
}
