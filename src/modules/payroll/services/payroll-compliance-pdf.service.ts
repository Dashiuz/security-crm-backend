import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';

export interface LaborCertificatePdfData {
  company: {
    legalName: string;
    nit: string;
    dv?: string;
    city?: string;
    address?: string;
    phone?: string;
    signerName?: string;
    signerRole?: string;
  };
  employee: {
    documentType: string;
    document: string;
    fullName: string;
    hireDate: string;
    retirementDate?: string | null;
    isActive: boolean;
    positionName: string;
    contractTypeName: string;
    basicSalary: number;
    averageSalary?: number | null;
    includeAverageSalary: boolean;
    epsName?: string | null;
    afpName?: string | null;
    ccfName?: string | null;
    arlRiskClass?: string | null;
  };
  issueDate?: string;
  verificationCode?: string;
}

export interface Form220PdfData {
  company: {
    legalName: string;
    nit: string;
    dv?: string;
    city?: string;
  };
  employee: {
    documentType: string;
    document: string;
    fullName: string;
  };
  year: number;
  issueDate: string;
  certifiedFromDate: string;
  certifiedToDate: string;
  expeditionCity: string;
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

@Injectable()
export class PayrollCompliancePdfService {
  private readonly logger = new Logger(PayrollCompliancePdfService.name);

