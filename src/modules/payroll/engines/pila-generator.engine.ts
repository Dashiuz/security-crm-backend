import { Injectable } from '@nestjs/common';
import { ArlRiskClass, LeaveAndAbsenceType } from '@prisma/client';

export interface PilaEmployeeInput {
  employeeId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  secondName?: string | null;
  firstLastName: string;
  secondLastName?: string | null;
  daneDepartmentCode?: string | null;
  daneCityCode?: string | null;
  contributorType?: string | null;
  contributorSubtype?: string | null;
  isPensioner?: boolean;
  arlRiskClass?: ArlRiskClass;
  epsCodePlu?: string | null;
  afpCodePlu?: string | null;
  ccfCodePlu?: string | null;
  baseSalaryMonthly: number;
  isIntegralSalary?: boolean;
  entryDate?: Date | string | null;
  retirementDate?: Date | string | null;
  totalEarnings: number;
  basicSalaryEarned: number;
  ibcEps: number;
  ibcAfp: number;
  ibcHealth?: number;
  ibcPension?: number;
  ibcArl: number;
  ibcCcf: number;
  workedDays: number;
  unpaidAbsenceDays: number;
  incapacityDays: number;
  vacationDays: number;
  leaves: Array<{
    id: string;
    leaveType: LeaveAndAbsenceType;
    startDate: Date | string;
    endDate: Date | string;
    totalDays: number;
  }>;
}

export interface PilaCompanyConfig {
  companyNit: string;
  companyDv: string;
  companyLegalName: string;
  arlEntityCode?: string | null;
  smmlv: number;
  applyExonerationLaw1607: boolean;
  year: number;
  month: number;
  operatorName?: string;
}

export interface PilaGeneratedLineResult {
  sequenceNumber: number;
  employeeId: string;
  documentType: string;
  documentNumber: string;
  firstLastName: string;
  secondLastName?: string | null;
  firstName: string;
  secondName?: string | null;
  daneDepartmentCode: string;
  daneCityCode: string;
  contributorType: string;
  contributorSubtype: string;
  epsCodePlu: string;
  afpCodePlu: string;
  ccfCodePlu: string;
  arlRiskClass: ArlRiskClass;
  arlRatePct: number;
  isIng: boolean;
  isRet: boolean;
  isTde: boolean;
  isTae: boolean;
  isTdp: boolean;
  isTap: boolean;
  isVsp: boolean;
  isCor: boolean;
  isVst: boolean;
  isSln: boolean;
  isIge: boolean;
  isLma: boolean;
  isVacLr: boolean;
  isAvp: boolean;
  isVct: boolean;
  isIrl: boolean;
  ingDate?: Date | null;
  retDate?: Date | null;
  slnStartDate?: Date | null;
  slnEndDate?: Date | null;
  igeStartDate?: Date | null;
  igeEndDate?: Date | null;
  lmaStartDate?: Date | null;
  lmaEndDate?: Date | null;
  vacStartDate?: Date | null;
  vacEndDate?: Date | null;
  irlStartDate?: Date | null;
  irlEndDate?: Date | null;
  workedDaysPension: number;
  workedDaysHealth: number;
  workedDaysArl: number;
  workedDaysCcf: number;
  baseSalary: number;
  isIntegralSalary: boolean;
  ibcPension: number;
  ibcHealth: number;
  ibcArl: number;
  ibcCcf: number;
  pensionEmployeeRate: number;
  pensionEmployerRate: number;
  pensionTotalAmount: number;
  fspRate: number;
  fspAmount: number;
  healthEmployeeRate: number;
  healthEmployerRate: number;
  healthTotalAmount: number;
  arlAmount: number;
  ccfRate: number;
  ccfAmount: number;
  senaAmount: number;
  icbfAmount: number;
  isExoneratedLaw1607: boolean;
  totalLineAmount: number;
  rawPositionalRecord: string;
}

export interface PilaBatchGenerationResult {
  totalEmployees: number;
  totalLines: number;
  totalIbcHealth: number;
  totalIbcPension: number;
  totalIbcArl: number;
  totalIbcCcf: number;
  totalHealthEmployee: number;
  totalHealthEmployer: number;
  totalPensionEmployee: number;
  totalPensionEmployer: number;
  totalFsp: number;
  totalArl: number;
  totalCcf: number;
  totalSena: number;
  totalIcbf: number;
  totalExoneratedLaw1607: number;
  grandTotalAmount: number;
  lines: PilaGeneratedLineResult[];
  txtBuffer: string;
  csvSummaryBuffer: string;
}

