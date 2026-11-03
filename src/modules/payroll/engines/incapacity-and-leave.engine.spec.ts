import { IncapacityAndLeaveEngine } from './incapacity-and-leave.engine';
import { LeaveAndAbsenceType, EpsClaimStatus } from '@prisma/client';

describe('IncapacityAndLeaveEngine', () => {
  const SMMLV_2026 = 1750905.0; // Daily floor: 58363.50

  describe('SICK_LEAVE_EG (General Illness)', () => {
    it('should split 5 days: 2 days employer (66.67%), 3 days EPS (66.67%) with SMMLV floor', () => {
      // Base salary 3,000,000 -> ibcDaily = 100,000
      // 66.67% of 100,000 = 66,670 (higher than floor 58,363.50)
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        baseSalaryMonthly: 3000000,
        smmlv: SMMLV_2026,
      });

      expect(result.totalDays).toBe(5);
      expect(result.employerDays).toBe(2);
      expect(result.entityDays).toBe(3);
      expect(result.ibcDailyValue).toBe(100000);
      expect(result.employerRecognizedAmount).toBe(133340); // 66670 * 2
      expect(result.entityRecognizedAmount).toBe(200010); // 66670 * 3
      expect(result.totalLiquidatedAmount).toBe(333350);
      expect(result.claimStatus).toBe(EpsClaimStatus.PENDING_FILING);
      expect(result.dailyBreakdown.length).toBe(5);
      expect(result.dailyBreakdown[0].payer).toBe('EMPLOYER');
      expect(result.dailyBreakdown[2].payer).toBe('ENTITY');
    });

    it('should enforce SMMLV daily floor when 66.67% calculation falls below minimum wage daily', () => {
      // Base salary 1,750,905 (1 SMMLV) -> ibcDaily = 58,363.50
      // 66.67% of 58,363.50 = 38,910.95 -> FLOOR is 58,363.50!
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
        startDate: '2026-03-10',
        endDate: '2026-03-12',
        baseSalaryMonthly: SMMLV_2026,
        smmlv: SMMLV_2026,
      });

      expect(result.totalDays).toBe(3);
      expect(result.employerDays).toBe(2);
      expect(result.entityDays).toBe(1);
      // Daily floor is 58363.5
      expect(result.employerRecognizedAmount).toBe(116727); // 58363.5 * 2
      expect(result.entityRecognizedAmount).toBe(58363.5); // 58363.5 * 1
    });

    it('should allow configurable employer rate (e.g. 100% for days 1-2)', () => {
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        baseSalaryMonthly: 3000000, // ibcDaily = 100,000
        smmlv: SMMLV_2026,
        employerSickLeaveRatePct: 100,
      });

      expect(result.totalDays).toBe(2);
      expect(result.employerDays).toBe(2);
      expect(result.entityDays).toBe(0);
      expect(result.employerRecognizedAmount).toBe(200000);
      expect(result.claimStatus).toBe(EpsClaimStatus.NOT_APPLICABLE);
    });

    it('should handle extension starting after day 2 (100% EPS)', () => {
      // Previous days = 2. Extension of 5 days means days 3 to 7 -> all EPS
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
        startDate: '2026-05-03',
        endDate: '2026-05-07',
        baseSalaryMonthly: 3000000,
        smmlv: SMMLV_2026,
        isExtension: true,
        accumulatedPriorDays: 2,
      });

      expect(result.totalDays).toBe(5);
      expect(result.employerDays).toBe(0);
      expect(result.entityDays).toBe(5);
      expect(result.employerRecognizedAmount).toBe(0);
      expect(result.claimStatus).toBe(EpsClaimStatus.PENDING_FILING);
    });

    it('should apply 50% rate when accumulated days exceed 90 days', () => {
      // Previous days = 90. Extension of 2 days means days 91 to 92 -> 50%
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        baseSalaryMonthly: 6000000, // ibcDaily = 200,000; 50% = 100,000 (well above floor)
        smmlv: SMMLV_2026,
        isExtension: true,
        accumulatedPriorDays: 90,
      });

      expect(result.totalDays).toBe(2);
      expect(result.dailyBreakdown[0].ratePct).toBe(50);
      expect(result.dailyBreakdown[0].dailyAmount).toBe(100000);
      expect(result.entityRecognizedAmount).toBe(200000);
    });
  });

  describe('WORK_ACCIDENT_AT (Accidente de Trabajo - ARL)', () => {
    it('should recognize 100% IBC from day 1 paid by entity (ARL)', () => {
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.WORK_ACCIDENT_AT,
        startDate: '2026-07-01',
        endDate: '2026-07-04',
        baseSalaryMonthly: 3000000, // ibcDaily = 100,000
      });

      expect(result.totalDays).toBe(4);
      expect(result.employerDays).toBe(0);
      expect(result.entityDays).toBe(4);
      expect(result.entityRecognizedAmount).toBe(400000);
      expect(result.claimStatus).toBe(EpsClaimStatus.PENDING_FILING);
      expect(result.dailyBreakdown[0].payer).toBe('ENTITY');
    });
  });

  describe('MATERNITY_PATERNITY_LMA', () => {
    it('should recognize 100% IBC paid by entity (EPS)', () => {
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.MATERNITY_PATERNITY_LMA,
        startDate: '2026-08-01',
        endDate: '2026-08-14',
        baseSalaryMonthly: 3000000,
      });

      expect(result.totalDays).toBe(14);
      expect(result.employerDays).toBe(0);
      expect(result.entityDays).toBe(14);
      expect(result.entityRecognizedAmount).toBe(1400000);
      expect(result.claimStatus).toBe(EpsClaimStatus.PENDING_FILING);
    });
  });

  describe('PAID_LEAVE_LR & VACATION_TIME_VAC', () => {
    it('should recognize 100% IBC paid by employer', () => {
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.PAID_LEAVE_LR,
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        baseSalaryMonthly: 3000000,
      });

      expect(result.totalDays).toBe(3);
      expect(result.employerDays).toBe(3);
      expect(result.entityDays).toBe(0);
      expect(result.employerRecognizedAmount).toBe(300000);
      expect(result.claimStatus).toBe(EpsClaimStatus.NOT_APPLICABLE);
    });
  });

  describe('DISCIPLINARY_SUSPENSION_SAN & UNJUSTIFIED_ABSENCE_AUS', () => {
    it('should calculate deduction amount and mark affectsSeventhDay = true', () => {
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.UNJUSTIFIED_ABSENCE_AUS,
        startDate: '2026-10-05',
        endDate: '2026-10-06',
        baseSalaryMonthly: 3000000,
      });

      expect(result.totalDays).toBe(2);
      expect(result.employerDays).toBe(0);
      expect(result.entityDays).toBe(0);
      expect(result.totalLiquidatedAmount).toBe(200000); // deduction value
      expect(result.affectsSeventhDay).toBe(true);
      expect(result.claimStatus).toBe(EpsClaimStatus.NOT_APPLICABLE);
    });
  });

  describe('UNPAID_LEAVE_LNR', () => {
    it('should have 0 recognized amount and NOT_APPLICABLE claim status', () => {
      const result = IncapacityAndLeaveEngine.calculate({
        leaveType: LeaveAndAbsenceType.UNPAID_LEAVE_LNR,
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        baseSalaryMonthly: 3000000,
      });

      expect(result.totalDays).toBe(5);
      expect(result.employerDays).toBe(0);
      expect(result.entityDays).toBe(0);
      expect(result.employerRecognizedAmount).toBe(0);
      expect(result.entityRecognizedAmount).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should throw an error if endDate is before startDate', () => {
      expect(() => {
        IncapacityAndLeaveEngine.calculate({
          leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
          startDate: '2026-12-10',
          endDate: '2026-12-05',
          baseSalaryMonthly: 3000000,
        });
      }).toThrow(
        'La fecha de finalización no puede ser anterior a la fecha de inicio.',
      );
    });
  });
});
