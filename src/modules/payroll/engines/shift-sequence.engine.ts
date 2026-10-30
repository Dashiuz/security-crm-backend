import { Injectable, Logger } from '@nestjs/common';
import { ShiftDayCode, LeaveAndAbsenceType } from '@prisma/client';
import {
  ColombianHolidayEngine,
  CalculatedHoliday,
} from './colombian-holiday.engine';

export interface ShiftActiveLeaveInput {
  id: string;
  leaveType: LeaveAndAbsenceType;
  startDate: Date | string;
  endDate: Date | string;
}

export interface DayShiftProjection {
  dayOfMonth: number;
  dateStr: string; // YYYY-MM-DD
  date: Date;
  isHolidayOrSunday: boolean;
  holidayName?: string;
  shiftCode: ShiftDayCode;
  leaveId?: string;
  ordinaryDayHours: number;
  nightSurchargeHours: number;
  sundayHolidayHours: number;
  overtimeDayHours: number;
  overtimeNightHours: number;
  overtimeHolidayDayHours: number;
  overtimeHolidayNightHours: number;
}

export interface MonthShiftSequenceProjection {
  year: number;
  month: number;
  totalDaysInMonth: number;
  pattern: string[];
  startStepOffset: number;
  totalWorkedDays: number;
  totalRestDays: number;
  totalLeaveDays: number;
  summaryHours: {
    ordinaryDayHours: number;
    nightSurchargeHours: number;
    sundayHolidayHours: number;
    overtimeDayHours: number;
    overtimeNightHours: number;
    overtimeHolidayDayHours: number;
    overtimeHolidayNightHours: number;
    totalCalculatedHours: number;
  };
  days: DayShiftProjection[];
}

@Injectable()
export class ShiftSequenceEngine {
  private static readonly logger = new Logger(ShiftSequenceEngine.name);

  /**
   * Maps LeaveAndAbsenceType to ShiftDayCode
   */
  public static mapLeaveTypeToShiftCode(
    leaveType: LeaveAndAbsenceType,
  ): ShiftDayCode {
    switch (leaveType) {
      case LeaveAndAbsenceType.SICK_LEAVE_EG:
        return ShiftDayCode.INC;
      case LeaveAndAbsenceType.WORK_ACCIDENT_AT:
        return ShiftDayCode.AT;
      case LeaveAndAbsenceType.MATERNITY_PATERNITY_LMA:
        return ShiftDayCode.LMA;
      case LeaveAndAbsenceType.PAID_LEAVE_LR:
        return ShiftDayCode.LR;
      case LeaveAndAbsenceType.UNPAID_LEAVE_LNR:
        return ShiftDayCode.LNR;
      case LeaveAndAbsenceType.DISCIPLINARY_SUSPENSION_SAN:
        return ShiftDayCode.SAN;
      case LeaveAndAbsenceType.UNJUSTIFIED_ABSENCE_AUS:
        return ShiftDayCode.AUS;
      case LeaveAndAbsenceType.VACATION_TIME_VAC:
        return ShiftDayCode.VAC;
      default:
        return ShiftDayCode.X;
    }
  }

  /**
   * Calculates the exact hours breakdown for a single shift record
   */
  public static calculateShiftHours(
    shiftCode: ShiftDayCode,
    isHolidayOrSunday: boolean,
  ): {
    ordinaryDayHours: number;
    nightSurchargeHours: number;
    sundayHolidayHours: number;
    overtimeDayHours: number;
    overtimeNightHours: number;
    overtimeHolidayDayHours: number;
    overtimeHolidayNightHours: number;
  } {
    const zeroHours = {
      ordinaryDayHours: 0,
      nightSurchargeHours: 0,
      sundayHolidayHours: 0,
      overtimeDayHours: 0,
      overtimeNightHours: 0,
      overtimeHolidayDayHours: 0,
      overtimeHolidayNightHours: 0,
    };

    switch (shiftCode) {
      case ShiftDayCode.D: {
        if (isHolidayOrSunday) {
          return {
            ...zeroHours,
            sundayHolidayHours: 8,
            overtimeHolidayDayHours: 4,
          };
        }
        return {
          ...zeroHours,
          ordinaryDayHours: 8,
          overtimeDayHours: 4,
        };
      }

      case ShiftDayCode.N: {
        if (isHolidayOrSunday) {
          return {
            ...zeroHours,
            sundayHolidayHours: 8,
            nightSurchargeHours: 5,
            overtimeHolidayNightHours: 4,
          };
        }
        return {
          ...zeroHours,
          ordinaryDayHours: 8,
          nightSurchargeHours: 5,
          overtimeNightHours: 4,
        };
      }

      case ShiftDayCode.R: {
        if (isHolidayOrSunday) {
          return {
            ...zeroHours,
            overtimeHolidayDayHours: 12,
          };
        }
        return {
          ...zeroHours,
          overtimeDayHours: 12,
        };
      }

      case ShiftDayCode.X:
      case ShiftDayCode.INC:
      case ShiftDayCode.AT:
      case ShiftDayCode.LMA:
      case ShiftDayCode.LR:
      case ShiftDayCode.LNR:
      case ShiftDayCode.SAN:
      case ShiftDayCode.AUS:
      case ShiftDayCode.VAC:
      default:
        return zeroHours;
    }
  }

