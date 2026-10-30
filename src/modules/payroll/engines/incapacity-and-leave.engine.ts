import { LeaveAndAbsenceType, EpsClaimStatus } from '@prisma/client';

export interface IncapacityCalculationInput {
  leaveType: LeaveAndAbsenceType;
  startDate: Date | string;
  endDate: Date | string;
  baseSalaryMonthly: number;
  smmlv?: number;
  employerSickLeaveRatePct?: number;
  epsSickLeaveRateDays3To90Pct?: number;
  epsSickLeaveRateDays91To180Pct?: number;
  isExtension?: boolean;
  accumulatedPriorDays?: number;
}

export interface DailyIncapacityItem {
  dayIndex: number;
  dateStr: string;
  payer: 'EMPLOYER' | 'ENTITY' | 'NONE';
  ratePct: number;
  dailyAmount: number;
}

export interface IncapacityCalculationResult {
  totalDays: number;
  employerDays: number;
  entityDays: number;
  baseSalaryMonthly: number;
  ibcDailyValue: number;
  smmlvDailyFloor: number;
  employerRecognizedAmount: number;
  entityRecognizedAmount: number;
  totalLiquidatedAmount: number;
  affectsSeventhDay: boolean;
  claimStatus: EpsClaimStatus;
  dailyBreakdown: DailyIncapacityItem[];
}

export class IncapacityAndLeaveEngine {
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

  public static calculate(
    input: IncapacityCalculationInput,
  ): IncapacityCalculationResult {
    const start = this.parseUtcDate(input.startDate);
    const end = this.parseUtcDate(input.endDate);

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
      throw new Error(
        'La fecha de finalización no puede ser anterior a la fecha de inicio.',
      );
    }

    const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const baseSalaryMonthly = input.baseSalaryMonthly || 0;
    const smmlv = input.smmlv || 1750905.0; // SMMLV 2026 de referencia
    const employerRatePct = input.employerSickLeaveRatePct ?? 66.67;
    const epsDays3To90RatePct = input.epsSickLeaveRateDays3To90Pct ?? 66.67;
    const epsDays91To180RatePct = input.epsSickLeaveRateDays91To180Pct ?? 50.0;
    const isExtension = Boolean(input.isExtension);
    const accumulatedPriorDays = isExtension
      ? input.accumulatedPriorDays || 0
      : 0;

    const ibcDailyValue = this.round(baseSalaryMonthly / 30.0);
    const smmlvDailyFloor = this.round(smmlv / 30.0);

    const dailyBreakdown: DailyIncapacityItem[] = [];
    let employerDays = 0;
    let entityDays = 0;
    let employerRecognizedAmount = 0;
    let entityRecognizedAmount = 0;
    let affectsSeventhDay = false;
    let claimStatus: EpsClaimStatus = EpsClaimStatus.NOT_APPLICABLE;

