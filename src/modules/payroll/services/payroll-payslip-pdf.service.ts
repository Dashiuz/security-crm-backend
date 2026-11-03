import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';

export interface PayslipLineDto {
  conceptCode: number;
  conceptName: string;
  nature:
    | 'DEVENGO'
    | 'DEDUCCION'
    | 'INCAPACIDAD'
    | 'LICENCIA'
    | 'SEG_SOCIAL'
    | 'PROVISION';
  quantity: number;
  totalValue: number;
  origin?: string;
  isOvertime?: boolean;
}

export interface PayslipRenderItem {
  settlementId: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  paymentDate?: string | null;
  company: {
    legalName: string;
    nit: string;
    dv?: string;
    city?: string;
    signatureName?: string;
    signatureRole?: string;
  };
  employee: {
    documentType: string;
    document: string;
    fullName: string;
    positionName?: string;
    branchName?: string;
    dependencyName?: string;
    baseSalaryMonthly: number;
    bankName?: string;
    accountNumber?: string;
    epsName?: string;
    afpName?: string;
  };
  workedDays: number;
  totalEarnings: number;
  totalDeductions: number;
  netPayAmount: number;
  lines: PayslipLineDto[];
  groupOvertime?: boolean;
}

@Injectable()
export class PayrollPayslipPdfService {
  private readonly logger = new Logger(PayrollPayslipPdfService.name);