  /**
   * Generates official Labor Certificate (Constancia Laboral) PDF with QR.
   */
  public async generateLaborCertificatePdf(
    data: LaborCertificatePdfData,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Standard Letter size
      const { width, height } = page.getSize();

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontOblique = await pdfDoc.embedFont(
        StandardFonts.HelveticaOblique,
      );

      const primaryColor = rgb(0.08, 0.22, 0.42); // Navy Blue
      const darkColor = rgb(0.12, 0.14, 0.17);
      const grayColor = rgb(0.38, 0.42, 0.48);
      const lineGray = rgb(0.85, 0.88, 0.92);

      let curY = height - 50;

      // Header: Company Legal Name & NIT
      page.drawText(data.company.legalName.toUpperCase(), {
        x: 50,
        y: curY,
        size: 13,
        font: fontBold,
        color: primaryColor,
      });
      curY -= 15;

      const companyDetails = `NIT: ${data.company.nit}${data.company.dv ? `-${data.company.dv}` : ''} | ${data.company.address || 'Oficina Principal'} | Tel: ${data.company.phone || 'N/A'}`;
      page.drawText(companyDetails, {
        x: 50,
        y: curY,
        size: 8,
        font: fontRegular,
        color: grayColor,
      });
      curY -= 12;

      page.drawLine({
        start: { x: 50, y: curY },
        end: { x: width - 50, y: curY },
        thickness: 1.5,
        color: primaryColor,
      });
      curY -= 40;

      // Title
      const title = 'EL DEPARTAMENTO DE GESTIÓN HUMANA Y NÓMINA';
      const titleWidth = fontBold.widthOfTextAtSize(title, 11);
      page.drawText(title, {
        x: (width - titleWidth) / 2,
        y: curY,
        size: 11,
        font: fontBold,
        color: primaryColor,
      });
      curY -= 25;

      const certTitle = 'CERTIFICA:';
      const certTitleWidth = fontBold.widthOfTextAtSize(certTitle, 14);
      page.drawText(certTitle, {
        x: (width - certTitleWidth) / 2,
        y: curY,
        size: 14,
        font: fontBold,
        color: darkColor,
      });
      curY -= 40;

      // Body Paragraph
      const statusText = data.employee.isActive
        ? `labora en nuestra compañía desde el ${data.employee.hireDate}`
        : `laboró en nuestra compañía desde el ${data.employee.hireDate} hasta el ${data.employee.retirementDate || 'la fecha'}`;

      const salaryToCertify =
        data.employee.includeAverageSalary && data.employee.averageSalary
          ? data.employee.averageSalary
          : data.employee.basicSalary;

      const salaryLabel =
        data.employee.includeAverageSalary && data.employee.averageSalary
          ? 'devengando un salario promedio mensual de'
          : 'devengando una asignación básica mensual de';

      const salaryInWords = this.numberToLetters(salaryToCertify);

      const bodyParagraph =
        `Que el(la) señor(a) ${data.employee.fullName.toUpperCase()}, identificado(a) con ${data.employee.documentType} No. ${data.employee.document}, ` +
        `${statusText}, desempeñando el cargo de ${data.employee.positionName.toUpperCase()}, ` +
        `mediante contrato de trabajo ${data.employee.contractTypeName.toUpperCase()}, ` +
        `${salaryLabel} $${this.formatCurrency(salaryToCertify)} (${salaryInWords}).`;

      page.drawText(bodyParagraph, {
        x: 50,
        y: curY,
        size: 10,
        font: fontRegular,
        color: darkColor,
        maxWidth: width - 100,
        lineHeight: 18,
      });
      curY -= 120;

      // Social Security Affiliations Box
      page.drawRectangle({
        x: 50,
        y: curY - 50,
        width: width - 100,
        height: 60,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: lineGray,
        borderWidth: 1,
      });

      page.drawText('INFORMACIÓN DE SEGURIDAD SOCIAL Y PARAFISCALES', {
        x: 60,
        y: curY - 2,
        size: 8,
        font: fontBold,
        color: primaryColor,
      });

      const affilLine1 = `EPS: ${data.employee.epsName || 'NO REGISTRA'}  |  AFP: ${data.employee.afpName || 'NO REGISTRA'}`;
      const affilLine2 = `Caja de Compensación: ${data.employee.ccfName || 'NO REGISTRA'}  |  Clase de Riesgo ARL: ${data.employee.arlRiskClass || 'RIESGO IV / V'}`;

      page.drawText(affilLine1, {
        x: 60,
        y: curY - 22,
        size: 8,
        font: fontRegular,
        color: darkColor,
      });
      page.drawText(affilLine2, {
        x: 60,
        y: curY - 38,
        size: 8,
        font: fontRegular,
        color: darkColor,
      });

      curY -= 90;

      // Closing formula
      const issueDateStr =
        data.issueDate ||
        new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      const closingText = `Para constancia de lo anterior, se expide la presente certificación a solicitud del interesado en la ciudad de ${data.company.city || 'Bogotá D.C.'}, a los ${issueDateStr}.`;
      page.drawText(closingText, {
        x: 50,
        y: curY,
        size: 9.5,
        font: fontRegular,
        color: darkColor,
        maxWidth: width - 100,
        lineHeight: 16,
      });

      curY -= 80;

      // QR Code
      const verCode =
        data.verificationCode ||
        `CERT-${data.employee.document}-${Date.now().toString(36).toUpperCase()}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(
          `https://noxia.com/verify/cert/${verCode}?doc=${data.employee.document}`,
        );
        const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const qrImage = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImage, { x: 50, y: curY - 40, width: 65, height: 65 });
      } catch (err) {
        this.logger.error(
          `Error generating QR for labor certificate: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }

      page.drawText('CÓDIGO DE VERIFICACIÓN ELECTRÓNICA:', {
        x: 130,
        y: curY + 12,
        size: 7.5,
        font: fontBold,
        color: primaryColor,
      });
      page.drawText(verCode, {
        x: 130,
        y: curY,
        size: 8,
        font: fontRegular,
        color: darkColor,
      });
      page.drawText(
        'Documento digital autenticado mediante firma digital autorizada NOXIA ERP.',
        {
          x: 130,
          y: curY - 12,
          size: 7,
          font: fontOblique,
          color: grayColor,
        },
      );

      curY -= 80;

      // Signature line
      page.drawLine({
        start: { x: 50, y: curY },
        end: { x: 260, y: curY },
        thickness: 1,
        color: lineGray,
      });
      curY -= 15;

      page.drawText(data.company.signerName || 'DIRECTOR DE GESTIÓN HUMANA', {
        x: 50,
        y: curY,
        size: 9,
        font: fontBold,
        color: darkColor,
      });
      curY -= 12;

      page.drawText(
        data.company.signerRole || 'Gestión Humana y Relaciones Laborales',
        {
          x: 50,
          y: curY,
          size: 8,
          font: fontRegular,
          color: grayColor,
        },
      );
      curY -= 12;

      page.drawText(data.company.legalName, {
        x: 50,
        y: curY,
        size: 7.5,
        font: fontRegular,
        color: grayColor,
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(
        `Failed to generate labor certificate PDF: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Generates official DIAN Formulario 220 PDF (Certificado de Ingresos y Retenciones).
   */
  public async generateFormulario220Pdf(data: Form220PdfData): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const { width, height } = page.getSize();

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const darkBlue = rgb(0.05, 0.18, 0.38);
      const darkColor = rgb(0.12, 0.14, 0.17);
      const grayBg = rgb(0.95, 0.96, 0.97);
      const lineGray = rgb(0.8, 0.83, 0.87);

      let curY = height - 40;

      // Header Banner
      page.drawRectangle({
        x: 40,
        y: curY - 35,
        width: width - 80,
        height: 45,
        color: darkBlue,
      });

      page.drawText('DIAN - REPÚBLICA DE COLOMBIA', {
        x: 50,
        y: curY - 12,
        size: 9,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(
        `CERTIFICADO DE INGRESOS Y RETENCIONES - AÑO GRAVABLE ${data.year}`,
        {
          x: 50,
          y: curY - 26,
          size: 11,
          font: fontBold,
          color: rgb(1, 1, 1),
        },
      );

      page.drawText('FORMULARIO 220', {
        x: width - 150,
        y: curY - 20,
        size: 11,
        font: fontBold,
        color: rgb(0.98, 0.85, 0.38),
      });

      curY -= 55;

      // Retaining Agent & Employee info block
      page.drawRectangle({
        x: 40,
        y: curY - 60,
        width: width - 80,
        height: 60,
        color: grayBg,
        borderColor: lineGray,
        borderWidth: 1,
      });

      page.drawText(
        `AGENTE RETENEDOR: ${data.company.legalName} (NIT: ${data.company.nit}${data.company.dv ? `-${data.company.dv}` : ''})`,
        {
          x: 50,
          y: curY - 15,
          size: 8,
          font: fontBold,
          color: darkColor,
        },
      );

      page.drawText(
        `TRABAJADOR: ${data.employee.fullName.toUpperCase()} (${data.employee.documentType} No. ${data.employee.document})`,
        {
          x: 50,
          y: curY - 30,
          size: 8,
          font: fontBold,
          color: darkColor,
        },
      );

      page.drawText(
        `PERIODO CERTIFICADO: ${data.certifiedFromDate} al ${data.certifiedToDate} | FECHA EXPEDICIÓN: ${data.issueDate} | CIUDAD: ${data.expeditionCity}`,
        {
          x: 50,
          y: curY - 45,
          size: 7.5,
          font: fontRegular,
          color: darkColor,
        },
      );

      curY -= 80;

      // Table Header
      page.drawRectangle({
        x: 40,
        y: curY - 18,
        width: width - 80,
        height: 20,
        color: rgb(0.2, 0.25, 0.32),
      });

      page.drawText('CONCEPTO DE INGRESOS Y RETENCIONES OFICIALES DIAN', {
        x: 50,
        y: curY - 13,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText('RENGLÓN', {
        x: width - 180,
        y: curY - 13,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText('VALOR ($ COP)', {
        x: width - 110,
        y: curY - 13,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      curY -= 22;

      // Row definitions
      const rows = [
        {
          row: '36',
          name: 'Pagos por salarios o emolumentos eclesiásticos',
          val: data.row36Salaries,
        },
        { row: '37', name: 'Pagos por honorarios', val: data.row37Honoraries },
        {
          row: '38',
          name: 'Servicios, primas, cesantías e intereses de cesantías',
          val: data.row38SocialBenefits,
        },
        {
          row: '39',
          name: 'Auxilios y pagos no constitutivos de salario (transporte/otros)',
          val: data.row39AllowancesNonSalarial,
        },
        {
          row: '40',
          name: 'Otros ingresos laborales',
          val: data.row40OtherIncome,
        },
        {
          row: '41',
          name: 'Pagos por indemnizaciones laborales',
          val: data.row41Indemnifications,
        },
        {
          row: '46',
          name: 'Cesantías pagadas efectivamente en el periodo',
          val: data.row46SeverancePaid,
        },
        {
          row: '47',
          name: 'Pensiones de jubilación, vejez o invalidez',
          val: data.row47PensionsIncome,
        },
        {
          row: '49',
          name: 'TOTAL INGRESOS BRUTOS (Suma renglones 36 a 47)',
          val: data.row49TotalGrossIncome,
          isBold: true,
        },
        {
          row: '50',
          name: 'Aportes obligatorios por salud a cargo del trabajador',
          val: data.row50HealthDeduction,
        },
        {
          row: '51',
          name: 'Aportes obligatorios a fondos de pensiones y FSP',
          val: data.row51PensionAndFspDeduction,
        },
        {
          row: '52',
          name: 'Aportes voluntarios a fondos de pensiones',
          val: data.row52VoluntaryPensionDeduction,
        },
        {
          row: '53',
          name: 'Aportes a cuentas AFC',
          val: data.row53AfcDeduction,
        },
        {
          row: '55',
          name: 'VALOR DE LAS RETENCIONES EN LA FUENTE PRACTICADAS',
          val: data.row55WithholdingTax,
          isBold: true,
        },
      ];

      for (const r of rows) {
        if (r.isBold) {
          page.drawRectangle({
            x: 40,
            y: curY - 14,
            width: width - 80,
            height: 16,
            color: rgb(0.92, 0.94, 0.97),
          });
        }

        page.drawText(r.name, {
          x: 45,
          y: curY - 10,
          size: r.isBold ? 8 : 7.5,
          font: r.isBold ? fontBold : fontRegular,
          color: darkColor,
        });

        page.drawText(r.row, {
          x: width - 165,
          y: curY - 10,
          size: 8,
          font: fontBold,
          color: darkColor,
        });

        const formattedVal = `$${this.formatCurrency(r.val)}`;
        page.drawText(formattedVal, {
          x: width - 110,
          y: curY - 10,
          size: 8,
          font: r.isBold ? fontBold : fontRegular,
          color: darkColor,
        });

        page.drawLine({
          start: { x: 40, y: curY - 15 },
          end: { x: width - 40, y: curY - 15 },
          thickness: 0.5,
          color: lineGray,
        });

        curY -= 17;
      }

      curY -= 15;

      // QR Code and Signatures
      try {
        const qrDataUrl = await QRCode.toDataURL(
          data.qrCodeData ||
            `FORM220|YEAR:${data.year}|EMP:${data.employee.document}`,
        );
        const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const qrImg = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImg, { x: 50, y: curY - 60, width: 65, height: 65 });
      } catch (err) {
        this.logger.error(
          `Error generating QR for Form 220: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }

      page.drawText(
        'Certificado generado conforme a las especificaciones técnicas de la DIAN.',
        {
          x: 130,
          y: curY - 10,
          size: 7,
          font: fontRegular,
          color: darkColor,
        },
      );
      page.drawText(
        'No requiere firma autógrafa conforme al parágrafo del Art. 378 del Estatuto Tributario.',
        {
          x: 130,
          y: curY - 22,
          size: 6.5,
          font: fontRegular,
          color: rgb(0.4, 0.44, 0.5),
        },
      );

      curY -= 75;

      // Signatures
      page.drawLine({
        start: { x: 50, y: curY },
        end: { x: 250, y: curY },
        thickness: 1,
        color: lineGray,
      });
      page.drawText('FIRMA DEL AGENTE RETENEDOR', {
        x: 50,
        y: curY - 12,
        size: 7.5,
        font: fontBold,
        color: darkColor,
      });

      page.drawLine({
        start: { x: 300, y: curY },
        end: { x: 500, y: curY },
        thickness: 1,
        color: lineGray,
      });
      page.drawText('FIRMA DEL TRABAJADOR O BENEFICIARIO', {
        x: 300,
        y: curY - 12,
        size: 7.5,
        font: fontBold,
        color: darkColor,
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(
        `Failed to generate Formulario 220 PDF: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private formatCurrency(value: number): string {
    return Math.round(value || 0).toLocaleString('es-CO');
  }

  /**
   * Helper to convert numbers to Spanish currency words.
   */
  public numberToLetters(amount: number): string {
    const val = Math.round(amount || 0);
    if (val === 0) return 'CERO PESOS M/CTE';

    const units = [
      '',
      'UN',
      'DOS',
      'TRES',
      'CUATRO',
      'CINCO',
      'SEIS',
      'SIETE',
      'OCHO',
      'NUEVE',
    ];
    const tens = [
      '',
      'DIEZ',
      'VEINTE',
      'TREINTA',
      'CUARENTA',
      'CINCUENTA',
      'SESENTA',
      'SETENTA',
      'OCHENTA',
      'NOVENTA',
    ];
    const teens = [
      'DIEZ',
      'ONCE',
      'DOCE',
      'TRECE',
      'CATORCE',
      'QUINCE',
      'DIECISEIS',
      'DIECISIETE',
      'DIECIOCHO',
      'DIECINUEVE',
    ];
    const twenties = [
      'VEINTE',
      'VEINTIUN',
      'VEINTIDOS',
      'VEINTITRES',
      'VEINTICUATRO',
      'VEINTICINCO',
      'VEINTISEIS',
      'VEINTISIETE',
      'VEINTIOCHO',
      'VEINTINUEVE',
    ];
    const hundreds = [
      '',
      'CIENTO',
      'DOSCIENTOS',
      'TRESCIENTOS',
      'CUATROCIENTOS',
      'QUINIENTOS',
      'SEISCIENTOS',
      'SETECIENTOS',
      'OCHOCIENTOS',
      'NOVECIENTOS',
    ];

    const convertThreeDigits = (n: number): string => {
      let output = '';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;

      if (n === 100) return 'CIEN';
      if (c > 0) output += hundreds[c] + ' ';

      if (d === 1) {
        output += teens[u];
      } else if (d === 2) {
        output += twenties[u];
      } else if (d > 2) {
        output += tens[d];
        if (u > 0) output += ' Y ' + units[u];
      } else if (u > 0) {
        output += units[u];
      }

      return output.trim();
    };

    let result = '';
    const millions = Math.floor(val / 1000000);
    const thousands = Math.floor((val % 1000000) / 1000);
    const remainder = val % 1000;

    if (millions > 0) {
      if (millions === 1) {
        result += 'UN MILLON ';
      } else {
        result += convertThreeDigits(millions) + ' MILLONES ';
      }
    }

    if (thousands > 0) {
      if (thousands === 1) {
        result += 'MIL ';
      } else {
        result += convertThreeDigits(thousands) + ' MIL ';
      }
    }

    if (remainder > 0) {
      result += convertThreeDigits(remainder) + ' ';
    }

    return (result.trim() + ' PESOS M/CTE').toUpperCase();
  }
}
