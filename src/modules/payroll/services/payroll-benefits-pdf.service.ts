import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';

export interface VacationSlipPdfData {
  settlementId: string;
  vacationType: string;
  status: string;
  accrualStartDate: string;
  accrualEndDate: string;
  enjoymentStartDate: string;
  enjoymentEndDate: string;
  returnDate: string;
  businessDays: number;
  calendarDaysPaid: number;
  currentBasicSalary: number;
  averageVariableVacBase: number;
  totalVacationBase: number;
  grossVacationAmount: number;
  healthDeductionAmount: number;
  pensionDeductionAmount: number;
  loansDeductionAmount: number;
  netPayAmount: number;
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
    dependencyName?: string;
    bankName?: string;
    accountNumber?: string;
  };
}

export interface FinalLiquidationPdfData {
  settlementId: string;
  contractType: string;
  exitReasonName: string;
  isJustCause: boolean;
  hireDate: string;
  retirementDate: string;
  contractDays360: number;
  netServiceDays: number;
  unpaidLeaveDays: number;
  lastBasicSalary: number;
  transportAllowanceApplicable: number;
  cesantiasAverageBase: number;
  primaAverageBase: number;
  vacationAverageBase: number;
  cesantiasPendingDays: number;
  cesantiasAmount: number;
  interestsCesantiasAmount: number;
  primaPendingDays: number;
  primaAmount: number;
  vacationAccruedDays: number;
  vacationEnjoyedDays: number;
  vacationPendingDays: number;
  vacationAmount: number;
  includePendingPayroll: boolean;
  pendingPayrollDays: number;
  pendingBasicSalaryAmount: number;
  pendingTransportAmount: number;
  pendingOvertimeAmount: number;
  pendingHealthDeduction: number;
  pendingPensionDeduction: number;
  applyIndemnification: boolean;
  indemnificationDays: number;
  indemnificationAmount: number;
  otherEarningsAmount: number;
  otherEarningsConcept?: string | null;
  loansDeductedAmount: number;
  otherDeductionsAmount: number;
  otherDeductionsConcept?: string | null;
  totalBenefitsAndEarnings: number;
  totalDeductions: number;
  netPayAmount: number;
  paymentDate?: string | null;
  notes?: string | null;
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
    dependencyName?: string;
    bankName?: string;
    accountNumber?: string;
  };
}

@Injectable()
export class PayrollBenefitsPdfService {
  private readonly logger = new Logger(PayrollBenefitsPdfService.name);

