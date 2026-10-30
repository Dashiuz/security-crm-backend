import { VacationSettlementType, SocialBenefitType } from '@prisma/client';

export interface VacationCalculationInput {
  enjoymentStartDate: Date | string;
  businessDays: number;
  saturdayIsWorkingDay: boolean;
  holidayDates: (Date | string)[];
  currentBasicSalary: number;
  averageVariableVacBase: number;
  vacationType: VacationSettlementType;
  loansToDeduct?: number;
}

export interface VacationCalculationResult {
  enjoymentStartDate: string;
  enjoymentEndDate: string;
  returnDate: string;
  businessDays: number;
  nonWorkingDaysIncluded: number;
  calendarDaysPaid: number;
  saturdayWasWorkingDay: boolean;
  currentBasicSalary: number;
  averageVariableVacBase: number;
  totalVacationBase: number;
  dailyVacationRate: number;
  grossVacationAmount: number;
  healthDeductionAmount: number;
  pensionDeductionAmount: number;
  loansDeductionAmount: number;
  netPayAmount: number;
}

export interface SocialBenefitCalculationInput {
  benefitType: SocialBenefitType;
  employeeEntryDate: Date | string;
  periodStartDate: Date | string;
  cutoffDate: Date | string;
  projectionEndDate: Date | string;
  basicSalaryMonthly: number;
  averageVariableEarnings: number;
  unpaidLeaveDaysDeducted?: number;
  smmlv: number;
  transportAllowanceAmount: number;
}

export interface SocialBenefitCalculationResult {
  grossDaysInPeriod: number;
  unpaidLeaveDaysDeducted: number;
  projectedDaysAdded: number;
  netDaysWorked: number;
  basicSalaryMonthly: number;
  averageVariableEarnings: number;
  transportAllowanceBase: number;
  totalComputationBase: number;
  calculatedBenefitAmount: number;
  approvedBenefitAmount: number;
  interestRatePct: number;
  calculatedInterestAmount: number;
  approvedInterestAmount: number;
}

