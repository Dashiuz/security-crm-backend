import { Injectable } from '@nestjs/common';

export interface Form220Input {
  year: number;
  issueDate?: Date | string;
  expeditionCity?: string;
  retentionAgentNit: string;
  retentionAgentName: string;
  employeeId: string;
  employeeDocument: string;
  employeeFullName: string;
  certifiedFromDate?: Date | string;
  certifiedToDate?: Date | string;
  // Raw totals or settlement lines
  salariesEarned: number; // Row 36: Pagos por salarios o emolumentos
  honorariesEarned?: number; // Row 37: Honorarios
  socialBenefitsEarned: number; // Row 38: Servicios, primas, cesantías e intereses
  nonSalarialAllowances: number; // Row 39: Auxilio de transporte y otros no salariales
  otherIncome?: number; // Row 40: Otros ingresos laborales
  indemnifications?: number; // Row 41: Indemnizaciones laborales
  severancePaidDirectly?: number; // Row 46: Cesantías e intereses pagadas efectivamente
  pensionsIncome?: number; // Row 47: Pensiones
  healthDeductions: number; // Row 50: Aportes obligatorios por salud
  pensionAndFspDeductions: number; // Row 51: Aportes obligatorios a pensiones y FSP
  voluntaryPensionDeductions?: number; // Row 52
  afcDeductions?: number; // Row 53
  withholdingTax: number; // Row 55: Retención en la fuente practicada
}

export interface Form220Result {
  year: number;
  issueDate: Date;
  certifiedFromDate: Date;
  certifiedToDate: Date;
  expeditionCity: string;
  retentionAgentNit: string;
  retentionAgentName: string;
  employeeId: string;
  employeeDocument: string;
  employeeFullName: string;
  row36Salaries: number;
  row37Honoraries: number;
  row38SocialBenefits: number;
  row39AllowancesNonSalarial: number;
  row40OtherIncome: number;
  row41Indemnifications: number;
  row46SeverancePaid: number;
  row47PensionsIncome: number;
  row49TotalGrossIncome: number;
  row50HealthDeduction: number;
  row51PensionAndFspDeduction: number;
  row52VoluntaryPensionDeduction: number;
  row53AfcDeduction: number;
  row55WithholdingTax: number;
  qrCodeData: string;
}

export interface AnnualSettlementInput {
  employeeId: string;
  employeeDocument: string;
  employeeFullName: string;
  costCenterCode?: string | null;
  costCenterName?: string | null;
  dependencyCode?: number | null;
  dependencyName?: string | null;
  month: number; // 1..12
  year: number;
  basicSalary: number;
  overtimeAndSurcharges: number;
  transportAllowance: number;
  nonSalarialAllowances: number;
  incapacitiesAndLeaves: number;
  otherEarnings: number;
  totalEarnings: number;
  healthDeduction: number;
  pensionDeduction: number;
  fspDeduction: number;
  withholdingTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  conceptBreakdown?: Record<number, number>;
}

export interface EmployeeMonthlyAccumulated {
  month: number;
  basicSalary: number;
  overtimeAndSurcharges: number;
  transportAllowance: number;
  nonSalarialAllowances: number;
  incapacitiesAndLeaves: number;
  otherEarnings: number;
  totalEarnings: number;
  healthDeduction: number;
  pensionDeduction: number;
  fspDeduction: number;
  withholdingTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
}

export interface EmployeeAnnualRow {
  employeeId: string;
  employeeDocument: string;
  employeeFullName: string;
  costCenterCode: string;
  costCenterName: string;
  dependencyCode: number;
  dependencyName: string;
  months: Record<number, EmployeeMonthlyAccumulated>;
  yearTotals: EmployeeMonthlyAccumulated;
}

export interface AnnualAccumulatedMatrixResult {
  year: number;
  totalEmployees: number;
  grandTotalsByMonth: Record<number, EmployeeMonthlyAccumulated>;
  grandTotalYear: EmployeeMonthlyAccumulated;
  employees: EmployeeAnnualRow[];
}