@Injectable()
export class PilaGeneratorEngine {
  private static round(val: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((val + Number.EPSILON) * factor) / factor;
  }

  /**
   * Redondeo reglamentario PILA: Aporte a la centena superior
   */
  public static roundPilaContribution(amount: number): number {
    if (amount <= 0) return 0;
    return Math.ceil(amount / 100) * 100;
  }

  public static getArlRatePct(riskClass: ArlRiskClass): number {
    switch (riskClass) {
      case ArlRiskClass.RISK_I:
        return 0.522;
      case ArlRiskClass.RISK_II:
        return 1.044;
      case ArlRiskClass.RISK_III:
        return 2.436;
      case ArlRiskClass.RISK_IV:
        return 4.35;
      case ArlRiskClass.RISK_V:
        return 6.96;
      default:
        return 4.35;
    }
  }

  /**
   * Generación y liquidación del lote PILA Resolución 2388 multi-línea
   */
  public generatePilaBatch(
    employees: PilaEmployeeInput[],
    config: PilaCompanyConfig,
  ): PilaBatchGenerationResult {
    const generatedLines: PilaGeneratedLineResult[] = [];
    let sequence = 1;

    for (const emp of employees) {
      const empLines = this.buildEmployeeLines(emp, config, sequence);
      generatedLines.push(...empLines);
      sequence += empLines.length;
    }

    // Totales consolidados
    let totalIbcHealth = 0;
    let totalIbcPension = 0;
    let totalIbcArl = 0;
    let totalIbcCcf = 0;
    let totalHealthEmployee = 0;
    let totalHealthEmployer = 0;
    let totalPensionEmployee = 0;
    let totalPensionEmployer = 0;
    let totalFsp = 0;
    let totalArl = 0;
    let totalCcf = 0;
    let totalSena = 0;
    let totalIcbf = 0;
    let totalExoneratedLaw1607 = 0;

    for (const line of generatedLines) {
      totalIbcHealth += line.ibcHealth;
      totalIbcPension += line.ibcPension;
      totalIbcArl += line.ibcArl;
      totalIbcCcf += line.ibcCcf;

      const healthEmployeePart = PilaGeneratorEngine.roundPilaContribution(
        line.ibcHealth * (line.healthEmployeeRate / 100),
      );
      const healthEmployerPart = line.isExoneratedLaw1607
        ? 0
        : PilaGeneratorEngine.roundPilaContribution(
            line.ibcHealth * (line.healthEmployerRate / 100),
          );

      const pensionEmployeePart = PilaGeneratorEngine.roundPilaContribution(
        line.ibcPension * (line.pensionEmployeeRate / 100),
      );
      const pensionEmployerPart = PilaGeneratorEngine.roundPilaContribution(
        line.ibcPension * (line.pensionEmployerRate / 100),
      );

      totalHealthEmployee += healthEmployeePart;
      totalHealthEmployer += healthEmployerPart;
      totalPensionEmployee += pensionEmployeePart;
      totalPensionEmployer += pensionEmployerPart;
      totalFsp += line.fspAmount;
      totalArl += line.arlAmount;
      totalCcf += line.ccfAmount;
      totalSena += line.senaAmount;
      totalIcbf += line.icbfAmount;

      if (line.isExoneratedLaw1607) {
        // Ahorro exonerado: 8.5% salud + 2% SENA + 3% ICBF = 13.5%
        const exoneratedAmount = PilaGeneratorEngine.roundPilaContribution(
          line.ibcHealth * 0.135,
        );
        totalExoneratedLaw1607 += exoneratedAmount;
      }
    }

    const grandTotalAmount =
      totalHealthEmployee +
      totalHealthEmployer +
      totalPensionEmployee +
      totalPensionEmployer +
      totalFsp +
      totalArl +
      totalCcf +
      totalSena +
      totalIcbf;

    // Buffer .TXT (Registro Tipo 1 Header + Registros Tipo 2)
    const txtBuffer = this.buildTxtFile(
      config,
      generatedLines,
      grandTotalAmount,
    );

    // Buffer .CSV Auditoría
    const csvSummaryBuffer = this.buildCsvSummary(config, generatedLines);

    return {
      totalEmployees: employees.length,
      totalLines: generatedLines.length,
      totalIbcHealth: PilaGeneratorEngine.round(totalIbcHealth),
      totalIbcPension: PilaGeneratorEngine.round(totalIbcPension),
      totalIbcArl: PilaGeneratorEngine.round(totalIbcArl),
      totalIbcCcf: PilaGeneratorEngine.round(totalIbcCcf),
      totalHealthEmployee: PilaGeneratorEngine.round(totalHealthEmployee),
      totalHealthEmployer: PilaGeneratorEngine.round(totalHealthEmployer),
      totalPensionEmployee: PilaGeneratorEngine.round(totalPensionEmployee),
      totalPensionEmployer: PilaGeneratorEngine.round(totalPensionEmployer),
      totalFsp: PilaGeneratorEngine.round(totalFsp),
      totalArl: PilaGeneratorEngine.round(totalArl),
      totalCcf: PilaGeneratorEngine.round(totalCcf),
      totalSena: PilaGeneratorEngine.round(totalSena),
      totalIcbf: PilaGeneratorEngine.round(totalIcbf),
      totalExoneratedLaw1607: PilaGeneratorEngine.round(totalExoneratedLaw1607),
      grandTotalAmount: PilaGeneratorEngine.round(grandTotalAmount),
      lines: generatedLines,
      txtBuffer,
      csvSummaryBuffer,
    };
  }

