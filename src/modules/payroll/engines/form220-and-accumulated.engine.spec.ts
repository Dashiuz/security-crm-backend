import {
  Form220AndAccumulatedEngine,
  Form220Input,
  AnnualSettlementInput,
} from './form220-and-accumulated.engine';

describe('Form220AndAccumulatedEngine', () => {
  let engine: Form220AndAccumulatedEngine;

  beforeEach(() => {
    engine = new Form220AndAccumulatedEngine();
  });

  const sampleTaxData: Form220Input = {
    year: 2026,
    issueDate: '2027-02-15',
    expeditionCity: 'BOGOTÁ D.C.',
    retentionAgentNit: '900123456',
    retentionAgentName: 'SEGURIDAD NOXIA LTDA',
    employeeId: 'emp-guard-01',
    employeeDocument: '1010123456',
    employeeFullName: 'CARLOS ANDRES RODRIGUEZ PEREZ',
    certifiedFromDate: '2026-01-01',
    certifiedToDate: '2026-12-31',
    salariesEarned: 22000000, // Row 36
    honorariesEarned: 0, // Row 37
    socialBenefitsEarned: 3500000, // Row 38
    nonSalarialAllowances: 2400000, // Row 39
    otherIncome: 500000, // Row 40
    indemnifications: 0, // Row 41
    severancePaidDirectly: 1800000, // Row 46
    pensionsIncome: 0, // Row 47
    healthDeductions: 880000, // Row 50
    pensionAndFspDeductions: 880000, // Row 51
    voluntaryPensionDeductions: 0, // Row 52
    afcDeductions: 0, // Row 53
    withholdingTax: 320000, // Row 55
  };

  it('should generate official Formulario 220 DIAN rows with correct Row 49 sum and QR code', () => {
    const res = engine.generateFormulario220(sampleTaxData);

    expect(res.year).toBe(2026);
    expect(res.retentionAgentNit).toBe('900123456');
    expect(res.employeeDocument).toBe('1010123456');
    expect(res.row36Salaries).toBe(22000000);
    expect(res.row38SocialBenefits).toBe(3500000);
    expect(res.row39AllowancesNonSalarial).toBe(2400000);
    expect(res.row40OtherIncome).toBe(500000);
    expect(res.row46SeverancePaid).toBe(1800000);

    // Row 49 = Row 36 + 37 + 38 + 39 + 40 + 41 + 46 + 47
    // 22000000 + 0 + 3500000 + 2400000 + 500000 + 0 + 1800000 + 0 = 30,200,000
    expect(res.row49TotalGrossIncome).toBe(30200000);

    expect(res.row50HealthDeduction).toBe(880000);
    expect(res.row51PensionAndFspDeduction).toBe(880000);
    expect(res.row55WithholdingTax).toBe(320000);

    expect(res.qrCodeData).toContain('NumFormulario=220');
    expect(res.qrCodeData).toContain('AnoGravable=2026');
    expect(res.qrCodeData).toContain('NitAgente=900123456');
    expect(res.qrCodeData).toContain('DocTrabajador=1010123456');
    expect(res.qrCodeData).toContain('ValIngresos=30200000');
    expect(res.qrCodeData).toContain('ValRetencion=320000');
  });

  it('should generate 12-Month Annual Accumulated BI Matrix grouped by month and employee', () => {
    const settlements: AnnualSettlementInput[] = [
      {
        employeeId: 'emp-1',
        employeeDocument: '1010123456',
        employeeFullName: 'JUAN GUARDA',
        costCenterCode: 'CC-01',
        costCenterName: 'PUESTO 1',
        dependencyCode: 201,
        month: 1,
        year: 2026,
        basicSalary: 1423500,
        overtimeAndSurcharges: 200000,
        transportAllowance: 200000,
        nonSalarialAllowances: 0,
        incapacitiesAndLeaves: 0,
        otherEarnings: 0,
        totalEarnings: 1823500,
        healthDeduction: 57000,
        pensionDeduction: 57000,
        fspDeduction: 0,
        withholdingTax: 0,
        otherDeductions: 0,
        totalDeductions: 114000,
        netPay: 1709500,
      },
      {
        employeeId: 'emp-1',
        employeeDocument: '1010123456',
        employeeFullName: 'JUAN GUARDA',
        costCenterCode: 'CC-01',
        costCenterName: 'PUESTO 1',
        dependencyCode: 201,
        month: 2,
        year: 2026,
        basicSalary: 1423500,
        overtimeAndSurcharges: 250000,
        transportAllowance: 200000,
        nonSalarialAllowances: 0,
        incapacitiesAndLeaves: 0,
        otherEarnings: 0,
        totalEarnings: 1873500,
        healthDeduction: 57000,
        pensionDeduction: 57000,
        fspDeduction: 0,
        withholdingTax: 0,
        otherDeductions: 0,
        totalDeductions: 114000,
        netPay: 1759500,
      },
    ];

    const matrix = engine.generateAnnualAccumulatedMatrix(settlements, 2026);

    expect(matrix.year).toBe(2026);
    expect(matrix.totalEmployees).toBe(1);

    const emp = matrix.employees[0];
    expect(emp.employeeDocument).toBe('1010123456');
    expect(emp.months[1].totalEarnings).toBe(1823500);
    expect(emp.months[2].totalEarnings).toBe(1873500);
    expect(emp.months[3].totalEarnings).toBe(0); // Unpopulated month

    // Employee Year Totals
    expect(emp.yearTotals.basicSalary).toBe(2847000);
    expect(emp.yearTotals.overtimeAndSurcharges).toBe(450000);
    expect(emp.yearTotals.totalEarnings).toBe(1823500 + 1873500);
    expect(emp.yearTotals.totalDeductions).toBe(228000);
    expect(emp.yearTotals.netPay).toBe(3469000);

    // Company Grand Totals
    expect(matrix.grandTotalsByMonth[1].totalEarnings).toBe(1823500);
    expect(matrix.grandTotalsByMonth[2].totalEarnings).toBe(1873500);
    expect(matrix.grandTotalYear.totalEarnings).toBe(1823500 + 1873500);
    expect(matrix.grandTotalYear.netPay).toBe(3469000);
  });
});
