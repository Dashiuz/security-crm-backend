import { EmploymentContractType } from '@prisma/client';
import { ContractTerminationEngine } from './contract-termination.engine';

describe('ContractTerminationEngine', () => {
  const smmlv = 1423500;
  const transportAllowance = 200000;

  it('should calculate voluntary retirement (just cause / no indemnification) with proportional benefits', () => {
    const res = ContractTerminationEngine.calculateFinalLiquidation({
      hireDate: '2025-01-01',
      retirementDate: '2026-06-30',
      contractType: EmploymentContractType.INDEFINITE,
      isJustCause: true,
      applyIndemnification: false,
      lastBasicSalary: 1500000,
      cesantiasAverageBase: 1700000, // 1500000 + 200000 transport
      primaAverageBase: 1700000,
      vacationAverageBase: 1500000,
      vacationEnjoyedDaysTotal: 15, // already took 15 days in 2025
      unpaidLeaveDaysTotal: 0,
      smmlv,
      transportAllowanceAmount: transportAllowance,
      includePendingPayroll: false,
    });

    // Total contract: 1.5 years = 540 days
    expect(res.totalContractDays360).toBe(540);
    expect(res.netServiceDaysTotal).toBe(540);
    expect(res.cesantiasPendingDays).toBe(180); // Jan 1 2026 to Jun 30 2026
    expect(res.primaPendingDays).toBe(180); // Jan 1 2026 to Jun 30 2026

    // Total vacation accrued: 540 * 15 / 360 = 22.5 days. Already enjoyed 15 -> 7.5 days pending
    expect(res.vacationTotalAccruedDays).toBe(22.5);
    expect(res.vacationPendingBusinessDays).toBe(7.5);
    // Vacation amount = (1500000 / 30) * 7.5 = 375000
    expect(res.vacationAmount).toBe(375000);

    // Cesantías = (1700000 * 180) / 360 = 850000
    expect(res.cesantiasAmount).toBe(850000);
    // Interests = (850000 * 180 * 0.12) / 360 = 51000
    expect(res.interestsCesantiasAmount).toBe(51000);
    // Prima = (1700000 * 180) / 360 = 850000
    expect(res.primaAmount).toBe(850000);

    expect(res.indemnificationAmount).toBe(0);
    expect(res.applyIndemnification).toBe(false);
    expect(res.netPayAmount).toBe(850000 + 51000 + 850000 + 375000);
  });

  it('should calculate dismissal without just cause on indefinite contract with indemnification (Art. 64 CST)', () => {
    // 2 years of service = 720 days
    const res = ContractTerminationEngine.calculateFinalLiquidation({
      hireDate: '2024-01-01',
      retirementDate: '2025-12-31',
      contractType: EmploymentContractType.INDEFINITE,
      isJustCause: false, // triggers indemnification
      lastBasicSalary: 1500000,
      cesantiasAverageBase: 1700000,
      primaAverageBase: 1700000,
      vacationAverageBase: 1500000,
      vacationEnjoyedDaysTotal: 30, // fully took vacations
      smmlv,
      transportAllowanceAmount: transportAllowance,
      includePendingPayroll: false,
    });

    expect(res.applyIndemnification).toBe(true);
    // Under 10 SMMLV: 30 days first year + 20 days second year = 50 days
    expect(res.indemnificationDays).toBe(50);
    // Indemnification amount = (1500000 / 30) * 50 = 2500000
    expect(res.indemnificationAmount).toBe(2500000);
    expect(res.vacationPendingBusinessDays).toBe(0);
  });

  it('should calculate dismissal on fixed-term contract with remaining contract days indemnified', () => {
    const res = ContractTerminationEngine.calculateFinalLiquidation({
      hireDate: '2026-01-01',
      retirementDate: '2026-06-30',
      contractType: EmploymentContractType.FIXED_TERM,
      contractEndDate: '2026-12-31', // 6 months remaining = 180 days
      isJustCause: false,
      lastBasicSalary: 1800000,
      cesantiasAverageBase: 1800000,
      primaAverageBase: 1800000,
      vacationAverageBase: 1800000,
      vacationEnjoyedDaysTotal: 0,
      smmlv,
      transportAllowanceAmount: transportAllowance,
      includePendingPayroll: true,
      pendingPayrollDays: 10,
      loansDeductedAmount: 150000,
    });

    expect(res.applyIndemnification).toBe(true);
    expect(res.indemnificationDays).toBeGreaterThan(15);
    expect(res.pendingBasicSalaryAmount).toBe(600000); // (1800000 / 30) * 10
    expect(res.loansDeductedAmount).toBe(150000);
    expect(res.totalDeductions).toBeGreaterThan(150000); // includes health & pension on pending 10 days
    expect(res.netPayAmount).toBeGreaterThan(0);
  });
});