  private buildEmployeeLines(
    emp: PilaEmployeeInput,
    config: PilaCompanyConfig,
    startSequence: number,
  ): PilaGeneratedLineResult[] {
    const lines: PilaGeneratedLineResult[] = [];
    let currentSeq = startSequence;

    const tenSmmlv = config.smmlv * 10;
    const isExonerated =
      config.applyExonerationLaw1607 && emp.totalEarnings < tenSmmlv;

    const arlRisk = emp.arlRiskClass || ArlRiskClass.RISK_IV;
    const arlRate = PilaGeneratorEngine.getArlRatePct(arlRisk);

    // Detección de Ingreso (ING) o Retiro (RET) en el mes
    let isIng = false;
    let ingDate: Date | null = null;
    let isRet = false;
    let retDate: Date | null = null;

    if (emp.entryDate) {
      const entry = new Date(emp.entryDate);
      if (
        entry.getUTCFullYear() === config.year &&
        entry.getUTCMonth() + 1 === config.month
      ) {
        isIng = true;
        ingDate = entry;
      }
    }

    if (emp.retirementDate) {
      const ret = new Date(emp.retirementDate);
      if (
        ret.getUTCFullYear() === config.year &&
        ret.getUTCMonth() + 1 === config.month
      ) {
        isRet = true;
        retDate = ret;
      }
    }

    const hasLeaves = emp.leaves && emp.leaves.length > 0;

    if (!hasLeaves) {
      // Línea única ordinaria (30 días o proporcionales a ingreso/retiro)
      const workedDays = emp.workedDays > 0 ? emp.workedDays : 30;

      const ibcHealth =
        (emp.ibcHealth || emp.ibcEps) > 0
          ? emp.ibcHealth || emp.ibcEps
          : emp.baseSalaryMonthly;
      const ibcPension =
        (emp.ibcPension || emp.ibcAfp) > 0
          ? emp.ibcPension || emp.ibcAfp
          : emp.baseSalaryMonthly;
      const ibcArl = emp.ibcArl > 0 ? emp.ibcArl : emp.baseSalaryMonthly;
      const ibcCcf = emp.ibcCcf > 0 ? emp.ibcCcf : emp.baseSalaryMonthly;

      // FSP si IBC >= 4 SMMLV
      const fspRate = ibcPension >= config.smmlv * 4 ? 1.0 : 0.0;
      const fspAmount = PilaGeneratorEngine.roundPilaContribution(
        ibcPension * (fspRate / 100),
      );

      const healthEmployeeRate = 4.0;
      const healthEmployerRate = isExonerated ? 0.0 : 8.5;
      const healthTotal = PilaGeneratorEngine.roundPilaContribution(
        ibcHealth * ((healthEmployeeRate + healthEmployerRate) / 100),
      );

      const pensionEmployeeRate = emp.isPensioner ? 0.0 : 4.0;
      const pensionEmployerRate = emp.isPensioner ? 0.0 : 12.0;
      const pensionTotal = PilaGeneratorEngine.roundPilaContribution(
        ibcPension * ((pensionEmployeeRate + pensionEmployerRate) / 100),
      );

      const arlAmount = PilaGeneratorEngine.roundPilaContribution(
        ibcArl * (arlRate / 100),
      );
      const ccfRate = 4.0;
      const ccfAmount = PilaGeneratorEngine.roundPilaContribution(
        ibcCcf * (ccfRate / 100),
      );
      const senaAmount = isExonerated
        ? 0
        : PilaGeneratorEngine.roundPilaContribution(ibcCcf * 0.02);
      const icbfAmount = isExonerated
        ? 0
        : PilaGeneratorEngine.roundPilaContribution(ibcCcf * 0.03);

      const totalLine =
        healthTotal +
        pensionTotal +
        fspAmount +
        arlAmount +
        ccfAmount +
        senaAmount +
        icbfAmount;

      const rawRecord = this.formatPositionalRecord({
        seq: currentSeq,
        emp,
        config,
        isIng,
        isRet,
        isSln: false,
        isIge: false,
        isLma: false,
        isVacLr: false,
        isIrl: false,
        workedDays,
        ibcHealth,
        ibcPension,
        ibcArl,
        ibcCcf,
        totalLine,
      });

      lines.push({
        sequenceNumber: currentSeq,
        employeeId: emp.employeeId,
        documentType: emp.documentType,
        documentNumber: emp.documentNumber,
        firstLastName: emp.firstLastName,
        secondLastName: emp.secondLastName,
        firstName: emp.firstName,
        secondName: emp.secondName,
        daneDepartmentCode: emp.daneDepartmentCode || '11',
        daneCityCode: emp.daneCityCode || '11001',
        contributorType: emp.contributorType || '01',
        contributorSubtype: emp.contributorSubtype || '00',
        epsCodePlu: emp.epsCodePlu || 'EPS017',
        afpCodePlu: emp.afpCodePlu || '230301',
        ccfCodePlu: emp.ccfCodePlu || 'CCF09',
        arlRiskClass: arlRisk,
        arlRatePct: arlRate,
        isIng,
        isRet,
        isTde: false,
        isTae: false,
        isTdp: false,
        isTap: false,
        isVsp: false,
        isCor: false,
        isVst: emp.totalEarnings > emp.baseSalaryMonthly,
        isSln: false,
        isIge: false,
        isLma: false,
        isVacLr: false,
        isAvp: false,
        isVct: false,
        isIrl: false,
        ingDate,
        retDate,
        workedDaysPension: workedDays,
        workedDaysHealth: workedDays,
        workedDaysArl: workedDays,
        workedDaysCcf: workedDays,
        baseSalary: emp.baseSalaryMonthly,
        isIntegralSalary: emp.isIntegralSalary || false,
        ibcPension,
        ibcHealth,
        ibcArl,
        ibcCcf,
        pensionEmployeeRate,
        pensionEmployerRate,
        pensionTotalAmount: pensionTotal,
        fspRate,
        fspAmount,
        healthEmployeeRate,
        healthEmployerRate,
        healthTotalAmount: healthTotal,
        arlAmount,
        ccfRate,
        ccfAmount,
        senaAmount,
        icbfAmount,
        isExoneratedLaw1607: isExonerated,
        totalLineAmount: totalLine,
        rawPositionalRecord: rawRecord,
      });
    } else {
      // Caso multi-línea con Novedades Ausentistas / Licencias
      const normalDays = Math.max(0, emp.workedDays);
      const dailyFloor = config.smmlv / 30;

      // 1. Línea ordinaria por días de turno en puesto (si laboró días)
      if (normalDays > 0) {
        const lineIbc = Math.max(
          normalDays * dailyFloor,
          (emp.baseSalaryMonthly / 30) * normalDays,
        );

        const healthTotal = PilaGeneratorEngine.roundPilaContribution(
          lineIbc * (isExonerated ? 0.04 : 0.125),
        );
        const pensionTotal = emp.isPensioner
          ? 0
          : PilaGeneratorEngine.roundPilaContribution(lineIbc * 0.16);
        const arlTotal = PilaGeneratorEngine.roundPilaContribution(
          lineIbc * (arlRate / 100),
        );
        const ccfTotal = PilaGeneratorEngine.roundPilaContribution(
          lineIbc * 0.04,
        );

        const rawRecord = this.formatPositionalRecord({
          seq: currentSeq,
          emp,
          config,
          isIng,
          isRet,
          isSln: false,
          isIge: false,
          isLma: false,
          isVacLr: false,
          isIrl: false,
          workedDays: normalDays,
          ibcHealth: lineIbc,
          ibcPension: lineIbc,
          ibcArl: lineIbc,
          ibcCcf: lineIbc,
          totalLine: healthTotal + pensionTotal + arlTotal + ccfTotal,
        });

        lines.push({
          sequenceNumber: currentSeq,
          employeeId: emp.employeeId,
          documentType: emp.documentType,
          documentNumber: emp.documentNumber,
          firstLastName: emp.firstLastName,
          secondLastName: emp.secondLastName,
          firstName: emp.firstName,
          secondName: emp.secondName,
          daneDepartmentCode: emp.daneDepartmentCode || '11',
          daneCityCode: emp.daneCityCode || '11001',
          contributorType: emp.contributorType || '01',
          contributorSubtype: emp.contributorSubtype || '00',
          epsCodePlu: emp.epsCodePlu || 'EPS017',
          afpCodePlu: emp.afpCodePlu || '230301',
          ccfCodePlu: emp.ccfCodePlu || 'CCF09',
          arlRiskClass: arlRisk,
          arlRatePct: arlRate,
          isIng,
          isRet,
          isTde: false,
          isTae: false,
          isTdp: false,
          isTap: false,
          isVsp: false,
          isCor: false,
          isVst: false,
          isSln: false,
          isIge: false,
          isLma: false,
          isVacLr: false,
          isAvp: false,
          isVct: false,
          isIrl: false,
          workedDaysPension: normalDays,
          workedDaysHealth: normalDays,
          workedDaysArl: normalDays,
          workedDaysCcf: normalDays,
          baseSalary: emp.baseSalaryMonthly,
          isIntegralSalary: emp.isIntegralSalary || false,
          ibcPension: lineIbc,
          ibcHealth: lineIbc,
          ibcArl: lineIbc,
          ibcCcf: lineIbc,
          pensionEmployeeRate: emp.isPensioner ? 0 : 4,
          pensionEmployerRate: emp.isPensioner ? 0 : 12,
          pensionTotalAmount: pensionTotal,
          fspRate: 0,
          fspAmount: 0,
          healthEmployeeRate: 4,
          healthEmployerRate: isExonerated ? 0 : 8.5,
          healthTotalAmount: healthTotal,
          arlAmount: arlTotal,
          ccfRate: 4,
          ccfAmount: ccfTotal,
          senaAmount: 0,
          icbfAmount: 0,
          isExoneratedLaw1607: isExonerated,
          totalLineAmount: healthTotal + pensionTotal + arlTotal + ccfTotal,
          rawPositionalRecord: rawRecord,
        });

        currentSeq++;
      }

      // 2. Líneas separadas por cada novedad de tiempo
      for (const leave of emp.leaves) {
        const isIge = leave.leaveType === LeaveAndAbsenceType.SICK_LEAVE_EG;
        const isIrl = leave.leaveType === LeaveAndAbsenceType.WORK_ACCIDENT_AT;
        const isLma =
          leave.leaveType === LeaveAndAbsenceType.MATERNITY_PATERNITY_LMA;
        const isVacLr =
          leave.leaveType === LeaveAndAbsenceType.VACATION_TIME_VAC ||
          leave.leaveType === LeaveAndAbsenceType.PAID_LEAVE_LR;
        const isSln =
          leave.leaveType === LeaveAndAbsenceType.UNPAID_LEAVE_LNR ||
          leave.leaveType === LeaveAndAbsenceType.DISCIPLINARY_SUSPENSION_SAN;

        const days = leave.totalDays;
        const lineIbc = Math.max(
          days * dailyFloor,
          (emp.baseSalaryMonthly / 30) * days,
        );

        // Durante incapacidad / suspensión / vacaciones no cotiza ARL (tasa 0%)
        const arlAmount = 0;
        // Durante SLN (licencia no remunerada), solo cotiza salud/pensión parte empleador según ley
        const healthTotal = isSln
          ? PilaGeneratorEngine.roundPilaContribution(lineIbc * 0.085)
          : PilaGeneratorEngine.roundPilaContribution(
              lineIbc * (isExonerated ? 0.04 : 0.125),
            );

        const pensionTotal = emp.isPensioner
          ? 0
          : PilaGeneratorEngine.roundPilaContribution(
              lineIbc * (isSln ? 0.12 : 0.16),
            );

        const ccfTotal =
          isSln || isIge || isIrl
            ? 0
            : PilaGeneratorEngine.roundPilaContribution(lineIbc * 0.04);

        const totalLine = healthTotal + pensionTotal + arlAmount + ccfTotal;

        const rawRecord = this.formatPositionalRecord({
          seq: currentSeq,
          emp,
          config,
          isIng: false,
          isRet: false,
          isSln,
          isIge,
          isLma,
          isVacLr,
          isIrl,
          workedDays: days,
          ibcHealth: lineIbc,
          ibcPension: lineIbc,
          ibcArl: 0,
          ibcCcf: ccfTotal > 0 ? lineIbc : 0,
          totalLine,
        });

        lines.push({
          sequenceNumber: currentSeq,
          employeeId: emp.employeeId,
          documentType: emp.documentType,
          documentNumber: emp.documentNumber,
          firstLastName: emp.firstLastName,
          secondLastName: emp.secondLastName,
          firstName: emp.firstName,
          secondName: emp.secondName,
          daneDepartmentCode: emp.daneDepartmentCode || '11',
          daneCityCode: emp.daneCityCode || '11001',
          contributorType: emp.contributorType || '01',
          contributorSubtype: emp.contributorSubtype || '00',
          epsCodePlu: emp.epsCodePlu || 'EPS017',
          afpCodePlu: emp.afpCodePlu || '230301',
          ccfCodePlu: emp.ccfCodePlu || 'CCF09',
          arlRiskClass: arlRisk,
          arlRatePct: 0,
          isIng: false,
          isRet: false,
          isTde: false,
          isTae: false,
          isTdp: false,
          isTap: false,
          isVsp: false,
          isCor: false,
          isVst: false,
          isSln,
          isIge,
          isLma,
          isVacLr,
          isAvp: false,
          isVct: false,
          isIrl,
          workedDaysPension: isSln ? 0 : days,
          workedDaysHealth: days,
          workedDaysArl: 0,
          workedDaysCcf: ccfTotal > 0 ? days : 0,
          baseSalary: emp.baseSalaryMonthly,
          isIntegralSalary: emp.isIntegralSalary || false,
          ibcPension: lineIbc,
          ibcHealth: lineIbc,
          ibcArl: 0,
          ibcCcf: ccfTotal > 0 ? lineIbc : 0,
          pensionEmployeeRate: isSln ? 0 : 4,
          pensionEmployerRate: isSln ? 12 : 12,
          pensionTotalAmount: pensionTotal,
          fspRate: 0,
          fspAmount: 0,
          healthEmployeeRate: isSln ? 0 : 4,
          healthEmployerRate: isExonerated ? 0 : 8.5,
          healthTotalAmount: healthTotal,
          arlAmount: 0,
          ccfRate: ccfTotal > 0 ? 4 : 0,
          ccfAmount: ccfTotal,
          senaAmount: 0,
          icbfAmount: 0,
          isExoneratedLaw1607: isExonerated,
          totalLineAmount: totalLine,
          rawPositionalRecord: rawRecord,
        });

        currentSeq++;
      }
    }

    return lines;
  }

