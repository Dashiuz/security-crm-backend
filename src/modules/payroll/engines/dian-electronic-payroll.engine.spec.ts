import {
  DianProviderMode,
  DianEnvironmentType,
  ElectronicDocumentType,
  ElectronicPayrollStatus,
} from '@prisma/client';
import {
  DianElectronicPayrollEngine,
  DianCompanyConfig,
  DianEmployeeInput,
} from './dian-electronic-payroll.engine';

describe('DianElectronicPayrollEngine', () => {
  let engine: DianElectronicPayrollEngine;

  beforeEach(() => {
    engine = new DianElectronicPayrollEngine();
  });

  const baseCompanyConfig: DianCompanyConfig = {
    companyNit: '900123456',
    companyDv: '1',
    companyLegalName: 'SEGURIDAD NOXIA LTDA',
    daneCityCode: '001',
    daneDepartmentCode: '11',
    dianPrefix: 'NE',
    dianAdjustmentPrefix: 'NA',
    dianEnvironment: DianEnvironmentType.HABILITACION_2,
    dianSoftwareId: 'soft-123-uuid',
    dianSoftwarePin: '12345',
    year: 2026,
    month: 10,
    periodStartDate: '2026-10-01',
    periodEndDate: '2026-10-31',
  };

  const sampleGuard: DianEmployeeInput = {
    employeeId: 'emp-guard-01',
    documentType: 'CC',
    documentNumber: '1010123456',
    firstName: 'JUAN',
    secondName: 'CARLOS',
    firstLastName: 'LOPEZ',
    secondLastName: 'GARCIA',
    email: 'jclopez@seguridadnoxia.com',
    phone: '3001234567',
    address: 'Calle 100 # 15-20',
    daneDepartmentCode: '11',
    daneCityCode: '001',
    daneCityName: 'BOGOTA D.C.',
    hireDate: '2025-01-15',
    contractType: 'INDEFINITE',
    baseSalary: 1423500,
    isIntegralSalary: false,
    workedDays: 30,
    totalEarnings: 1850000,
    totalDeductions: 114000,
    netPay: 1736000,
    lines: [
      {
        conceptCode: 101,
        conceptName: 'Sueldo Básico',
        nature: 'EARNING',
        dianNieCode: 'NIE070',
        dianNieFieldName: 'Basico',
        quantity: 30,
        totalValue: 1423500,
        isConstitutiveOfSalary: true,
      },
      {
        conceptCode: 105,
        conceptName: 'Auxilio de Transporte',
        nature: 'EARNING',
        dianNieCode: 'NIE072',
        dianNieFieldName: 'Transporte',
        quantity: 30,
        totalValue: 200000,
        isConstitutiveOfSalary: false,
      },
      {
        conceptCode: 110,
        conceptName: 'Horas Extras Nocturnas Ordinarias (HEN)',
        nature: 'EARNING',
        dianNieCode: 'NIE076',
        dianNieFieldName: 'HorasExtras',
        quantity: 12,
        totalValue: 226500,
        isConstitutiveOfSalary: true,
      },
      {
        conceptCode: 201,
        conceptName: 'Aporte Salud Empleado',
        nature: 'DEDUCTION',
        dianNieCode: 'NIE140',
        dianNieFieldName: 'Salud',
        quantity: 30,
        totalValue: 57000,
        isConstitutiveOfSalary: false,
      },
      {
        conceptCode: 202,
        conceptName: 'Aporte Pensión Empleado',
        nature: 'DEDUCTION',
        dianNieCode: 'NIE141',
        dianNieFieldName: 'FondoPension',
        quantity: 30,
        totalValue: 57000,
        isConstitutiveOfSalary: false,
      },
    ],
  };

  it('should generate official UBL 2.1 XML and SHA-384 CUNE for INTERNAL_DIAN_STANDARD', () => {
    const doc = engine.buildIndividualDocument(
      sampleGuard,
      baseCompanyConfig,
      DianProviderMode.INTERNAL_DIAN_STANDARD,
      1001,
    );

    expect(doc.status).toBe(ElectronicPayrollStatus.VALIDATED);
    expect(doc.providerMode).toBe(DianProviderMode.INTERNAL_DIAN_STANDARD);
    expect(doc.documentNumber).toBe('NE-1001');
    expect(doc.cune).toBeDefined();
    expect(doc.cune.length).toBe(96); // SHA-384 hex string length is 96 chars
    expect(doc.qrUrl).toContain(
      'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=',
    );
    expect(doc.xmlContent).toContain('NominaIndividual');
    expect(doc.xmlContent).toContain(
      'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"',
    );
    expect(doc.xmlContent).toContain('<Devengados>');
    expect(doc.xmlContent).toContain('<Deducciones>');
    expect(doc.xmlContent).toContain('1010123456');
    expect(doc.xmlContent).toContain('1850000.00');
    expect(doc.xmlContent).toContain('114000.00');
    expect(doc.xmlContent).toContain('1736000.00');
  });

  it('should generate structured JSON payload compliant with DATAICO API', () => {
    const doc = engine.buildIndividualDocument(
      sampleGuard,
      baseCompanyConfig,
      DianProviderMode.DATAICO,
      1002,
    );

    expect(doc.status).toBe(ElectronicPayrollStatus.VALIDATED);
    expect(doc.providerMode).toBe(DianProviderMode.DATAICO);
    expect(doc.providerPayload).toBeDefined();
    expect(doc.providerPayload.actions.send_dian).toBe(true);
    expect(doc.providerPayload.payroll.number).toBe(1002);
    expect(doc.providerPayload.payroll.prefix).toBe('NE');
    expect(doc.providerPayload.payroll.employee.identification_number).toBe(
      '1010123456',
    );
    expect(doc.providerPayload.payroll.accruals.basic.salary).toBe(1850000);
    expect(doc.providerPayload.payroll.deductions.health.amount).toBe(57000);
  });

  it('should generate structured payload compliant with THE_FACTORY_HKA API', () => {
    const doc = engine.buildIndividualDocument(
      sampleGuard,
      baseCompanyConfig,
      DianProviderMode.THE_FACTORY_HKA,
      1003,
    );

    expect(doc.status).toBe(ElectronicPayrollStatus.VALIDATED);
    expect(doc.providerMode).toBe(DianProviderMode.THE_FACTORY_HKA);
    expect(doc.providerPayload).toBeDefined();
    expect(doc.providerPayload.documento.prefijo).toBe('NE');
    expect(doc.providerPayload.documento.consecutivo).toBe(1003);
    expect(doc.providerPayload.trabajador.numeroDocumento).toBe('1010123456');
    expect(doc.providerPayload.trabajador.sueldo).toBe(1423500);
  });

  it('should reject document if employee has missing required data (e.g. missing document number)', () => {
    const invalidGuard: DianEmployeeInput = {
      ...sampleGuard,
      documentNumber: '',
    };

    const doc = engine.buildIndividualDocument(
      invalidGuard,
      baseCompanyConfig,
      DianProviderMode.INTERNAL_DIAN_STANDARD,
      1004,
    );

    expect(doc.status).toBe(ElectronicPayrollStatus.REJECTED);
    expect(doc.rejectionErrors).toBeDefined();
    expect(doc.rejectionErrors?.length).toBeGreaterThan(0);
    expect(doc.rejectionErrors?.[0]).toContain('documento de identidad');
  });

  it('should support Adjustment Note (Tipo 103 - Reemplazo) referencing predecessor document and CUNE', () => {
    const doc = engine.buildIndividualDocument(
      sampleGuard,
      baseCompanyConfig,
      DianProviderMode.INTERNAL_DIAN_STANDARD,
      201,
      ElectronicDocumentType.ADJUSTMENT_NOTE_REPLACE,
      {
        cune: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
        issueDate: new Date('2026-10-31'),
      },
    );

    expect(doc.documentType).toBe(
      ElectronicDocumentType.ADJUSTMENT_NOTE_REPLACE,
    );
    expect(doc.documentNumber).toBe('NA-201');
    expect(doc.xmlContent).toContain('NominaIndividualDeAjuste');
    expect(doc.xmlContent).toContain(
      'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"',
    );
    expect(doc.xmlContent).toContain('00112233445566778899aabbccddeeff');
  });

  it('should generate complete batch with totals and Excel NIE summary', () => {
    const batch = engine.generateElectronicBatch(
      [sampleGuard],
      baseCompanyConfig,
      DianProviderMode.INTERNAL_DIAN_STANDARD,
      1,
    );

    expect(batch.totalDocuments).toBe(1);
    expect(batch.validatedDocuments).toBe(1);
    expect(batch.rejectedDocuments).toBe(0);
    expect(batch.totalAccrued).toBe(1850000);
    expect(batch.totalDeductions).toBe(114000);
    expect(batch.netAmount).toBe(1736000);
    expect(batch.excelNieSummary.length).toBe(1);
    expect(batch.excelNieSummary[0].documentNumber).toBe('NE-1');
  });
});