  /**
   * Generates PDF for Vacation Slip with QR Code and Signatures.
   */
  async generateVacationSlipPdf(data: VacationSlipPdfData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const primaryColor = rgb(0.486, 0.227, 0.929); // #7C3AED
    const darkColor = rgb(0.058, 0.09, 0.165); // #0F172A
    const grayText = rgb(0.392, 0.455, 0.545); // #64748B
    const lineGray = rgb(0.886, 0.91, 0.941); // #E2E8F0
    const lightBg = rgb(0.973, 0.98, 0.988); // #F8FAFC

    // Top Bar
    page.drawRectangle({
      x: 0,
      y: height - 8,
      width,
      height: 8,
      color: primaryColor,
    });

    let curY = height - 35;

    // Header
    page.drawText(data.company.legalName.toUpperCase(), {
      x: 35,
      y: curY,
      size: 11,
      font: fontBold,
      color: darkColor,
    });
    curY -= 13;
    page.drawText(
      `NIT: ${data.company.nit}${data.company.dv ? '-' + data.company.dv : ''} | ${data.company.city || 'Colombia'}`,
      {
        x: 35,
        y: curY,
        size: 8,
        font: fontRegular,
        color: grayText,
      },
    );

    curY -= 20;
    page.drawRectangle({
      x: 35,
      y: curY - 5,
      width: width - 70,
      height: 26,
      color: lightBg,
      borderColor: lineGray,
      borderWidth: 1,
    });
    page.drawText('COMPROBANTE DE LIQUIDACIÓN Y PAGO DE VACACIONES', {
      x: 45,
      y: curY + 4,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`REF: ${data.settlementId.substring(0, 14)}`, {
      x: width - 180,
      y: curY + 4,
      size: 8,
      font: fontRegular,
      color: grayText,
    });

    curY -= 25;

    // Worker details
    page.drawText('DATOS DEL TRABAJADOR', {
      x: 35,
      y: curY,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    curY -= 15;

    page.drawText(`Nombre: ${data.employee.fullName.toUpperCase()}`, {
      x: 35,
      y: curY,
      size: 8,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(
      `Documento: ${data.employee.documentType} ${data.employee.document}`,
      { x: 300, y: curY, size: 8, font: fontRegular, color: darkColor },
    );
    curY -= 12;

    page.drawText(
      `Cargo: ${data.employee.positionName || 'GUARDA DE SEGURIDAD'}`,
      { x: 35, y: curY, size: 8, font: fontRegular, color: darkColor },
    );
    page.drawText(
      `Puesto/Dependencia: ${data.employee.dependencyName || 'GENERAL'}`,
      { x: 300, y: curY, size: 8, font: fontRegular, color: darkColor },
    );
    curY -= 12;

    page.drawText(
      `Sueldo Básico: $${this.formatCurrency(data.currentBasicSalary)}`,
      { x: 35, y: curY, size: 8, font: fontRegular, color: darkColor },
    );
    page.drawText(
      `Periodo Causado: ${data.accrualStartDate} al ${data.accrualEndDate}`,
      { x: 300, y: curY, size: 8, font: fontRegular, color: darkColor },
    );

    curY -= 20;

    // Vacation details
    page.drawText('DETALLE DE OTORGAMIENTO Y CALENDARIO DE VACACIONES', {
      x: 35,
      y: curY,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    curY -= 15;

    page.drawText(
      `Modalidad: ${data.vacationType === 'COMPENSATED_IN_CASH' ? 'COMPENSADAS EN DINERO (Art. 189 CST)' : 'DISFRUTADAS EN TIEMPO'}`,
      { x: 35, y: curY, size: 8, font: fontRegular, color: darkColor },
    );
    page.drawText(`Días Hábiles Otorgados: ${data.businessDays}`, {
      x: 300,
      y: curY,
      size: 8,
      font: fontBold,
      color: darkColor,
    });
    curY -= 12;

    page.drawText(`Fecha Salida Disfrute: ${data.enjoymentStartDate}`, {
      x: 35,
      y: curY,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    page.drawText(`Fecha Fin Disfrute: ${data.enjoymentEndDate}`, {
      x: 300,
      y: curY,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    curY -= 12;

    page.drawText(`FECHA REGRESO AL PUESTO: ${data.returnDate}`, {
      x: 35,
      y: curY,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`Total Días Calendario Pagados: ${data.calendarDaysPaid}`, {
      x: 300,
      y: curY,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });

    curY -= 22;

    // Financial Breakdown Table
    page.drawRectangle({
      x: 35,
      y: curY - 140,
      width: width - 70,
      height: 155,
      color: rgb(1, 1, 1),
      borderColor: lineGray,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: 35,
      y: curY - 3,
      width: width - 70,
      height: 18,
      color: lightBg,
    });
    page.drawText('CONCEPTO FINANCIERO DE LIQUIDACIÓN', {
      x: 45,
      y: curY + 2,
      size: 8,
      font: fontBold,
      color: darkColor,
    });
    page.drawText('VALOR LIQUIDADO', {
      x: width - 150,
      y: curY + 2,
      size: 8,
      font: fontBold,
      color: darkColor,
    });

    let rowY = curY - 18;

    const rows = [
      {
        label: 'Sueldo Básico Vigente',
        val: `$${this.formatCurrency(data.currentBasicSalary)}`,
      },
      {
        label: 'Promedio Variable Recargos / Dominicales (Último Año)',
        val: `$${this.formatCurrency(data.averageVariableVacBase)}`,
      },
      {
        label: 'Base Total de Liquidación de Vacaciones (Art. 192 CST)',
        val: `$${this.formatCurrency(data.totalVacationBase)}`,
        isBold: true,
      },
      {
        label: `Total Vacaciones Brutas (${data.calendarDaysPaid} días calendario)`,
        val: `$${this.formatCurrency(data.grossVacationAmount)}`,
        isBold: true,
      },
      {
        label: '(-) Aporte Salud Trabajador (4%)',
        val: `-$${this.formatCurrency(data.healthDeductionAmount)}`,
      },
      {
        label: '(-) Aporte Pensión Trabajador (4%)',
        val: `-$${this.formatCurrency(data.pensionDeductionAmount)}`,
      },
      {
        label: '(-) Descuento Préstamos / Libranzas',
        val: `-$${this.formatCurrency(data.loansDeductionAmount)}`,
      },
    ];

    for (const r of rows) {
      page.drawText(r.label, {
        x: 45,
        y: rowY,
        size: 8,
        font: r.isBold ? fontBold : fontRegular,
        color: darkColor,
      });
      page.drawText(r.val, {
        x: width - 150,
        y: rowY,
        size: 8,
        font: r.isBold ? fontBold : fontRegular,
        color: darkColor,
      });
      rowY -= 15;
    }

    curY -= 160;

    // Total Net Banner
    page.drawRectangle({
      x: 35,
      y: curY - 6,
      width: width - 70,
      height: 26,
      color: primaryColor,
    });
    page.drawText('VALOR NETO A PAGAR POR VACACIONES:', {
      x: 45,
      y: curY + 3,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`$${this.formatCurrency(data.netPayAmount)} COP`, {
      x: width - 160,
      y: curY + 3,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    curY -= 40;

    // QR Code
    try {
      const qrDataUrl = await QRCode.toDataURL(
        `NOXIA-VACATION:${data.settlementId}|EMP:${data.employee.document}|VAL:${data.netPayAmount}`,
      );
      const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      page.drawImage(qrImage, { x: 45, y: curY - 55, width: 60, height: 60 });
    } catch (e) {
      this.logger.warn(
        `Could not render QR code for vacation PDF: ${(e as Error).message}`,
      );
    }

    page.drawText('Comprobante verificado digitalmente por NOXIA ERP.', {
      x: 115,
      y: curY - 20,
      size: 7,
      font: fontRegular,
      color: grayText,
    });
    page.drawText(
      'Certifica el disfrute y liquidación legal de vacaciones conforme al Art. 186-192 CST.',
      { x: 115, y: curY - 30, size: 7, font: fontRegular, color: grayText },
    );

    curY -= 100;

    // Signatures
    page.drawLine({
      start: { x: 45, y: curY },
      end: { x: 240, y: curY },
      thickness: 1,
      color: lineGray,
    });
    page.drawText('EMPLEADOR / REPRESENTANTE LEGAL', {
      x: 45,
      y: curY - 12,
      size: 7,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(data.company.signatureName || data.company.legalName, {
      x: 45,
      y: curY - 22,
      size: 7,
      font: fontRegular,
      color: grayText,
    });

    page.drawLine({
      start: { x: 320, y: curY },
      end: { x: 515, y: curY },
      thickness: 1,
      color: lineGray,
    });
    page.drawText('FIRMA DEL TRABAJADOR (RECIBÍ CONFORME)', {
      x: 320,
      y: curY - 12,
      size: 7,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(
      `C.C. ${data.employee.document} - ${data.employee.fullName}`,
      { x: 320, y: curY - 22, size: 7, font: fontRegular, color: grayText },
    );

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Generates PDF for Final Contract Settlement & Legal Clearance (Paz y Salvo).
   */
  async generateFinalLiquidationPdf(
    data: FinalLiquidationPdfData,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const primaryColor = rgb(0.486, 0.227, 0.929); // #7C3AED
    const darkColor = rgb(0.058, 0.09, 0.165); // #0F172A
    const grayText = rgb(0.392, 0.455, 0.545); // #64748B
    const lineGray = rgb(0.886, 0.91, 0.941); // #E2E8F0
    const lightBg = rgb(0.973, 0.98, 0.988); // #F8FAFC

    // Top Bar
    page.drawRectangle({
      x: 0,
      y: height - 8,
      width,
      height: 8,
      color: primaryColor,
    });

    let curY = height - 35;

    // Header
    page.drawText(data.company.legalName.toUpperCase(), {
      x: 35,
      y: curY,
      size: 10,
      font: fontBold,
      color: darkColor,
    });
    curY -= 12;
    page.drawText(
      `NIT: ${data.company.nit}${data.company.dv ? '-' + data.company.dv : ''} | ${data.company.city || 'Colombia'}`,
      {
        x: 35,
        y: curY,
        size: 8,
        font: fontRegular,
        color: grayText,
      },
    );

    curY -= 18;
    page.drawRectangle({
      x: 35,
      y: curY - 4,
      width: width - 70,
      height: 24,
      color: lightBg,
      borderColor: lineGray,
      borderWidth: 1,
    });
    page.drawText(
      'ACTA DE LIQUIDACIÓN DEFINITIVA DE CONTRATO Y PAZ Y SALVO LABORAL',
      {
        x: 45,
        y: curY + 4,
        size: 9,
        font: fontBold,
        color: primaryColor,
      },
    );
    page.drawText(`REF: ${data.settlementId.substring(0, 14)}`, {
      x: width - 170,
      y: curY + 4,
      size: 8,
      font: fontRegular,
      color: grayText,
    });

    curY -= 22;

    // Contract & Worker Details Grid
    page.drawText('INFORMACIÓN CONTRACTUAL Y TIEMPOS DE SERVICIO (BASE 360)', {
      x: 35,
      y: curY,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    curY -= 14;

    page.drawText(`Trabajador: ${data.employee.fullName.toUpperCase()}`, {
      x: 35,
      y: curY,
      size: 8,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(`C.C.: ${data.employee.document}`, {
      x: 300,
      y: curY,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    curY -= 11;

    page.drawText(
      `Cargo: ${data.employee.positionName || 'GUARDA DE SEGURIDAD'}`,
      { x: 35, y: curY, size: 8, font: fontRegular, color: darkColor },
    );
    page.drawText(`Tipo Contrato: ${data.contractType}`, {
      x: 300,
      y: curY,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    curY -= 11;

    page.drawText(`Fecha Ingreso: ${data.hireDate}`, {
      x: 35,
      y: curY,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    page.drawText(`Fecha Retiro: ${data.retirementDate}`, {
      x: 170,
      y: curY,
      size: 8,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(`Días Netos Servicio: ${data.netServiceDays} días`, {
      x: 300,
      y: curY,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    curY -= 11;

    page.drawText(`Motivo Retiro: ${data.exitReasonName}`, {
      x: 35,
      y: curY,
      size: 8,
      font: fontRegular,
      color: darkColor,
    });
    page.drawText(
      `Último Básico: $${this.formatCurrency(data.lastBasicSalary)}`,
      { x: 300, y: curY, size: 8, font: fontRegular, color: darkColor },
    );

    curY -= 20;

    // Detailed Liquidation Table
    page.drawRectangle({
      x: 35,
      y: curY - 215,
      width: width - 70,
      height: 230,
      color: rgb(1, 1, 1),
      borderColor: lineGray,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: 35,
      y: curY - 3,
      width: width - 70,
      height: 16,
      color: lightBg,
    });
    page.drawText('CONCEPTO DE LIQUIDACIÓN', {
      x: 45,
      y: curY + 2,
      size: 7.5,
      font: fontBold,
      color: darkColor,
    });
    page.drawText('BASE / DÍAS', {
      x: 310,
      y: curY + 2,
      size: 7.5,
      font: fontBold,
      color: darkColor,
    });
    page.drawText('VALOR', {
      x: width - 120,
      y: curY + 2,
      size: 7.5,
      font: fontBold,
      color: darkColor,
    });

    let tableY = curY - 16;

    const lineItems = [
      {
        name: 'Cesantías del Año en Curso (Art. 249 CST)',
        base: `${data.cesantiasPendingDays} días (Base: $${this.formatCurrency(data.cesantiasAverageBase)})`,
        val: `$${this.formatCurrency(data.cesantiasAmount)}`,
      },
      {
        name: 'Intereses sobre Cesantías 12% (Ley 52 de 1975)',
        base: `${data.cesantiasPendingDays} días al 12%`,
        val: `$${this.formatCurrency(data.interestsCesantiasAmount)}`,
      },
      {
        name: 'Prima de Servicios Semestral (Art. 306 CST)',
        base: `${data.primaPendingDays} días (Base: $${this.formatCurrency(data.primaAverageBase)})`,
        val: `$${this.formatCurrency(data.primaAmount)}`,
      },
      {
        name: 'Vacaciones Pendientes en Dinero (Art. 186-192 CST)',
        base: `${data.vacationPendingDays} días hábiles pendientes`,
        val: `$${this.formatCurrency(data.vacationAmount)}`,
      },
      {
        name: 'Salario Pendiente Último Periodo',
        base: `${data.pendingPayrollDays} días trabajados`,
        val: `$${this.formatCurrency(data.pendingBasicSalaryAmount)}`,
      },
      {
        name: 'Auxilio de Transporte Pendiente',
        base: `${data.pendingPayrollDays} días`,
        val: `$${this.formatCurrency(data.pendingTransportAmount)}`,
      },
      {
        name: 'Horas Extras / Recargos Pendientes',
        base: '-',
        val: `$${this.formatCurrency(data.pendingOvertimeAmount)}`,
      },
      {
        name: 'Indemnización por Despido Art. 64 CST',
        base: `${data.indemnificationDays} días`,
        val: `$${this.formatCurrency(data.indemnificationAmount)}`,
        isBold: data.applyIndemnification,
      },
      {
        name: '(-) Deducción Salud 4% (Último Sueldo)',
        base: '4%',
        val: `-$${this.formatCurrency(data.pendingHealthDeduction)}`,
      },
      {
        name: '(-) Deducción Pensión 4% (Último Sueldo)',
        base: '4%',
        val: `-$${this.formatCurrency(data.pendingPensionDeduction)}`,
      },
      {
        name: '(-) Cruce y Saldo Préstamos Activos',
        base: 'Libranzas/Préstamos',
        val: `-$${this.formatCurrency(data.loansDeductedAmount)}`,
      },
      {
        name: '(-) Otras Deducciones',
        base: data.otherDeductionsConcept || '-',
        val: `-$${this.formatCurrency(data.otherDeductionsAmount)}`,
      },
    ];

    for (const item of lineItems) {
      page.drawText(item.name, {
        x: 45,
        y: tableY,
        size: 7,
        font: item.isBold ? fontBold : fontRegular,
        color: darkColor,
      });
      page.drawText(item.base, {
        x: 310,
        y: tableY,
        size: 7,
        font: fontRegular,
        color: grayText,
      });
      page.drawText(item.val, {
        x: width - 120,
        y: tableY,
        size: 7,
        font: item.isBold ? fontBold : fontRegular,
        color: darkColor,
      });
      tableY -= 14;
    }

    curY -= 235;

    // Totals Banner
    page.drawRectangle({
      x: 35,
      y: curY - 6,
      width: width - 70,
      height: 26,
      color: primaryColor,
    });
    page.drawText(
      `TOTAL DEVENGADO: $${this.formatCurrency(data.totalBenefitsAndEarnings)}  |  TOTAL DEDUCIDO: $${this.formatCurrency(data.totalDeductions)}`,
      {
        x: 45,
        y: curY + 3,
        size: 7.5,
        font: fontBold,
        color: rgb(1, 1, 1),
      },
    );
    page.drawText(
      `NETO A PAGAR: $${this.formatCurrency(data.netPayAmount)} COP`,
      {
        x: width - 190,
        y: curY + 3,
        size: 9,
        font: fontBold,
        color: rgb(1, 1, 1),
      },
    );

    curY -= 35;

    // Legal Clearance Statement (Paz y Salvo)
    page.drawText('DECLARACIÓN DE PAZ Y SALVO LABORAL:', {
      x: 35,
      y: curY,
      size: 7.5,
      font: fontBold,
      color: primaryColor,
    });
    curY -= 11;
    const clauseText =
      'El trabajador manifiesta que ha recibido a entera satisfacción el valor liquidado en la presente acta por concepto de salarios, descansos remunerados, prestaciones sociales, horas extras, recargos e indemnizaciones derivadas de la relación contractual. Declara que el empleador queda a total PAZ Y SALVO por todo concepto laboral y renuncia a cualquier reclamación judicial o extrajudicial por los conceptos aquí relacionados y cancelados.';
    page.drawText(clauseText, {
      x: 35,
      y: curY,
      size: 6.5,
      font: fontRegular,
      color: grayText,
      maxWidth: width - 70,
      lineHeight: 9,
    });

    curY -= 55;

    // QR Code
    try {
      const qrDataUrl = await QRCode.toDataURL(
        `NOXIA-FINAL-LIQUIDATION:${data.settlementId}|EMP:${data.employee.document}|VAL:${data.netPayAmount}`,
      );
      const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      page.drawImage(qrImage, { x: 45, y: curY - 45, width: 50, height: 50 });
    } catch (e) {
      this.logger.warn(
        `Could not render QR for final settlement PDF: ${(e as Error).message}`,
      );
    }

    page.drawText('Documento oficial emitido y registrado en NOXIA ERP.', {
      x: 105,
      y: curY - 15,
      size: 6.5,
      font: fontRegular,
      color: grayText,
    });
    page.drawText(
      `Generado el ${new Date().toLocaleDateString('es-CO')} con firma y huella de las partes.`,
      { x: 105, y: curY - 26, size: 6.5, font: fontRegular, color: grayText },
    );

    curY -= 75;

    // Signatures with Fingerprint Box
    page.drawLine({
      start: { x: 45, y: curY },
      end: { x: 230, y: curY },
      thickness: 1,
      color: lineGray,
    });
    page.drawText('POR EL EMPLEADOR', {
      x: 45,
      y: curY - 11,
      size: 7,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(data.company.signatureName || data.company.legalName, {
      x: 45,
      y: curY - 20,
      size: 6.5,
      font: fontRegular,
      color: grayText,
    });
    page.drawText(`NIT: ${data.company.nit}`, {
      x: 45,
      y: curY - 29,
      size: 6.5,
      font: fontRegular,
      color: grayText,
    });

    page.drawLine({
      start: { x: 260, y: curY },
      end: { x: 430, y: curY },
      thickness: 1,
      color: lineGray,
    });
    page.drawText('EL TRABAJADOR (RECIBÍ Y ACEPTO)', {
      x: 260,
      y: curY - 11,
      size: 7,
      font: fontBold,
      color: darkColor,
    });
    page.drawText(data.employee.fullName.toUpperCase(), {
      x: 260,
      y: curY - 20,
      size: 6.5,
      font: fontRegular,
      color: grayText,
    });
    page.drawText(`C.C. ${data.employee.document}`, {
      x: 260,
      y: curY - 29,
      size: 6.5,
      font: fontRegular,
      color: grayText,
    });

    // Fingerprint Box
    page.drawRectangle({
      x: 455,
      y: curY - 32,
      width: 45,
      height: 50,
      color: rgb(1, 1, 1),
      borderColor: lineGray,
      borderWidth: 1,
    });
    page.drawText('HUELLA', {
      x: 462,
      y: curY - 28,
      size: 6,
      font: fontRegular,
      color: grayText,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private formatCurrency(value: number): string {
    return Math.round(value || 0).toLocaleString('es-CO');
  }
}