  /**
   * Generates a single or consolidated multi-page PDF for payslips
   */
  async generatePayslipsPdf(items: PayslipRenderItem[]): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const item of items) {
      await this.renderSinglePayslipPage(
        pdfDoc,
        item,
        helveticaBold,
        helvetica,
      );
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async renderSinglePayslipPage(
    pdfDoc: PDFDocument,
    item: PayslipRenderItem,
    fontBold: any,
    fontRegular: any,
  ): Promise<void> {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 (595 x 842 points)
    const { width, height } = page.getSize();

    // Palette
    const primaryColor = rgb(0.486, 0.227, 0.929); // #7C3AED Deep Violet
    const darkColor = rgb(0.058, 0.09, 0.165); // #0F172A
    const grayText = rgb(0.392, 0.455, 0.545); // #64748B
    const lineGray = rgb(0.886, 0.91, 0.941); // #E2E8F0
    const lightBg = rgb(0.973, 0.98, 0.988); // #F8FAFC

    // 1. Top Decorative Bar
    page.drawRectangle({
      x: 0,
      y: height - 10,
      width,
      height: 10,
      color: primaryColor,
    });

    // 2. Company Header
    page.drawText(item.company.legalName.toUpperCase(), {
      x: 40,
      y: height - 40,
      size: 13,
      font: fontBold,
      color: darkColor,
    });

    page.drawText(
      `NIT: ${item.company.nit}${item.company.dv ? '-' + item.company.dv : ''} | ${item.company.city || 'BOGOTÁ D.C.'}`,
      {
        x: 40,
        y: height - 55,
        size: 8.5,
        font: fontRegular,
        color: grayText,
      },
    );

    // Right-aligned Document Title
    const titleText = 'COMPROBANTE DE PAGO DE NÓMINA';
    page.drawText(titleText, {
      x: width - 250,
      y: height - 40,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText(
      `Periodo: ${item.periodLabel} (${item.startDate} al ${item.endDate})`,
      {
        x: width - 250,
        y: height - 55,
        size: 8,
        font: fontRegular,
        color: grayText,
      },
    );

    // Separator
    page.drawLine({
      start: { x: 40, y: height - 68 },
      end: { x: width - 40, y: height - 68 },
      thickness: 1,
      color: lineGray,
    });

    // 3. Employee Info Card
    page.drawRectangle({
      x: 40,
      y: height - 145,
      width: width - 80,
      height: 70,
      color: lightBg,
      borderColor: lineGray,
      borderWidth: 1,
    });

    const col1X = 52;
    const col2X = 220;
    const col3X = 400;

    // Row 1
    page.drawText('TRABAJADOR:', {
      x: col1X,
      y: height - 88,
      size: 7.5,
      font: fontBold,
      color: grayText,
    });
    page.drawText(item.employee.fullName.toUpperCase().slice(0, 32), {
      x: col1X,
      y: height - 100,
      size: 8.5,
      font: fontBold,
      color: darkColor,
    });

    page.drawText('IDENTIFICACIÓN:', {
      x: col2X,
      y: height - 88,
      size: 7.5,
      font: fontBold,
      color: grayText,
    });
    page.drawText(`${item.employee.documentType} ${item.employee.document}`, {
      x: col2X,
      y: height - 100,
      size: 8.5,
      font: fontRegular,
      color: darkColor,
    });

    page.drawText('SUELDO BÁSICO MENSUAL:', {
      x: col3X,
      y: height - 88,
      size: 7.5,
      font: fontBold,
      color: grayText,
    });
    page.drawText(
      `$ ${item.employee.baseSalaryMonthly.toLocaleString('es-CO')}`,
      {
        x: col3X,
        y: height - 100,
        size: 8.5,
        font: fontBold,
        color: primaryColor,
      },
    );

    // Row 2
    page.drawText('PUESTO / DEPENDENCIA:', {
      x: col1X,
      y: height - 118,
      size: 7.5,
      font: fontBold,
      color: grayText,
    });
    page.drawText(
      (item.employee.dependencyName || 'OPERACIONES').slice(0, 32),
      {
        x: col1X,
        y: height - 130,
        size: 8,
        font: fontRegular,
        color: darkColor,
      },
    );

    page.drawText('CARGO / SUCURSAL:', {
      x: col2X,
      y: height - 118,
      size: 7.5,
      font: fontBold,
      color: grayText,
    });
    page.drawText(
      `${item.employee.positionName || 'Guarda'} / ${item.employee.branchName || 'Bogotá'}`,
      {
        x: col2X,
        y: height - 130,
        size: 8,
        font: fontRegular,
        color: darkColor,
      },
    );

    page.drawText('DÍAS TRABAJADOS:', {
      x: col3X,
      y: height - 118,
      size: 7.5,
      font: fontBold,
      color: grayText,
    });
    page.drawText(`${item.workedDays} días`, {
      x: col3X,
      y: height - 130,
      size: 8.5,
      font: fontBold,
      color: darkColor,
    });

    // 4. Split Lines: Devengos vs Deducciones
    let rawLines = item.lines;
    if (item.groupOvertime) {
      // Group lines marked with isOvertime or code in [2,3,4,5,6,7,8,9]
      const overtimeCodes = [2, 3, 4, 5, 6, 7, 8, 9, 999];
      const regularLines: PayslipLineDto[] = [];
      let groupedOvertimeQty = 0;
      let groupedOvertimeVal = 0;

      for (const l of rawLines) {
        if (overtimeCodes.includes(l.conceptCode) || l.isOvertime) {
          groupedOvertimeQty += Number(l.quantity || 0);
          groupedOvertimeVal += Number(l.totalValue || 0);
        } else {
          regularLines.push(l);
        }
      }

      if (groupedOvertimeVal > 0) {
        regularLines.push({
          conceptCode: 99,
          conceptName: 'HORAS EXTRAS Y RECARGOS SUPLEMENTARIOS',
          nature: 'DEVENGO',
          quantity: groupedOvertimeQty,
          totalValue: groupedOvertimeVal,
        });
      }
      rawLines = regularLines;
    }

    const earnings = rawLines.filter(
      (l) =>
        l.nature === 'DEVENGO' ||
        l.nature === 'INCAPACIDAD' ||
        l.nature === 'LICENCIA',
    );
    const deductions = rawLines.filter(
      (l) => l.nature === 'DEDUCCION' || l.nature === 'SEG_SOCIAL',
    );

    // Section Titles
    const tableTopY = height - 165;
    const tableWidth = (width - 90) / 2; // ~252 points each side

    // Headers Left (Devengos)
    page.drawRectangle({
      x: 40,
      y: tableTopY,
      width: tableWidth,
      height: 18,
      color: primaryColor,
    });
    page.drawText('INGRESOS Y DEVENGOS', {
      x: 48,
      y: tableTopY + 5,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('CANT.', {
      x: 40 + tableWidth - 90,
      y: tableTopY + 5,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('VALOR', {
      x: 40 + tableWidth - 45,
      y: tableTopY + 5,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Headers Right (Deducciones)
    const rightTableX = 50 + tableWidth;
    page.drawRectangle({
      x: rightTableX,
      y: tableTopY,
      width: tableWidth,
      height: 18,
      color: rgb(0.85, 0.25, 0.2),
    });
    page.drawText('DEDUCCIONES Y RETENCIONES', {
      x: rightTableX + 8,
      y: tableTopY + 5,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('CANT.', {
      x: rightTableX + tableWidth - 90,
      y: tableTopY + 5,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('VALOR', {
      x: rightTableX + tableWidth - 45,
      y: tableTopY + 5,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Print Lines
    let currentYLeft = tableTopY - 14;
    for (const e of earnings) {
      page.drawText(e.conceptName.slice(0, 26), {
        x: 45,
        y: currentYLeft,
        size: 7.5,
        font: fontRegular,
        color: darkColor,
      });
      page.drawText(String(e.quantity), {
        x: 40 + tableWidth - 85,
        y: currentYLeft,
        size: 7.5,
        font: fontRegular,
        color: grayText,
      });
      page.drawText(`$${Math.round(e.totalValue).toLocaleString('es-CO')}`, {
        x: 40 + tableWidth - 45,
        y: currentYLeft,
        size: 7.5,
        font: fontBold,
        color: darkColor,
      });
      currentYLeft -= 14;
    }

    let currentYRight = tableTopY - 14;
    for (const d of deductions) {
      page.drawText(d.conceptName.slice(0, 26), {
        x: rightTableX + 5,
        y: currentYRight,
        size: 7.5,
        font: fontRegular,
        color: darkColor,
      });
      page.drawText(String(d.quantity), {
        x: rightTableX + tableWidth - 85,
        y: currentYRight,
        size: 7.5,
        font: fontRegular,
        color: grayText,
      });
      page.drawText(`$${Math.round(d.totalValue).toLocaleString('es-CO')}`, {
        x: rightTableX + tableWidth - 45,
        y: currentYRight,
        size: 7.5,
        font: fontBold,
        color: darkColor,
      });
      currentYRight -= 14;
    }

    // Totals Box
    const totalsY = Math.min(currentYLeft, currentYRight) - 20;

    page.drawLine({
      start: { x: 40, y: totalsY + 15 },
      end: { x: width - 40, y: totalsY + 15 },
      thickness: 1,
      color: lineGray,
    });

    page.drawText('TOTAL DEVENGADO:', {
      x: 45,
      y: totalsY,
      size: 8.5,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(`$ ${item.totalEarnings.toLocaleString('es-CO')}`, {
      x: 160,
      y: totalsY,
      size: 9,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText('TOTAL DEDUCCIONES:', {
      x: rightTableX + 5,
      y: totalsY,
      size: 8.5,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(`$ ${item.totalDeductions.toLocaleString('es-CO')}`, {
      x: rightTableX + 130,
      y: totalsY,
      size: 9,
      font: fontBold,
      color: rgb(0.85, 0.25, 0.2),
    });

    // Net Pay Highlight Box
    page.drawRectangle({
      x: 40,
      y: totalsY - 45,
      width: width - 80,
      height: 32,
      color: rgb(0.93, 0.91, 0.99), // Light violet
      borderColor: primaryColor,
      borderWidth: 1.5,
    });

    page.drawText('NETO A PAGAR TRABAJADOR:', {
      x: 55,
      y: totalsY - 32,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`$ ${item.netPayAmount.toLocaleString('es-CO')} COP`, {
      x: width - 210,
      y: totalsY - 33,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });

    // 5. Bank Account & Security Social Affiliations
    const bankY = totalsY - 75;
    page.drawText(
      `Dispersión ACH: ${item.employee.bankName || 'Por ventanilla / Cheque'} - Cta: ${item.employee.accountNumber || 'N/A'} | EPS: ${item.employee.epsName || 'N/A'} | AFP: ${item.employee.afpName || 'N/A'}`,
      { x: 40, y: bankY, size: 7.5, font: fontRegular, color: grayText },
    );

    // 6. QR Code Verification Stamp
    try {
      const qrData = `NIT:${item.company.nit}|EMP:${item.employee.document}|PER:${item.startDate}-${item.endDate}|NETO:${item.netPayAmount}`;
      const qrPngBuffer = await QRCode.toBuffer(qrData, {
        width: 70,
        margin: 1,
      });
      const qrImage = await pdfDoc.embedPng(qrPngBuffer);
      page.drawImage(qrImage, {
        x: 40,
        y: bankY - 80,
        width: 60,
        height: 60,
      });

      page.drawText('Comprobante verificado con firma digital NOXIA ERP.', {
        x: 110,
        y: bankY - 45,
        size: 7,
        font: fontRegular,
        color: grayText,
      });
      page.drawText('Generado de conformidad con el CST y estándares DIAN.', {
        x: 110,
        y: bankY - 57,
        size: 7,
        font: fontRegular,
        color: grayText,
      });
    } catch (e) {
      this.logger.error('Error embedding QR code in payslip PDF', e);
    }

    // 7. Signature Lines
    const signY = bankY - 95;
    page.drawLine({
      start: { x: 260, y: signY },
      end: { x: 390, y: signY },
      thickness: 0.8,
      color: lineGray,
    });
    page.drawText(item.company.signatureName || 'PAGADOR AUTORIZADO', {
      x: 260,
      y: signY - 12,
      size: 7,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(item.company.signatureRole || 'Director(a) Financiero(a)', {
      x: 260,
      y: signY - 22,
      size: 6.5,
      font: fontRegular,
      color: grayText,
    });

    page.drawLine({
      start: { x: 420, y: signY },
      end: { x: width - 40, y: signY },
      thickness: 0.8,
      color: lineGray,
    });
    page.drawText('FIRMA / ACEPTACIÓN TRABAJADOR', {
      x: 420,
      y: signY - 12,
      size: 7,
      font: fontBold,
      color: darkColor,
    });
    page.drawText('C.C. _______________________', {
      x: 420,
      y: signY - 22,
      size: 6.5,
      font: fontRegular,
      color: grayText,
    });
  }
}
