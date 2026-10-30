import { VacationSettlementType, SocialBenefitType } from '@prisma/client';
import { SocialBenefitsAndVacationsEngine } from './social-benefits-and-vacations.engine';

describe('SocialBenefitsAndVacationsEngine', () => {
  describe('calculateDays360', () => {
    it('should correctly calculate full calendar year as 360 days', () => {
      const days = SocialBenefitsAndVacationsEngine.calculateDays360(
        '2026-01-01',
        '2026-12-31',
      );
      expect(days).toBe(360);
    });

    it('should correctly calculate standard month as 30 days', () => {
      const days = SocialBenefitsAndVacationsEngine.calculateDays360(
        '2026-01-01',
        '2026-01-31',
      );
      expect(days).toBe(30);
    });

    it('should normalize February to 30 days', () => {
      const days = SocialBenefitsAndVacationsEngine.calculateDays360(
        '2026-02-01',
        '2026-02-28',
      );
      expect(days).toBe(30);
    });

    it('should return 0 when start date is after end date', () => {
      const days = SocialBenefitsAndVacationsEngine.calculateDays360(
        '2026-06-01',
        '2026-01-01',
      );
      expect(days).toBe(0);
    });
  });

  describe('calculateVacationScheduleAndAmount', () => {
    it('should calculate 15 business days enjoyed in time skipping weekends and holidays', () => {
      // 2026-06-01 is Monday.
      // Holidays: 2026-06-08 (Corpus Christi holiday)
      const res =
        SocialBenefitsAndVacationsEngine.calculateVacationScheduleAndAmount({
          enjoymentStartDate: '2026-06-01',
          businessDays: 15,
          saturdayIsWorkingDay: false, // Mon-Fri working
          holidayDates: ['2026-06-08'],
          currentBasicSalary: 1423500,
          averageVariableVacBase: 200000,
          vacationType: VacationSettlementType.ENJOYED_IN_TIME,
          loansToDeduct: 50000,
        });

      expect(res.businessDays).toBe(15);
      expect(res.enjoymentStartDate).toBe('2026-06-01');
      expect(res.totalVacationBase).toBe(1623500);
      expect(res.dailyVacationRate).toBe(54116.67);
      expect(res.calendarDaysPaid).toBeGreaterThan(15);
      expect(res.healthDeductionAmount).toBe(
        SocialBenefitsAndVacationsEngine['round2'](
          res.grossVacationAmount * 0.04,
        ),
      );
      expect(res.pensionDeductionAmount).toBe(
        SocialBenefitsAndVacationsEngine['round2'](
          res.grossVacationAmount * 0.04,
        ),
      );
      expect(res.loansDeductionAmount).toBe(50000);
      expect(res.netPayAmount).toBe(
        SocialBenefitsAndVacationsEngine['round2'](
          res.grossVacationAmount -
            res.healthDeductionAmount -
            res.pensionDeductionAmount -
            50000,
        ),
      );
    });

    it('should calculate cash-compensated vacation without social security deductions', () => {
      const res =
        SocialBenefitsAndVacationsEngine.calculateVacationScheduleAndAmount({
          enjoymentStartDate: '2026-07-01',
          businessDays: 15,
          saturdayIsWorkingDay: true,
          holidayDates: [],
          currentBasicSalary: 1500000,
          averageVariableVacBase: 0,
          vacationType: VacationSettlementType.COMPENSATED_IN_CASH,
        });

      expect(res.healthDeductionAmount).toBe(0);
      expect(res.pensionDeductionAmount).toBe(0);
      expect(res.grossVacationAmount).toBe(750000); // (1500000 / 30) * 15
      expect(res.netPayAmount).toBe(750000);
    });
  });

  describe('calculateSocialBenefitItem', () => {
    it('should calculate Prima 1st semester with transport allowance for wage <= 2 SMMLV', () => {
      const smmlv = 1423500;
      const transportAllowance = 200000;

      const res = SocialBenefitsAndVacationsEngine.calculateSocialBenefitItem({
        benefitType: SocialBenefitType.PRIMA_FIRST_SEMESTER,
        employeeEntryDate: '2025-01-01',
        periodStartDate: '2026-01-01',
        cutoffDate: '2026-05-31',
        projectionEndDate: '2026-06-30',
        basicSalaryMonthly: 1500000,
        averageVariableEarnings: 300000,
        smmlv,
        transportAllowanceAmount: transportAllowance,
      });

      expect(res.grossDaysInPeriod).toBe(180);
      expect(res.netDaysWorked).toBe(180);
      expect(res.transportAllowanceBase).toBe(200000); // 1500000 + 300000 <= 2 * 1423500 (2847000)
      expect(res.totalComputationBase).toBe(2000000);
      // Prima = (2000000 * 180) / 360 = 1000000
      expect(res.calculatedBenefitAmount).toBe(1000000);
      expect(res.calculatedInterestAmount).toBe(0);
    });

    it('should calculate Severance and 12% Interests for full year', () => {
      const smmlv = 1423500;
      const transportAllowance = 200000;

      const res = SocialBenefitsAndVacationsEngine.calculateSocialBenefitItem({
        benefitType: SocialBenefitType.SEVERANCE_ANNUAL,
        employeeEntryDate: '2026-01-01',
        periodStartDate: '2026-01-01',
        cutoffDate: '2026-11-30',
        projectionEndDate: '2026-12-31',
        basicSalaryMonthly: 2000000,
        averageVariableEarnings: 200000,
        smmlv,
        transportAllowanceAmount: transportAllowance,
        unpaidLeaveDaysDeducted: 10,
      });

      expect(res.grossDaysInPeriod).toBe(360);
      expect(res.netDaysWorked).toBe(350); // 360 - 10
      expect(res.transportAllowanceBase).toBe(200000);
      expect(res.totalComputationBase).toBe(2400000);
      // Severance = (2400000 * 350) / 360 = 2333333.33
      expect(res.calculatedBenefitAmount).toBe(2333333.33);
      // Interests = (2333333.33 * 350 * 0.12) / 360 = 272222.22
      expect(res.calculatedInterestAmount).toBe(272222.22);
      expect(res.interestRatePct).toBe(12);
    });
  });
});
