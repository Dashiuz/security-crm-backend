import { Test, TestingModule } from '@nestjs/testing';
import { PayrollBenefitsPdfService } from './payroll-benefits-pdf.service';

describe('PayrollBenefitsPdfService', () => {
  let service: PayrollBenefitsPdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollBenefitsPdfService],
    }).compile();

    service = module.get<PayrollBenefitsPdfService>(PayrollBenefitsPdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate vacation slip PDF buffer with valid PDF header', async () => {
    const buffer = await service.generateVacationSlipPdf({
      settlementId: 'vac-12345',
      vacationType: 'ENJOYED_IN_TIME',
      status: 'APPROVED',
      accrualStartDate: '2025-01-01',
      accrualEndDate: '2025-12-31',
      enjoymentStartDate: '2026-06-01',
      enjoymentEndDate: '2026-06-18',
      returnDate: '2026-06-19',
      businessDays: 15,
      calendarDaysPaid: 18,
      currentBasicSalary: 1423500,
      averageVariableVacBase: 150000,
      totalVacationBase: 1573500,
      grossVacationAmount: 944100,
      healthDeductionAmount: 37764,
      pensionDeductionAmount: 37764,
      loansDeductionAmount: 0,
      netPayAmount: 868572,
      company: {
        legalName: 'Seguridad Explorer Ltda',
        nit: '900123456',
        city: 'Bogotá D.C.',
      },
      employee: {
        documentType: 'CC',
        document: '10102020',
        fullName: 'Carlos Rodriguez',
        positionName: 'Guarda de Seguridad',
      },
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // Check %PDF magic number
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('should generate final contract settlement PDF buffer with valid PDF header', async () => {
    const buffer = await service.generateFinalLiquidationPdf({
      settlementId: 'fin-98765',
      contractType: 'FIXED_TERM',
      exitReasonName: 'Vencimiento de término pactado',
      isJustCause: true,
      hireDate: '2025-01-01',
      retirementDate: '2026-06-30',
      contractDays360: 540,
      netServiceDays: 540,
      unpaidLeaveDays: 0,
      lastBasicSalary: 1500000,
      transportAllowanceApplicable: 200000,
      cesantiasAverageBase: 1700000,
      primaAverageBase: 1700000,
      vacationAverageBase: 1500000,
      cesantiasPendingDays: 180,
      cesantiasAmount: 850000,
      interestsCesantiasAmount: 51000,
      primaPendingDays: 180,
      primaAmount: 850000,
      vacationAccruedDays: 22.5,
      vacationEnjoyedDays: 15,
      vacationPendingDays: 7.5,
      vacationAmount: 375000,
      includePendingPayroll: false,
      pendingPayrollDays: 0,
      pendingBasicSalaryAmount: 0,
      pendingTransportAmount: 0,
      pendingOvertimeAmount: 0,
      pendingHealthDeduction: 0,
      pendingPensionDeduction: 0,
      applyIndemnification: false,
      indemnificationDays: 0,
      indemnificationAmount: 0,
      otherEarningsAmount: 0,
      loansDeductedAmount: 0,
      otherDeductionsAmount: 0,
      totalBenefitsAndEarnings: 2126000,
      totalDeductions: 0,
      netPayAmount: 2126000,
      company: {
        legalName: 'Seguridad Explorer Ltda',
        nit: '900123456',
        city: 'Bogotá D.C.',
      },
      employee: {
        documentType: 'CC',
        document: '10102020',
        fullName: 'Carlos Rodriguez',
      },
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});

