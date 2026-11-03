import { Injectable } from '@nestjs/common';
import { PayrollDisbursementType } from '@prisma/client';

export interface AchBeneficiaryItem {
  employeeId: string;
  documentType: string;
  document: string;
  fullName: string;
  bankCode?: string | null;
  bankName?: string | null;
  achCode?: string | null;
  accountType: 'SAVINGS' | 'CHECKING' | 'ELECTRONIC_DEPOSIT' | 'CASH_OR_CHECK';
  accountNumber?: string | null;
  netAmount: number;
}

export interface AchBatchGeneratorInput {
  company: {
    nit: string;
    dv?: string;
    legalName: string;
    mainAccount?: string;
  };
  disbursementType: PayrollDisbursementType;
  year: number;
  month: number;
  exportFormat: string; // PAB_BANCOLOMBIA | DAVIVIENDA | BCSC | BOGOTA | STANDARD_ACH
  items: AchBeneficiaryItem[];
}

export interface AchBatchGeneratorResult {
  fileContent: string;
  fileName: string;
  mimeType: string;
  totalRecords: number;
  totalAmount: number;
  validRecordsCount: number;
  skippedMissingAccountCount: number;
  warnings: Array<{ employeeId: string; fullName: string; reason: string }>;
}

@Injectable()
export class BankAchGeneratorEngine {
  generate(input: AchBatchGeneratorInput): AchBatchGeneratorResult {
    return BankAchGeneratorEngine.generate(input);
  }

  private static padLeft(str: string, len: number, char = '0'): string {
    const s = String(str || '');
    return s.length >= len ? s.slice(-len) : char.repeat(len - s.length) + s;
  }

  private static padRight(str: string, len: number, char = ' '): string {
    const s = String(str || '');
    return s.length >= len ? s.slice(0, len) : s + char.repeat(len - s.length);
  }

  private static sanitizeText(str: string): string {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .toUpperCase();
  }

  public static generate(
    input: AchBatchGeneratorInput,
  ): AchBatchGeneratorResult {
    const { company, disbursementType, year, month, exportFormat, items } =
      input;

    const validItems: AchBeneficiaryItem[] = [];
    const warnings: Array<{
      employeeId: string;
      fullName: string;
      reason: string;
    }> = [];

    for (const item of items) {
      if (item.netAmount <= 0) {
        warnings.push({
          employeeId: item.employeeId,
          fullName: item.fullName,
          reason: `Monto neto a pagar es menor o igual a cero ($${item.netAmount}).`,
        });
        continue;
      }
      if (
        item.accountType === 'CASH_OR_CHECK' ||
        !item.accountNumber ||
        item.accountNumber.trim().length === 0
      ) {
        warnings.push({
          employeeId: item.employeeId,
          fullName: item.fullName,
          reason:
            'No tiene configurada una cuenta bancaria activa (Pago en efectivo o sin cuenta).',
        });
        continue;
      }
      validItems.push(item);
    }

    const totalAmount = validItems.reduce(
      (acc, curr) => acc + curr.netAmount,
      0,
    );
    const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
    const dateStr = `${year}${String(month).padStart(2, '0')}`;
    const typeLabel =
      disbursementType === 'FORTNIGHT_ADVANCE' ? 'ANTICIPO' : 'NOMINA';

    switch (exportFormat) {
      case 'PAB_BANCOLOMBIA':
        return this.generateBancolombiaPab(
          input,
          validItems,
          warnings,
          roundedTotalAmount,
          dateStr,
          typeLabel,
        );
      case 'DAVIVIENDA':
        return this.generateDavivienda(
          input,
          validItems,
          warnings,
          roundedTotalAmount,
          dateStr,
          typeLabel,
        );
      case 'BCSC':
      case 'BOGOTA':
      case 'STANDARD_ACH':
      default:
        return this.generateStandardAch(
          input,
          validItems,
          warnings,
          roundedTotalAmount,
          dateStr,
          typeLabel,
        );
    }
  }