  private formatPositionalRecord(params: {
    seq: number;
    emp: PilaEmployeeInput;
    config: PilaCompanyConfig;
    isIng: boolean;
    isRet: boolean;
    isSln: boolean;
    isIge: boolean;
    isLma: boolean;
    isVacLr: boolean;
    isIrl: boolean;
    workedDays: number;
    ibcHealth: number;
    ibcPension: number;
    ibcArl: number;
    ibcCcf: number;
    totalLine: number;
  }): string {
    const p = (
      val: string | number,
      length: number,
      padChar = ' ',
      alignRight = false,
    ) => {
      const str = String(val).slice(0, length);
      return alignRight
        ? str.padStart(length, padChar)
        : str.padEnd(length, padChar);
    };

    const flag = (b: boolean) => (b ? 'X' : ' ');

    // Registro Tipo 2 estándar Resolución 2388
    return [
      '02', // Tipo registro
      p(params.seq, 5, '0', true), // Secuencia
      p(params.emp.documentType, 2),
      p(params.emp.documentNumber, 16),
      p(params.emp.contributorType || '01', 2, '0', true),
      p(params.emp.contributorSubtype || '00', 2, '0', true),
      p(params.emp.firstLastName, 20),
      p(params.emp.secondLastName || '', 30),
      p(params.emp.firstName, 20),
      p(params.emp.secondName || '', 30),
      p(params.emp.daneDepartmentCode || '11', 2),
      p(params.emp.daneCityCode || '11001', 3),
      flag(params.isIng), // ING
      flag(params.isRet), // RET
      flag(false), // TDE
      flag(false), // TAE
      flag(false), // TDP
      flag(false), // TAP
      flag(false), // VSP
      flag(false), // COR
      flag(false), // VST
      flag(params.isSln), // SLN
      flag(params.isIge), // IGE
      flag(params.isLma), // LMA
      flag(params.isVacLr), // VAC
      flag(false), // AVP
      flag(false), // VCT
      flag(params.isIrl), // IRL
      p(params.emp.epsCodePlu || 'EPS017', 6),
      p(params.emp.afpCodePlu || '230301', 6),
      p(params.emp.ccfCodePlu || 'CCF09', 5),
      p(params.workedDays, 2, '0', true),
      p(Math.round(params.ibcHealth), 10, '0', true),
      p(Math.round(params.ibcPension), 10, '0', true),
      p(Math.round(params.ibcArl), 10, '0', true),
      p(Math.round(params.ibcCcf), 10, '0', true),
      p(Math.round(params.totalLine), 10, '0', true),
    ].join('');
  }

