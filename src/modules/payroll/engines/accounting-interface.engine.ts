import { Injectable } from '@nestjs/common';
import { AccountingExportFormat } from '@prisma/client';

export interface AccountingSettlementInput {
  employeeId: string;
  documentNumber: string;
  fullName: string;
  isInternalDependency: boolean;
  costCenterCode?: string | null;
  costCenterName?: string | null;
  dependencyCode?: number | null;
  netPay: number;
  lines: Array<{
    conceptCode: number;
    conceptName: string;
    nature: 'EARNING' | 'DEDUCTION' | 'PROVISION';
    amount: number;
    pucAccountAdministrative?: string | null;
    pucAccountOperative?: string | null;
    pucAccountCounterpart?: string | null;
    thirdPartyNit?: string | null;
    thirdPartyName?: string | null;
    epsNit?: string | null;
    afpNit?: string | null;
  }>;
}

export interface AccountingBatchConfig {
  periodId: string;
  periodCode: string;
  periodStartDate: Date | string;
  periodEndDate: Date | string;
  accountingDate: Date | string;
  companyNit: string;
  companyDv?: string | null;
  companyLegalName: string;
  exportFormat: AccountingExportFormat;
  batchNumber?: string;
  defaultSalariesPayableAccount?: string;
  defaultSalariesPayableName?: string;
}

export interface AccountingLineOutput {
  sequence: number;
  pucAccount: string;
  accountName: string;
  thirdPartyNit: string;
  thirdPartyName: string;
  costCenterCode?: string | null;
  costCenterName?: string | null;
  dependencyCode?: number | null;
  conceptCode?: number | null;
  debitAmount: number;
  creditAmount: number;
  description: string;
}

export interface AccountingBatchResult {
  exportFormat: AccountingExportFormat;
  batchNumber: string;
  accountingDate: Date;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  totalLines: number;
  lines: AccountingLineOutput[];
  formattedContent: string;
  fileName: string;
}

@Injectable()
export class AccountingInterfaceEngine {
  /**
   * Generates journal entries for a payroll period and balances debits against credits.
   */
  public generateAccountingBatch(
    settlements: AccountingSettlementInput[],
    config: AccountingBatchConfig,
  ): AccountingBatchResult {
    const rawLines: AccountingLineOutput[] = [];
    let sequence = 1;

    const defaultPayableAccount =
      config.defaultSalariesPayableAccount || '250505';
    const defaultPayableName =
      config.defaultSalariesPayableName || 'Salarios por Pagar';

    for (const emp of settlements) {
      // 1. Process Concept Lines
      for (const line of emp.lines) {
        if (!line.amount || line.amount <= 0) continue;

        let pucAccount = emp.isInternalDependency
          ? line.pucAccountAdministrative
          : line.pucAccountOperative;

        // Fallbacks if one is not configured
        if (!pucAccount) {
          pucAccount = emp.isInternalDependency
            ? line.nature === 'EARNING'
              ? '510506'
              : '237005'
            : line.nature === 'EARNING'
              ? '720506'
              : '237005';
        }

        let thirdPartyNit = line.thirdPartyNit || emp.documentNumber;
        let thirdPartyName = line.thirdPartyName || emp.fullName;

        // Routing health and pension deductions to their respective entity NITs if available
        if (
          line.epsNit &&
          (line.conceptCode === 201 ||
            line.conceptCode === 501 ||
            line.conceptName.toLowerCase().includes('salud'))
        ) {
          thirdPartyNit = line.epsNit;
          thirdPartyName = line.thirdPartyName || `EPS ${line.epsNit}`;
        } else if (
          line.afpNit &&
          (line.conceptCode === 202 ||
            line.conceptCode === 502 ||
            line.conceptName.toLowerCase().includes('pension') ||
            line.conceptName.toLowerCase().includes('pensión'))
        ) {
          thirdPartyNit = line.afpNit;
          thirdPartyName = line.thirdPartyName || `AFP ${line.afpNit}`;
        }

        if (line.nature === 'EARNING') {
          // Earnings are Debits (Expenses/Costs)
          rawLines.push({
            sequence: sequence++,
            pucAccount,
            accountName: line.conceptName,
            thirdPartyNit,
            thirdPartyName,
            costCenterCode: emp.costCenterCode || null,
            costCenterName: emp.costCenterName || null,
            dependencyCode: emp.dependencyCode || null,
            conceptCode: line.conceptCode,
            debitAmount: Math.round(line.amount * 100) / 100,
            creditAmount: 0,
            description: `${line.conceptName} - ${emp.fullName}`,
          });
        } else if (line.nature === 'DEDUCTION') {
          // Deductions are Credits (Withholdings/Passives)
          rawLines.push({
            sequence: sequence++,
            pucAccount,
            accountName: line.conceptName,
            thirdPartyNit,
            thirdPartyName,
            costCenterCode: emp.costCenterCode || null,
            costCenterName: emp.costCenterName || null,
            dependencyCode: emp.dependencyCode || null,
            conceptCode: line.conceptCode,
            debitAmount: 0,
            creditAmount: Math.round(line.amount * 100) / 100,
            description: `Deducción ${line.conceptName} - ${emp.fullName}`,
          });
        }
      }

      // 2. Net Pay Line (Credit to 250505 - Salarios por Pagar)
      if (emp.netPay > 0) {
        rawLines.push({
          sequence: sequence++,
          pucAccount: defaultPayableAccount,
          accountName: defaultPayableName,
          thirdPartyNit: emp.documentNumber,
          thirdPartyName: emp.fullName,
          costCenterCode: emp.costCenterCode || null,
          costCenterName: emp.costCenterName || null,
          dependencyCode: emp.dependencyCode || null,
          conceptCode: 999, // Net pay marker
          debitAmount: 0,
          creditAmount: Math.round(emp.netPay * 100) / 100,
          description: `Neto a Pagar Nómina - ${emp.fullName}`,
        });
      }
    }

    // Calculate totals
    const totalDebit =
      Math.round(rawLines.reduce((acc, l) => acc + l.debitAmount, 0) * 100) /
      100;
    const totalCredit =
      Math.round(rawLines.reduce((acc, l) => acc + l.creditAmount, 0) * 100) /
      100;
    const difference =
      Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
    const isBalanced = difference < 0.05; // Accept rounding pennies

    const accountingDate = new Date(config.accountingDate);
    const dateStr = accountingDate.toISOString().split('T')[0];
    const batchNumber =
      config.batchNumber ||
      `NC-${config.periodCode}-${dateStr.replace(/-/g, '')}`;

    let formattedContent = '';
    let fileName = '';

    if (config.exportFormat === AccountingExportFormat.WORLD_OFFICE) {
      formattedContent = this.formatWorldOfficeCsv(
        rawLines,
        config,
        batchNumber,
        dateStr,
      );
      fileName = `NOMINA_WORLDOFFICE_${config.periodCode}_${dateStr}.csv`;
    } else {
      formattedContent = this.formatHelisaCsv(
        rawLines,
        config,
        batchNumber,
        dateStr,
      );
      fileName = `NOMINA_HELISA_${config.periodCode}_${dateStr}.csv`;
    }

    return {
      exportFormat: config.exportFormat,
      batchNumber,
      accountingDate,
      totalDebit,
      totalCredit,
      isBalanced,
      difference,
      totalLines: rawLines.length,
      lines: rawLines,
      formattedContent,
      fileName,
    };
  }