    switch (input.leaveType) {
      case LeaveAndAbsenceType.SICK_LEAVE_EG: {
        for (let i = 0; i < totalDays; i++) {
          const currentDate = new Date(start.getTime() + i * 86400000);
          const dateStr = currentDate.toISOString().split('T')[0];
          const absoluteDay = accumulatedPriorDays + i + 1;

          let payer: 'EMPLOYER' | 'ENTITY' = 'EMPLOYER';
          let ratePct = employerRatePct;

          if (absoluteDay <= 2) {
            payer = 'EMPLOYER';
            ratePct = employerRatePct;
            employerDays++;
          } else if (absoluteDay <= 90) {
            payer = 'ENTITY';
            ratePct = epsDays3To90RatePct;
            entityDays++;
          } else {
            payer = 'ENTITY';
            ratePct = epsDays91To180RatePct;
            entityDays++;
          }

          // Cálculo con piso de 1 SMMLV diario según jurisprudencia y ley
          const rawAmount = this.round((ibcDailyValue * ratePct) / 100.0);
          const dailyAmount = Math.max(rawAmount, smmlvDailyFloor);

          if (payer === 'EMPLOYER') {
            employerRecognizedAmount += dailyAmount;
          } else {
            entityRecognizedAmount += dailyAmount;
          }

          dailyBreakdown.push({
            dayIndex: absoluteDay,
            dateStr,
            payer,
            ratePct,
            dailyAmount,
          });
        }

        claimStatus =
          entityDays > 0
            ? EpsClaimStatus.PENDING_FILING
            : EpsClaimStatus.NOT_APPLICABLE;
        break;
      }

      case LeaveAndAbsenceType.WORK_ACCIDENT_AT: {
        entityDays = totalDays;
        const dailyAmount = ibcDailyValue; // 100% IBC a cargo de la ARL
        entityRecognizedAmount = this.round(dailyAmount * totalDays);
        claimStatus = EpsClaimStatus.PENDING_FILING;

        for (let i = 0; i < totalDays; i++) {
          const currentDate = new Date(start.getTime() + i * 86400000);
          dailyBreakdown.push({
            dayIndex: i + 1,
            dateStr: currentDate.toISOString().split('T')[0],
            payer: 'ENTITY',
            ratePct: 100.0,
            dailyAmount,
          });
        }
        break;
      }

      case LeaveAndAbsenceType.MATERNITY_PATERNITY_LMA: {
        entityDays = totalDays;
        const dailyAmount = ibcDailyValue; // 100% IBC a cargo de la EPS
        entityRecognizedAmount = this.round(dailyAmount * totalDays);
        claimStatus = EpsClaimStatus.PENDING_FILING;

        for (let i = 0; i < totalDays; i++) {
          const currentDate = new Date(start.getTime() + i * 86400000);
          dailyBreakdown.push({
            dayIndex: i + 1,
            dateStr: currentDate.toISOString().split('T')[0],
            payer: 'ENTITY',
            ratePct: 100.0,
            dailyAmount,
          });
        }
        break;
      }

      case LeaveAndAbsenceType.PAID_LEAVE_LR:
      case LeaveAndAbsenceType.VACATION_TIME_VAC: {
        employerDays = totalDays;
        const dailyAmount = ibcDailyValue; // 100% a cargo del empleador
        employerRecognizedAmount = this.round(dailyAmount * totalDays);
        claimStatus = EpsClaimStatus.NOT_APPLICABLE;

        for (let i = 0; i < totalDays; i++) {
          const currentDate = new Date(start.getTime() + i * 86400000);
          dailyBreakdown.push({
            dayIndex: i + 1,
            dateStr: currentDate.toISOString().split('T')[0],
            payer: 'EMPLOYER',
            ratePct: 100.0,
            dailyAmount,
          });
        }
        break;
      }

      case LeaveAndAbsenceType.DISCIPLINARY_SUSPENSION_SAN:
      case LeaveAndAbsenceType.UNJUSTIFIED_ABSENCE_AUS: {
        // En ausencias o sanciones no hay auxilio, hay descuento salarial
        affectsSeventhDay = true;
        const dailyAmount = ibcDailyValue;
        const totalDeduction = this.round(dailyAmount * totalDays);
        claimStatus = EpsClaimStatus.NOT_APPLICABLE;

        for (let i = 0; i < totalDays; i++) {
          const currentDate = new Date(start.getTime() + i * 86400000);
          dailyBreakdown.push({
            dayIndex: i + 1,
            dateStr: currentDate.toISOString().split('T')[0],
            payer: 'NONE',
            ratePct: 0.0,
            dailyAmount: 0.0,
          });
        }

        return {
          totalDays,
          employerDays: 0,
          entityDays: 0,
          baseSalaryMonthly,
          ibcDailyValue,
          smmlvDailyFloor,
          employerRecognizedAmount: 0,
          entityRecognizedAmount: 0,
          totalLiquidatedAmount: totalDeduction, // Representa el descuento
          affectsSeventhDay,
          claimStatus,
          dailyBreakdown,
        };
      }

      case LeaveAndAbsenceType.UNPAID_LEAVE_LNR:
      default: {
        claimStatus = EpsClaimStatus.NOT_APPLICABLE;
        for (let i = 0; i < totalDays; i++) {
          const currentDate = new Date(start.getTime() + i * 86400000);
          dailyBreakdown.push({
            dayIndex: i + 1,
            dateStr: currentDate.toISOString().split('T')[0],
            payer: 'NONE',
            ratePct: 0.0,
            dailyAmount: 0.0,
          });
        }
        break;
      }
    }

    employerRecognizedAmount = this.round(employerRecognizedAmount);
    entityRecognizedAmount = this.round(entityRecognizedAmount);
    const totalLiquidatedAmount = this.round(
      employerRecognizedAmount + entityRecognizedAmount,
    );

    return {
      totalDays,
      employerDays,
      entityDays,
      baseSalaryMonthly,
      ibcDailyValue,
      smmlvDailyFloor,
      employerRecognizedAmount,
      entityRecognizedAmount,
      totalLiquidatedAmount,
      affectsSeventhDay,
      claimStatus,
      dailyBreakdown,
    };
  }
}