@Injectable()
export class Form220AndAccumulatedEngine {
  /**
   * Generates DIAN Formulario 220 official tax certificate data.
   */
  public generateFormulario220(input: Form220Input): Form220Result {
    const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();
    const certifiedFromDate = input.certifiedFromDate
      ? new Date(input.certifiedFromDate)
      : new Date(input.year, 0, 1);
    const certifiedToDate = input.certifiedToDate
      ? new Date(input.certifiedToDate)
      : new Date(input.year, 11, 31);

    const row36 = Math.round(input.salariesEarned || 0);
    const row37 = Math.round(input.honorariesEarned || 0);
    const row38 = Math.round(input.socialBenefitsEarned || 0);
    const row39 = Math.round(input.nonSalarialAllowances || 0);
    const row40 = Math.round(input.otherIncome || 0);
    const row41 = Math.round(input.indemnifications || 0);
    const row46 = Math.round(input.severancePaidDirectly || 0);
    const row47 = Math.round(input.pensionsIncome || 0);

    // Row 49 is sum of rows 36 through 47
    const row49 = row36 + row37 + row38 + row39 + row40 + row41 + row46 + row47;

    const row50 = Math.round(input.healthDeductions || 0);
    const row51 = Math.round(input.pensionAndFspDeductions || 0);
    const row52 = Math.round(input.voluntaryPensionDeductions || 0);
    const row53 = Math.round(input.afcDeductions || 0);
    const row55 = Math.round(input.withholdingTax || 0);

    const dateStr = issueDate.toISOString().split('T')[0];
    const qrCodeData = [
      'NumFormulario=220',
      `AnoGravable=${input.year}`,
      `FecExp=${dateStr}`,
      `NitAgente=${input.retentionAgentNit}`,
      `DocTrabajador=${input.employeeDocument}`,
      `ValIngresos=${row49}`,
      `ValRetencion=${row55}`,
    ].join('|');

    return {
      year: input.year,
      issueDate,
      certifiedFromDate,
      certifiedToDate,
      expeditionCity: input.expeditionCity || 'BOGOTÁ D.C.',
      retentionAgentNit: input.retentionAgentNit,
      retentionAgentName: input.retentionAgentName,
      employeeId: input.employeeId,
      employeeDocument: input.employeeDocument,
      employeeFullName: input.employeeFullName,
      row36Salaries: row36,
      row37Honoraries: row37,
      row38SocialBenefits: row38,
      row39AllowancesNonSalarial: row39,
      row40OtherIncome: row40,
      row41Indemnifications: row41,
      row46SeverancePaid: row46,
      row47PensionsIncome: row47,
      row49TotalGrossIncome: row49,
      row50HealthDeduction: row50,
      row51PensionAndFspDeduction: row51,
      row52VoluntaryPensionDeduction: row52,
      row53AfcDeduction: row53,
      row55WithholdingTax: row55,
      qrCodeData,
    };
  }