  private static generateBancolombiaPab(
    input: AchBatchGeneratorInput,
    validItems: AchBeneficiaryItem[],
    warnings: Array<{ employeeId: string; fullName: string; reason: string }>,
    totalAmount: number,
    dateStr: string,
    typeLabel: string,
  ): AchBatchGeneratorResult {
    const lines: string[] = [];

    // Header Record (Tipo 1)
    const recordType1 = '1';
    const nitPagador = this.padLeft(
      input.company.nit.replace(/[^0-9]/g, ''),
      15,
    );
    const nombrePagador = this.padRight(
      this.sanitizeText(input.company.legalName),
      16,
    );
    const clasePago = '225'; // Pago de nómina
    const descripcion = this.padRight(`${typeLabel} ${dateStr}`, 10);
    const fechaTransmision = `${input.year}${String(input.month).padStart(2, '0')}01`;
    const secuencia = 'A';
    const numRegistros = this.padLeft(String(validItems.length), 6);
    const totalPesos = this.padLeft(String(Math.round(totalAmount)), 12);
    const totalCentavos = this.padLeft(
      String(Math.round((totalAmount % 1) * 100)),
      2,
    );

    lines.push(
      `${recordType1}${nitPagador}${nombrePagador}${clasePago}${descripcion}${fechaTransmision}${secuencia}${numRegistros}${totalPesos}${totalCentavos}`,
    );

    // Detail Records (Tipo 6)
    for (const item of validItems) {
      const recordType6 = '6';
      const nitBeneficiario = this.padLeft(
        item.document.replace(/[^0-9]/g, ''),
        15,
      );
      const nombreBeneficiario = this.padRight(
        this.sanitizeText(item.fullName),
        30,
      );
      const codigoBanco = this.padLeft(item.achCode || '007', 9); // 007 Bancolombia
      const numCuenta = this.padRight(
        item.accountNumber?.replace(/[^0-9]/g, '') || '',
        17,
      );
      const tipoTx = item.accountType === 'CHECKING' ? '37' : '27'; // 27 Ahorros, 37 Corriente
      const valPesos = this.padLeft(String(Math.floor(item.netAmount)), 10);
      const valCentavos = this.padLeft(
        String(Math.round((item.netAmount % 1) * 100)),
        2,
      );

      lines.push(
        `${recordType6}${nitBeneficiario}${nombreBeneficiario}${codigoBanco}${numCuenta}${tipoTx}${valPesos}${valCentavos}`,
      );
    }

    const fileName = `PAB_BANCOLOMBIA_${typeLabel}_${dateStr}.txt`;
    return {
      fileContent: lines.join('\r\n'),
      fileName,
      mimeType: 'text/plain',
      totalRecords: validItems.length,
      totalAmount,
      validRecordsCount: validItems.length,
      skippedMissingAccountCount: warnings.length,
      warnings,
    };
  }

  private static generateDavivienda(
    input: AchBatchGeneratorInput,
    validItems: AchBeneficiaryItem[],
    warnings: Array<{ employeeId: string; fullName: string; reason: string }>,
    totalAmount: number,
    dateStr: string,
    typeLabel: string,
  ): AchBatchGeneratorResult {
    const lines: string[] = [];

    // Header RC
    const header = `RC,${input.company.nit},NOMINA,${dateStr},${validItems.length},${Math.round(totalAmount * 100)}`;
    lines.push(header);

    // Detail TR
    for (const item of validItems) {
      const cuenta = item.accountNumber?.replace(/[^0-9]/g, '') || '';
      const tipoCta = item.accountType === 'CHECKING' ? 'CC' : 'CA';
      const doc = item.document.replace(/[^0-9]/g, '');
      const nombre = this.sanitizeText(item.fullName).slice(0, 30);
      const valCents = Math.round(item.netAmount * 100);

      lines.push(
        `TR,${doc},${nombre},${item.achCode || '051'},${cuenta},${tipoCta},${valCents}`,
      );
    }

    const fileName = `DAVIVIENDA_${typeLabel}_${dateStr}.txt`;
    return {
      fileContent: lines.join('\r\n'),
      fileName,
      mimeType: 'text/plain',
      totalRecords: validItems.length,
      totalAmount,
      validRecordsCount: validItems.length,
      skippedMissingAccountCount: warnings.length,
      warnings,
    };
  }

  private static generateStandardAch(
    input: AchBatchGeneratorInput,
    validItems: AchBeneficiaryItem[],
    warnings: Array<{ employeeId: string; fullName: string; reason: string }>,
    totalAmount: number,
    dateStr: string,
    typeLabel: string,
  ): AchBatchGeneratorResult {
    const header =
      'TIPO_DOC;DOCUMENTO;EMPLEADO;BANCO;CODIGO_ACH;TIPO_CUENTA;NUMERO_CUENTA;VALOR_NETO;REFERENCIA';
    const lines: string[] = [header];

    for (const item of validItems) {
      lines.push(
        [
          item.documentType,
          item.document,
          this.sanitizeText(item.fullName),
          this.sanitizeText(item.bankName || 'BANCO'),
          item.achCode || '',
          item.accountType,
          item.accountNumber || '',
          item.netAmount.toFixed(2),
          `${typeLabel}_${dateStr}`,
        ].join(';'),
      );
    }

    const fileName = `DISPERSION_ACH_${typeLabel}_${dateStr}.csv`;
    return {
      fileContent: lines.join('\r\n'),
      fileName,
      mimeType: 'text/csv',
      totalRecords: validItems.length,
      totalAmount,
      validRecordsCount: validItems.length,
      skippedMissingAccountCount: warnings.length,
      warnings,
    };
  }
}
