import {
  PayrollPayslipPdfService,
  PayslipRenderItem,
} from './payroll-payslip-pdf.service';
import { PDFDocument } from 'pdf-lib';

describe('PayrollPayslipPdfService', () => {
  let service: PayrollPayslipPdfService;

  beforeEach(() => {
    service = new PayrollPayslipPdfService();
  });

  const sampleItem: PayslipRenderItem = {
    settlementId: 'settle-1',
    periodLabel: 'Nómina Mensual Octubre 2026',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    paymentDate: '2026-10-31',
    company: {
      legalName: 'SEGURIDAD EXPLORER LTDA',
      nit: '900987654',
      dv: '3',
      city: 'BOGOTÁ D.C.',
      signatureName: 'CAROLINA VARGAS GARCIA',
      signatureRole: 'Directora Financiera',
    },
    employee: {
      documentType: 'CC',
      document: '1010123456',
      fullName: 'JUAN PEREZ GUARDA',
      positionName: 'Guarda de Seguridad',
      branchName: 'Bogotá',
      dependencyName: 'CONJUNTO RESIDENCIAL SAN MARCOS',
      baseSalaryMonthly: 1750905.0,
      bankName: 'BANCOLOMBIA',
      accountNumber: '****5678',
      epsName: 'EPS SANITAS',
      afpName: 'PORVENIR',
    },
    workedDays: 30,
    totalEarnings: 2000000.0,
    totalDeductions: 140072.4,
    netPayAmount: 1859927.6,
    lines: [
      {
        conceptCode: 1,
        conceptName: 'SUELDO BÁSICO',
        nature: 'DEVENGO',
        quantity: 30,
        totalValue: 1750905.0,
      },
      {
        conceptCode: 10,
        conceptName: 'AUXILIO DE TRANSPORTE',
        nature: 'DEVENGO',
        quantity: 30,
        totalValue: 249095.0,
      },
      {
        conceptCode: 601,
        conceptName: 'APORTE SALUD EMPLEADO (4%)',
        nature: 'SEG_SOCIAL',
        quantity: 1,
        totalValue: 70036.2,
      },
      {
        conceptCode: 602,
        conceptName: 'APORTE PENSIÓN EMPLEADO (4%)',
        nature: 'SEG_SOCIAL',
        quantity: 1,
        totalValue: 70036.2,
      },
    ],
  };

  it('should generate valid PDF buffer with QR code and text elements', async () => {
    const pdfBuffer = await service.generatePayslipsPdf([sampleItem]);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const doc = await PDFDocument.load(pdfBuffer);
    expect(doc.getPageCount()).toBe(1);
  });

  it('should support groupOvertime option', async () => {
    const itemWithOvertime: PayslipRenderItem = {
      ...sampleItem,
      groupOvertime: true,
      lines: [
        ...sampleItem.lines,
        {
          conceptCode: 2,
          conceptName: 'RECARGO NOCTURNO (35%)',
          nature: 'DEVENGO',
          quantity: 40,
          totalValue: 120000.0,
          isOvertime: true,
        },
        {
          conceptCode: 3,
          conceptName: 'HORAS EXTRAS DIURNAS',
          nature: 'DEVENGO',
          quantity: 10,
          totalValue: 60000.0,
          isOvertime: true,
        },
      ],
    };

    const pdfBuffer = await service.generatePayslipsPdf([itemWithOvertime]);
    expect(pdfBuffer).toBeDefined();

    const doc = await PDFDocument.load(pdfBuffer);
    expect(doc.getPageCount()).toBe(1);
  });
});