  private buildTxtFile(
    config: PilaCompanyConfig,
    lines: PilaGeneratedLineResult[],
    grandTotal: number,
  ): string {
    const pad = (
      val: string | number,
      length: number,
      padChar = ' ',
      alignRight = false,
    ) => {
      const str = String(val).slice(0, length);
      return alignRight
        ? str.padStart(length, padChar)
        : str.padEnd(length, padChar);
    };

    // Registro Tipo 1 (Encabezado del Aportante)
    const header = [
      '01', // Tipo registro encabezado
      '1', // Modalidad (1: Electrónica)
      pad(1, 4, '0', true), // Secuencia
      pad(config.companyLegalName, 200),
      'NI', // Tipo documento aportante
      pad(config.companyNit, 16),
      pad(config.companyDv, 1),
      'E', // Tipo de planilla (E: Empleados)
      pad(config.year, 4, '0', true),
      pad(config.month, 2, '0', true),
      pad(lines.length, 5, '0', true),
      pad(Math.round(grandTotal), 12, '0', true),
      pad(config.operatorName || 'SOI', 10),
    ].join('');

    const records = lines.map((l) => l.rawPositionalRecord);
    return [header, ...records].join('\r\n');
  }

  private buildCsvSummary(
    config: PilaCompanyConfig,
    lines: PilaGeneratedLineResult[],
  ): string {
    const headers = [
      'SECUENCIA',
      'DOCUMENTO',
      'NOMBRES_APELLIDOS',
      'DIAS_SALUD',
      'DIAS_PENSION',
      'DIAS_ARL',
      'DIAS_CCF',
      'NOVEDADES',
      'IBC_SALUD',
      'IBC_PENSION',
      'IBC_ARL',
      'IBC_CCF',
      'APORTE_SALUD',
      'APORTE_PENSION',
      'FSP',
      'APORTE_ARL',
      'APORTE_CCF',
      'TOTAL_LINEA',
    ];

    const rows = lines.map((l) => {
      const novs: string[] = [];
      if (l.isIng) novs.push('ING');
      if (l.isRet) novs.push('RET');
      if (l.isIge) novs.push('IGE');
      if (l.isIrl) novs.push('IRL');
      if (l.isLma) novs.push('LMA');
      if (l.isVacLr) novs.push('VAC');
      if (l.isSln) novs.push('SLN');
      if (l.isVst) novs.push('VST');

      return [
        l.sequenceNumber,
        `"${l.documentType} ${l.documentNumber}"`,
        `"${`${l.firstLastName} ${l.secondLastName || ''} ${l.firstName} ${l.secondName || ''}`.trim()}"`,
        l.workedDaysHealth,
        l.workedDaysPension,
        l.workedDaysArl,
        l.workedDaysCcf,
        `"${novs.join('/') || 'NINGUNA'}"`,
        l.ibcHealth,
        l.ibcPension,
        l.ibcArl,
        l.ibcCcf,
        l.healthTotalAmount,
        l.pensionTotalAmount,
        l.fspAmount,
        l.arlAmount,
        l.ccfAmount,
        l.totalLineAmount,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }
}