  /**
   * Builds the 12-Month Annual Accumulated BI Matrix (Enero-Diciembre).
   */
  public generateAnnualAccumulatedMatrix(
    settlements: AnnualSettlementInput[],
    year: number,
  ): AnnualAccumulatedMatrixResult {
    const employeeMap = new Map<string, EmployeeAnnualRow>();

    // Initial empty month template
    const createEmptyMonth = (month: number): EmployeeMonthlyAccumulated => ({
      month,
      basicSalary: 0,
      overtimeAndSurcharges: 0,
      transportAllowance: 0,
      nonSalarialAllowances: 0,
      incapacitiesAndLeaves: 0,
      otherEarnings: 0,
      totalEarnings: 0,
      healthDeduction: 0,
      pensionDeduction: 0,
      fspDeduction: 0,
      withholdingTax: 0,
      otherDeductions: 0,
      totalDeductions: 0,
      netPay: 0,
    });

    for (const item of settlements) {
      if (item.year !== year) continue;

      if (!employeeMap.has(item.employeeId)) {
        const monthsRecord: Record<number, EmployeeMonthlyAccumulated> = {};
        for (let m = 1; m <= 12; m++) {
          monthsRecord[m] = createEmptyMonth(m);
        }

        employeeMap.set(item.employeeId, {
          employeeId: item.employeeId,
          employeeDocument: item.employeeDocument,
          employeeFullName: item.employeeFullName,
          costCenterCode: item.costCenterCode || '',
          costCenterName: item.costCenterName || '',
          dependencyCode: item.dependencyCode || 0,
          dependencyName: item.dependencyName || '',
          months: monthsRecord,
          yearTotals: createEmptyMonth(0),
        });
      }

      const emp = employeeMap.get(item.employeeId)!;
      const mData = emp.months[item.month];
      if (mData) {
        mData.basicSalary += item.basicSalary;
        mData.overtimeAndSurcharges += item.overtimeAndSurcharges;
        mData.transportAllowance += item.transportAllowance;
        mData.nonSalarialAllowances += item.nonSalarialAllowances;
        mData.incapacitiesAndLeaves += item.incapacitiesAndLeaves;
        mData.otherEarnings += item.otherEarnings;
        mData.totalEarnings += item.totalEarnings;
        mData.healthDeduction += item.healthDeduction;
        mData.pensionDeduction += item.pensionDeduction;
        mData.fspDeduction += item.fspDeduction;
        mData.withholdingTax += item.withholdingTax;
        mData.otherDeductions += item.otherDeductions;
        mData.totalDeductions += item.totalDeductions;
        mData.netPay += item.netPay;
      }
    }

    // Grand totals initialization
    const grandTotalsByMonth: Record<number, EmployeeMonthlyAccumulated> = {};
    for (let m = 1; m <= 12; m++) {
      grandTotalsByMonth[m] = createEmptyMonth(m);
    }
    const grandTotalYear = createEmptyMonth(0);

    const employees = Array.from(employeeMap.values()).map((emp) => {
      // Calculate employee year totals
      for (let m = 1; m <= 12; m++) {
        const mData = emp.months[m];
        emp.yearTotals.basicSalary += mData.basicSalary;
        emp.yearTotals.overtimeAndSurcharges += mData.overtimeAndSurcharges;
        emp.yearTotals.transportAllowance += mData.transportAllowance;
        emp.yearTotals.nonSalarialAllowances += mData.nonSalarialAllowances;
        emp.yearTotals.incapacitiesAndLeaves += mData.incapacitiesAndLeaves;
        emp.yearTotals.otherEarnings += mData.otherEarnings;
        emp.yearTotals.totalEarnings += mData.totalEarnings;
        emp.yearTotals.healthDeduction += mData.healthDeduction;
        emp.yearTotals.pensionDeduction += mData.pensionDeduction;
        emp.yearTotals.fspDeduction += mData.fspDeduction;
        emp.yearTotals.withholdingTax += mData.withholdingTax;
        emp.yearTotals.otherDeductions += mData.otherDeductions;
        emp.yearTotals.totalDeductions += mData.totalDeductions;
        emp.yearTotals.netPay += mData.netPay;

        // Add to grand totals by month
        const gMonth = grandTotalsByMonth[m];
        gMonth.basicSalary += mData.basicSalary;
        gMonth.overtimeAndSurcharges += mData.overtimeAndSurcharges;
        gMonth.transportAllowance += mData.transportAllowance;
        gMonth.nonSalarialAllowances += mData.nonSalarialAllowances;
        gMonth.incapacitiesAndLeaves += mData.incapacitiesAndLeaves;
        gMonth.otherEarnings += mData.otherEarnings;
        gMonth.totalEarnings += mData.totalEarnings;
        gMonth.healthDeduction += mData.healthDeduction;
        gMonth.pensionDeduction += mData.pensionDeduction;
        gMonth.fspDeduction += mData.fspDeduction;
        gMonth.withholdingTax += mData.withholdingTax;
        gMonth.otherDeductions += mData.otherDeductions;
        gMonth.totalDeductions += mData.totalDeductions;
        gMonth.netPay += mData.netPay;
      }

      // Add to grand total year
      grandTotalYear.basicSalary += emp.yearTotals.basicSalary;
      grandTotalYear.overtimeAndSurcharges +=
        emp.yearTotals.overtimeAndSurcharges;
      grandTotalYear.transportAllowance += emp.yearTotals.transportAllowance;
      grandTotalYear.nonSalarialAllowances +=
        emp.yearTotals.nonSalarialAllowances;
      grandTotalYear.incapacitiesAndLeaves +=
        emp.yearTotals.incapacitiesAndLeaves;
      grandTotalYear.otherEarnings += emp.yearTotals.otherEarnings;
      grandTotalYear.totalEarnings += emp.yearTotals.totalEarnings;
      grandTotalYear.healthDeduction += emp.yearTotals.healthDeduction;
      grandTotalYear.pensionDeduction += emp.yearTotals.pensionDeduction;
      grandTotalYear.fspDeduction += emp.yearTotals.fspDeduction;
      grandTotalYear.withholdingTax += emp.yearTotals.withholdingTax;
      grandTotalYear.otherDeductions += emp.yearTotals.otherDeductions;
      grandTotalYear.totalDeductions += emp.yearTotals.totalDeductions;
      grandTotalYear.netPay += emp.yearTotals.netPay;

      return emp;
    });

    return {
      year,
      totalEmployees: employees.length,
      grandTotalsByMonth,
      grandTotalYear,
      employees,
    };
  }
}