  /**
   * Projects a full calendar month for an employee given a shift pattern (e.g. 2x2x2),
   * start offset, holidays, and registered leaves/absences.
   */
  public static projectMonth(params: {
    year: number;
    month: number; // 1..12
    pattern: string[];
    startStepOffset?: number;
    holidays?: CalculatedHoliday[];
    activeLeaves?: ShiftActiveLeaveInput[];
  }): MonthShiftSequenceProjection {
    const { year, month, pattern } = params;
    const startStepOffset = params.startStepOffset ?? 0;
    const activeLeaves = params.activeLeaves ?? [];

    if (!pattern || pattern.length === 0) {
      throw new Error('El patrón de secuencia no puede estar vacío.');
    }

    if (month < 1 || month > 12) {
      throw new Error('El mes debe estar entre 1 y 12.');
    }

    const holidayEngine = new ColombianHolidayEngine();
    const holidays = params.holidays ?? holidayEngine.getHolidaysForYear(year);

    // Days in month using UTC
    const totalDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const days: DayShiftProjection[] = [];
    let totalWorkedDays = 0;
    let totalRestDays = 0;
    let totalLeaveDays = 0;

    const summaryHours = {
      ordinaryDayHours: 0,
      nightSurchargeHours: 0,
      sundayHolidayHours: 0,
      overtimeDayHours: 0,
      overtimeNightHours: 0,
      overtimeHolidayDayHours: 0,
      overtimeHolidayNightHours: 0,
      totalCalculatedHours: 0,
    };

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(Date.UTC(year, month - 1, day));
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

      const matchedHoliday = holidays.find((h) => h.dateStr === dateStr);
      const isSunday = dayOfWeek === 0;
      const isHolidayOrSunday = isSunday || Boolean(matchedHoliday);

      // Check if day is covered by an active leave
      const coveringLeave = activeLeaves.find((leave) => {
        const startStr =
          typeof leave.startDate === 'string'
            ? leave.startDate.split('T')[0]
            : leave.startDate.toISOString().split('T')[0];
        const endStr =
          typeof leave.endDate === 'string'
            ? leave.endDate.split('T')[0]
            : leave.endDate.toISOString().split('T')[0];
        return dateStr >= startStr && dateStr <= endStr;
      });

      let shiftCode: ShiftDayCode;
      let leaveId: string | undefined = undefined;

      if (coveringLeave) {
        shiftCode = this.mapLeaveTypeToShiftCode(coveringLeave.leaveType);
        leaveId = coveringLeave.id;
        totalLeaveDays++;
      } else {
        // Sequence pattern index
        const patternIndex = (startStepOffset + (day - 1)) % pattern.length;
        const rawCode = pattern[patternIndex].toUpperCase();
        shiftCode = (ShiftDayCode as any)[rawCode] ?? ShiftDayCode.X;

        if (shiftCode === ShiftDayCode.X) {
          totalRestDays++;
        } else {
          totalWorkedDays++;
        }
      }

      const hours = this.calculateShiftHours(shiftCode, isHolidayOrSunday);

      summaryHours.ordinaryDayHours += hours.ordinaryDayHours;
      summaryHours.nightSurchargeHours += hours.nightSurchargeHours;
      summaryHours.sundayHolidayHours += hours.sundayHolidayHours;
      summaryHours.overtimeDayHours += hours.overtimeDayHours;
      summaryHours.overtimeNightHours += hours.overtimeNightHours;
      summaryHours.overtimeHolidayDayHours += hours.overtimeHolidayDayHours;
      summaryHours.overtimeHolidayNightHours += hours.overtimeHolidayNightHours;

      days.push({
        dayOfMonth: day,
        dateStr,
        date,
        isHolidayOrSunday,
        holidayName: matchedHoliday?.name,
        shiftCode,
        leaveId,
        ...hours,
      });
    }

    summaryHours.totalCalculatedHours =
      summaryHours.ordinaryDayHours +
      summaryHours.sundayHolidayHours +
      summaryHours.overtimeDayHours +
      summaryHours.overtimeNightHours +
      summaryHours.overtimeHolidayDayHours +
      summaryHours.overtimeHolidayNightHours;

    return {
      year,
      month,
      totalDaysInMonth,
      pattern,
      startStepOffset,
      totalWorkedDays,
      totalRestDays,
      totalLeaveDays,
      summaryHours,
      days,
    };
  }
}