  /**
   * Formats official World Office CSV interface.
   * Standard columns:
   * Empresa;Tipo_Documento;Numero_Documento;Fecha;Tercero_Inicial;Cuenta_Contable;Tercero_Detalle;Nombre_Tercero;Centro_Costo;Detalle_Concepto;Debito;Credito;Base_Retencion
   */
  public formatWorldOfficeCsv(
    lines: AccountingLineOutput[],
    config: AccountingBatchConfig,
    batchNumber: string,
    dateStr: string,
  ): string {
    const headers = [
      'Empresa',
      'Tipo_Documento',
      'Numero_Documento',
      'Fecha',
      'Tercero_Inicial',
      'Cuenta_Contable',
      'Tercero_Detalle',
      'Nombre_Tercero',
      'Centro_Costo',
      'Detalle_Concepto',
      'Debito',
      'Credito',
      'Base_Retencion',
    ];

    const rows = lines.map((l) => [
      `"${this.sanitize(config.companyLegalName)}"`,
      '"NM"',
      `"${batchNumber}"`,
      `"${dateStr}"`,
      `"${config.companyNit}"`,
      `"${l.pucAccount}"`,
      `"${l.thirdPartyNit}"`,
      `"${this.sanitize(l.thirdPartyName)}"`,
      `"${l.costCenterCode || ''}"`,
      `"${this.sanitize(l.description)}"`,
      l.debitAmount.toFixed(2),
      l.creditAmount.toFixed(2),
      '0.00',
    ]);

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  }

  /**
   * Formats official Helisa CSV interface.
   * Standard columns:
   * Tipo_Comprobante;Numero_Documento;Fecha_Asiento;Cuenta_PUC;Centro_Costo;Subcentro_Costo;NIT_Tercero;Digito_Verificacion;Nombre_Tercero;Naturaleza;Valor;Concepto_Detalle
   */
  public formatHelisaCsv(
    lines: AccountingLineOutput[],
    _config: AccountingBatchConfig,
    batchNumber: string,
    dateStr: string,
  ): string {
    const headers = [
      'Tipo_Comprobante',
      'Numero_Documento',
      'Fecha_Asiento',
      'Cuenta_PUC',
      'Centro_Costo',
      'Subcentro_Costo',
      'NIT_Tercero',
      'Digito_Verificacion',
      'Nombre_Tercero',
      'Naturaleza',
      'Valor',
      'Concepto_Detalle',
    ];

    const rows = lines.map((l) => {
      const isDebit = l.debitAmount > 0;
      const nature = isDebit ? 'D' : 'C';
      const amount = isDebit ? l.debitAmount : l.creditAmount;
      const dv = this.calculateDv(l.thirdPartyNit);

      return [
        '"05"', // Helisa code for Nómina comprobante
        `"${batchNumber}"`,
        `"${dateStr}"`,
        `"${l.pucAccount}"`,
        `"${l.costCenterCode || '001'}"`,
        '"00"',
        `"${l.thirdPartyNit}"`,
        `"${dv}"`,
        `"${this.sanitize(l.thirdPartyName)}"`,
        `"${nature}"`,
        amount.toFixed(2),
        `"${this.sanitize(l.description)}"`,
      ];
    });

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  }

  private sanitize(str: string): string {
    return (str || '').replace(/[\r\n;,"]/g, ' ').trim();
  }

  private calculateDv(nit: string): string {
    const cleanNit = (nit || '').replace(/\D/g, '');
    if (!cleanNit || cleanNit.length < 5) return '0';

    const vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let sum = 0;
    const len = cleanNit.length;

    for (let i = 0; i < len; i++) {
      sum += parseInt(cleanNit[len - 1 - i], 10) * vpri[i];
    }

    const mod = sum % 11;
    if (mod === 0 || mod === 1) return mod.toString();
    return (11 - mod).toString();
  }
}