export class SocialBenefitsAndVacationsEngine {
  /**
   * Calculates commercial 360-day count between two dates in Colombia (30 days/month).
   */
  static calculateDays360(
    startDate: Date | string,
    endDate: Date | string,
  ): number {
    const start =
      typeof startDate === 'string'
        ? new Date(startDate)
        : new Date(startDate.getTime());
    const end =
      typeof endDate === 'string'
        ? new Date(endDate)
        : new Date(endDate.getTime());

    if (start > end) return 0;

    const y1 = start.getUTCFullYear();
    const m1 = start.getUTCMonth() + 1;
    let d1 = start.getUTCDate();

    const y2 = end.getUTCFullYear();
    const m2 = end.getUTCMonth() + 1;
    let d2 = end.getUTCDate();

    // Normalization rules for Colombia 360-day commercial basis
    if (d1 === 31) d1 = 30;
    const isFebEnd1 = m1 === 2 && (this.isLeapYear(y1) ? d1 === 29 : d1 === 28);
    if (isFebEnd1) d1 = 30;

    if (d2 === 31) d2 = 30;
    const isFebEnd2 = m2 === 2 && (this.isLeapYear(y2) ? d2 === 29 : d2 === 28);
    if (isFebEnd2) d2 = 30;

    const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1) + 1;
    return Math.max(0, days);
  }

  private static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  private static toDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  /**
   * Calculates vacation calendar schedule (business days, non-working days, return date)
   * and monetary compensation/deductions.
   */
  static calculateVacationScheduleAndAmount(
    input: VacationCalculationInput,
  ): VacationCalculationResult {
    const {
      enjoymentStartDate,
      businessDays,
      saturdayIsWorkingDay,
      holidayDates,
      currentBasicSalary,
      averageVariableVacBase,
      vacationType,
      loansToDeduct = 0,
    } = input;

    const holidaySet = new Set(
      holidayDates.map((h) =>
        typeof h === 'string' ? h.split('T')[0] : this.toDateString(h),
      ),
    );

    const totalVacationBase = this.round2(
      currentBasicSalary + averageVariableVacBase,
    );
    const dailyVacationRate = this.round2(totalVacationBase / 30);

    if (vacationType === VacationSettlementType.COMPENSATED_IN_CASH) {
      const startStr =
        typeof enjoymentStartDate === 'string'
          ? enjoymentStartDate.split('T')[0]
          : this.toDateString(enjoymentStartDate);
      const grossAmount = this.round2(dailyVacationRate * businessDays);
      const netPay = this.round2(Math.max(0, grossAmount - loansToDeduct));

      return {
        enjoymentStartDate: startStr,
        enjoymentEndDate: startStr,
        returnDate: startStr,
        businessDays: this.round2(businessDays),
        nonWorkingDaysIncluded: 0,
        calendarDaysPaid: Math.round(businessDays),
        saturdayWasWorkingDay: saturdayIsWorkingDay,
        currentBasicSalary: this.round2(currentBasicSalary),
        averageVariableVacBase: this.round2(averageVariableVacBase),
        totalVacationBase,
        dailyVacationRate,
        grossVacationAmount: grossAmount,
        healthDeductionAmount: 0,
        pensionDeductionAmount: 0,
        loansDeductionAmount: this.round2(loansToDeduct),
        netPayAmount: netPay,
      };
    }

    // ENJOYED_IN_TIME
    const cur =
      typeof enjoymentStartDate === 'string'
        ? new Date(enjoymentStartDate)
        : new Date(enjoymentStartDate.getTime());
    let countedBusinessDays = 0;
    let nonWorkingDays = 0;

    let enjoymentEndDate = new Date(cur.getTime());

    while (countedBusinessDays < businessDays) {
      const dateStr = this.toDateString(cur);
      const dayOfWeek = cur.getUTCDay(); // 0 = Sun, 6 = Sat

      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;
      const isHoliday = holidaySet.has(dateStr);

      const isNonWorking =
        isSunday || (isSaturday && !saturdayIsWorkingDay) || isHoliday;

      if (!isNonWorking) {
        countedBusinessDays++;
        enjoymentEndDate = new Date(cur.getTime());
      } else {
        nonWorkingDays++;
      }

      if (countedBusinessDays < businessDays) {
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    // Determine return date: first business day strictly after enjoymentEndDate
    const returnDay = new Date(enjoymentEndDate.getTime());
    returnDay.setUTCDate(returnDay.getUTCDate() + 1);

    while (true) {
      const rDateStr = this.toDateString(returnDay);
      const rDayOfWeek = returnDay.getUTCDay();
      const rIsSunday = rDayOfWeek === 0;
      const rIsSaturday = rDayOfWeek === 6;
      const rIsHoliday = holidaySet.has(rDateStr);

      const rIsNonWorking =
        rIsSunday || (rIsSaturday && !saturdayIsWorkingDay) || rIsHoliday;

      if (!rIsNonWorking) {
        break;
      }
      nonWorkingDays++;
      returnDay.setUTCDate(returnDay.getUTCDate() + 1);
    }

    const startDateObj =
      typeof enjoymentStartDate === 'string'
        ? new Date(enjoymentStartDate)
        : enjoymentStartDate;
    const calendarDaysPaid = Math.round(
      (returnDay.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
    );

    const grossVacationAmount = this.round2(
      dailyVacationRate * calendarDaysPaid,
    );
    const healthDeductionAmount = this.round2(grossVacationAmount * 0.04);
    const pensionDeductionAmount = this.round2(grossVacationAmount * 0.04);
    const loansDeductionAmount = this.round2(loansToDeduct);
    const netPayAmount = this.round2(
      Math.max(
        0,
        grossVacationAmount -
          healthDeductionAmount -
          pensionDeductionAmount -
          loansDeductionAmount,
      ),
    );

    return {
      enjoymentStartDate: this.toDateString(startDateObj),
      enjoymentEndDate: this.toDateString(enjoymentEndDate),
      returnDate: this.toDateString(returnDay),
      businessDays: this.round2(businessDays),
      nonWorkingDaysIncluded: nonWorkingDays,
      calendarDaysPaid,
      saturdayWasWorkingDay: saturdayIsWorkingDay,
      currentBasicSalary: this.round2(currentBasicSalary),
      averageVariableVacBase: this.round2(averageVariableVacBase),
      totalVacationBase,
      dailyVacationRate,
      grossVacationAmount,
      healthDeductionAmount,
      pensionDeductionAmount,
      loansDeductionAmount,
      netPayAmount,
    };
  }

  /**
   * Calculates Social Benefit items (Prima Semestral, Cesantías e Intereses 12%).
   */
  static calculateSocialBenefitItem(
    input: SocialBenefitCalculationInput,
  ): SocialBenefitCalculationResult {
    const {
      benefitType,
      employeeEntryDate,
      periodStartDate,
      cutoffDate,
      projectionEndDate,
      basicSalaryMonthly,
      averageVariableEarnings,
      unpaidLeaveDaysDeducted = 0,
      smmlv,
      transportAllowanceAmount,
    } = input;

    const entry =
      typeof employeeEntryDate === 'string'
        ? new Date(employeeEntryDate)
        : employeeEntryDate;
    const periodStart =
      typeof periodStartDate === 'string'
        ? new Date(periodStartDate)
        : periodStartDate;
    const effectiveStart = entry > periodStart ? entry : periodStart;

    const grossDaysInPeriod = this.calculateDays360(
      effectiveStart,
      projectionEndDate,
    );
    const maxDays =
      benefitType === SocialBenefitType.PRIMA_FIRST_SEMESTER ||
      benefitType === SocialBenefitType.PRIMA_SECOND_SEMESTER
        ? 180
        : 360;

    const boundedGrossDays = Math.min(maxDays, grossDaysInPeriod);
    const netDaysWorked = Math.max(
      0,
      boundedGrossDays - unpaidLeaveDaysDeducted,
    );

    const cutoff =
      typeof cutoffDate === 'string' ? new Date(cutoffDate) : cutoffDate;
    const projEnd =
      typeof projectionEndDate === 'string'
        ? new Date(projectionEndDate)
        : projectionEndDate;
    const projectedDaysAdded = Math.max(
      0,
      this.calculateDays360(cutoff, projEnd) - 1,
    );

    // Transport allowance applicable if basic + variable <= 2 * smmlv
    const wageSum = basicSalaryMonthly + averageVariableEarnings;
    const transportAllowanceBase =
      wageSum <= 2 * smmlv ? transportAllowanceAmount : 0;
    const totalComputationBase = this.round2(
      basicSalaryMonthly + averageVariableEarnings + transportAllowanceBase,
    );

    // Benefit calculation: (Base * netDays) / 360
    const calculatedBenefitAmount = this.round2(
      (totalComputationBase * netDaysWorked) / 360,
    );
    const approvedBenefitAmount = calculatedBenefitAmount;

    let interestRatePct = 0;
    let calculatedInterestAmount = 0;
    let approvedInterestAmount = 0;

    if (
      benefitType === SocialBenefitType.SEVERANCE_ANNUAL ||
      benefitType === SocialBenefitType.SEVERANCE_INTERESTS
    ) {
      interestRatePct = 12.0;
      calculatedInterestAmount = this.round2(
        (approvedBenefitAmount * netDaysWorked * 0.12) / 360,
      );
      approvedInterestAmount = calculatedInterestAmount;
    }

    return {
      grossDaysInPeriod: boundedGrossDays,
      unpaidLeaveDaysDeducted,
      projectedDaysAdded,
      netDaysWorked,
      basicSalaryMonthly: this.round2(basicSalaryMonthly),
      averageVariableEarnings: this.round2(averageVariableEarnings),
      transportAllowanceBase: this.round2(transportAllowanceBase),
      totalComputationBase,
      calculatedBenefitAmount,
      approvedBenefitAmount,
      interestRatePct,
      calculatedInterestAmount,
      approvedInterestAmount,
    };
  }

  private static round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }
}
