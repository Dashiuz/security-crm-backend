import { ShiftSequenceEngine } from './shift-sequence.engine';
import { ShiftDayCode, LeaveAndAbsenceType } from '@prisma/client';

describe('ShiftSequenceEngine', () => {
  const pattern2x2x2 = ['D', 'D', 'N', 'N', 'X', 'X'];

  describe('mapLeaveTypeToShiftCode', () => {
    it('should map all leave types correctly', () => {
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.SICK_LEAVE_EG,
        ),
      ).toBe(ShiftDayCode.INC);
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.WORK_ACCIDENT_AT,
        ),
      ).toBe(ShiftDayCode.AT);
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.MATERNITY_PATERNITY_LMA,
        ),
      ).toBe(ShiftDayCode.LMA);
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.PAID_LEAVE_LR,
        ),
      ).toBe(ShiftDayCode.LR);
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.UNPAID_LEAVE_LNR,
        ),
      ).toBe(ShiftDayCode.LNR);
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.DISCIPLINARY_SUSPENSION_SAN,
        ),
      ).toBe(ShiftDayCode.SAN);
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.UNJUSTIFIED_ABSENCE_AUS,
        ),
      ).toBe(ShiftDayCode.AUS);
      expect(
        ShiftSequenceEngine.mapLeaveTypeToShiftCode(
          LeaveAndAbsenceType.VACATION_TIME_VAC,
        ),
      ).toBe(ShiftDayCode.VAC);
    });
  });

  describe('calculateShiftHours', () => {
    it('should calculate hours for D on regular day (8 ord, 4 extra)', () => {
      const hours = ShiftSequenceEngine.calculateShiftHours(
        ShiftDayCode.D,
        false,
      );
      expect(hours.ordinaryDayHours).toBe(8);
      expect(hours.overtimeDayHours).toBe(4);
      expect(hours.sundayHolidayHours).toBe(0);
      expect(hours.nightSurchargeHours).toBe(0);
    });

    it('should calculate hours for D on Sunday / Holiday (8 sun/hol, 4 extra hol)', () => {
      const hours = ShiftSequenceEngine.calculateShiftHours(
        ShiftDayCode.D,
        true,
      );
      expect(hours.ordinaryDayHours).toBe(0);
      expect(hours.overtimeDayHours).toBe(0);
      expect(hours.sundayHolidayHours).toBe(8);
      expect(hours.overtimeHolidayDayHours).toBe(4);
    });

    it('should calculate hours for N on regular day (8 ord, 5 RN, 4 extra night)', () => {
      const hours = ShiftSequenceEngine.calculateShiftHours(
        ShiftDayCode.N,
        false,
      );
      expect(hours.ordinaryDayHours).toBe(8);
      expect(hours.nightSurchargeHours).toBe(5);
      expect(hours.overtimeNightHours).toBe(4);
      expect(hours.sundayHolidayHours).toBe(0);
    });

    it('should calculate hours for N on Sunday / Holiday (8 sun/hol, 5 RN, 4 extra hol night)', () => {
      const hours = ShiftSequenceEngine.calculateShiftHours(
        ShiftDayCode.N,
        true,
      );
      expect(hours.ordinaryDayHours).toBe(0);
      expect(hours.sundayHolidayHours).toBe(8);
      expect(hours.nightSurchargeHours).toBe(5);
      expect(hours.overtimeHolidayNightHours).toBe(4);
    });

    it('should return 0 hours for rest or leaves', () => {
      const rest = ShiftSequenceEngine.calculateShiftHours(
        ShiftDayCode.X,
        false,
      );
      expect(rest.ordinaryDayHours).toBe(0);
      expect(rest.overtimeDayHours).toBe(0);

      const inc = ShiftSequenceEngine.calculateShiftHours(
        ShiftDayCode.INC,
        true,
      );
      expect(inc.sundayHolidayHours).toBe(0);
    });
  });

  describe('projectMonth', () => {
    it('should project October 2026 (31 days) with 2x2x2 sequence correctly', () => {
      const projection = ShiftSequenceEngine.projectMonth({
        year: 2026,
        month: 10,
        pattern: pattern2x2x2,
        startStepOffset: 0,
      });

      expect(projection.totalDaysInMonth).toBe(31);
      expect(projection.days.length).toBe(31);
      // Pattern: D, D, N, N, X, X
      expect(projection.days[0].shiftCode).toBe(ShiftDayCode.D); // Day 1
      expect(projection.days[1].shiftCode).toBe(ShiftDayCode.D); // Day 2
      expect(projection.days[2].shiftCode).toBe(ShiftDayCode.N); // Day 3
      expect(projection.days[3].shiftCode).toBe(ShiftDayCode.N); // Day 4
      expect(projection.days[4].shiftCode).toBe(ShiftDayCode.X); // Day 5
      expect(projection.days[5].shiftCode).toBe(ShiftDayCode.X); // Day 6
      expect(projection.days[6].shiftCode).toBe(ShiftDayCode.D); // Day 7
    });

    it('should override days covered by active leaves with leave code and 0 worked hours', () => {
      const projection = ShiftSequenceEngine.projectMonth({
        year: 2026,
        month: 10,
        pattern: pattern2x2x2,
        startStepOffset: 0,
        activeLeaves: [
          {
            id: 'leave-123',
            leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
            startDate: '2026-10-01',
            endDate: '2026-10-03',
          },
        ],
      });

      // Days 1, 2, 3 should be INC
      expect(projection.days[0].shiftCode).toBe(ShiftDayCode.INC);
      expect(projection.days[0].leaveId).toBe('leave-123');
      expect(projection.days[0].ordinaryDayHours).toBe(0);

      expect(projection.days[1].shiftCode).toBe(ShiftDayCode.INC);
      expect(projection.days[2].shiftCode).toBe(ShiftDayCode.INC);

      // Day 4 should follow normal sequence pattern (index 3 -> N)
      expect(projection.days[3].shiftCode).toBe(ShiftDayCode.N);
      expect(projection.days[3].leaveId).toBeUndefined();
      expect(projection.totalLeaveDays).toBe(3);
    });

    it('should identify Colombian statutory holidays and Sundays correctly', () => {
      // 2026-10-12 is Dia de la Raza (Emiliani holiday)
      const projection = ShiftSequenceEngine.projectMonth({
        year: 2026,
        month: 10,
        pattern: pattern2x2x2,
      });

      // Day 12
      const day12 = projection.days[11];
      expect(day12.isHolidayOrSunday).toBe(true);
      expect(day12.holidayName).toBe('Día de la Raza');
    });

    it('should throw if pattern is empty or month is invalid', () => {
      expect(() => {
        ShiftSequenceEngine.projectMonth({
          year: 2026,
          month: 10,
          pattern: [],
        });
      }).toThrow('El patrón de secuencia no puede estar vacío.');

      expect(() => {
        ShiftSequenceEngine.projectMonth({
          year: 2026,
          month: 13,
          pattern: ['D'],
        });
      }).toThrow('El mes debe estar entre 1 y 12.');
    });
  });
});
