import {
  PayrollCompliancePdfService,
  LaborCertificatePdfData,
  Form220PdfData,
} from './payroll-compliance-pdf.service';

describe('PayrollCompliancePdfService', () => {
  let service: PayrollCompliancePdfService;

  beforeEach(() => {
    service = new PayrollCompliancePdfService();
  });

  const sampleLaborCertData: LaborCertificatePdfData = {
    company: {
      legalName: 'SEGURIDAD NOXIA LTDA',
      nit: '900123456',
      dv: '1',
      city: 'Bogotá D.C.',
      address: 'Calle 100 # 15-20',
      phone: '601-3001234',
      signerName: 'DR. ROBERTO GOMEZ',
      signerRole: 'Director de Talento Humano',
    },
    employee: {
      documentType: 'CC',
      document: '1010123456',
      fullName: 'JUAN PEREZ GUARDA',
      hireDate: '15 de enero de 2024',
      retirementDate: null,
      isActive: true,
      positionName: 'Guarda de Seguridad Armado',
      contractTypeName: 'A Término Indefinido',
      basicSalary: 1423500,
      averageSalary: 1850000,
      includeAverageSalary: true,
      epsName: 'Sanitas',
      afpName: 'Porvenir',
      ccfName: 'Compensar',
      arlRiskClass: 'Clase V (Riesgo Máximo)',
    },
    issueDate: '31 de octubre de 2026',
    verificationCode: 'CERT-1010123456-XYZ',
  };

  const sampleForm220Data: Form220PdfData = {
    company: {
      legalName: 'SEGURIDAD NOXIA LTDA',
      nit: '900123456',
      dv: '1',
      city: 'Bogotá D.C.',
    },
    employee: {
      documentType: 'CC',
      document: '1010123456',
      fullName: 'JUAN PEREZ GUARDA',
    },
    year: 2026,
    issueDate: '2027-02-15',
    certifiedFromDate: '2026-01-01',
    certifiedToDate: '2026-12-31',
    expeditionCity: 'BOGOTÁ D.C.',
    row36Salaries: 22000000,
    row37Honoraries: 0,
    row38SocialBenefits: 3500000,
    row39AllowancesNonSalarial: 2400000,
    row40OtherIncome: 500000,
    row41Indemnifications: 0,
    row46SeverancePaid: 1800000,
    row47PensionsIncome: 0,
    row49TotalGrossIncome: 30200000,
    row50HealthDeduction: 880000,
    row51PensionAndFspDeduction: 880000,
    row52VoluntaryPensionDeduction: 0,
    row53AfcDeduction: 0,
    row55WithholdingTax: 320000,
    qrCodeData:
      'NumFormulario=220|AnoGravable=2026|NitAgente=900123456|DocTrabajador=1010123456|ValIngresos=30200000|ValRetencion=320000',
  };

  it('should convert numbers to Colombian Spanish currency words', () => {
    expect(service.numberToLetters(1423500)).toContain(
      'UN MILLON CUATROCIENTOS VEINTITRES MIL QUINIENTOS PESOS M/CTE',
    );
    expect(service.numberToLetters(1000000)).toBe('UN MILLON PESOS M/CTE');
    expect(service.numberToLetters(0)).toBe('CERO PESOS M/CTE');
  });

  it('should generate valid PDF Buffer for Labor Certificate', async () => {
    const pdfBuffer =
      await service.generateLaborCertificatePdf(sampleLaborCertData);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF magic bytes %PDF-
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('should generate valid PDF Buffer for Formulario 220 DIAN', async () => {
    const pdfBuffer = await service.generateFormulario220Pdf(sampleForm220Data);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
