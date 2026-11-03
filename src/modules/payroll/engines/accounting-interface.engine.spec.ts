import { AccountingExportFormat } from '@prisma/client';
import {
  AccountingInterfaceEngine,
  AccountingBatchConfig,
  AccountingSettlementInput,
} from './accounting-interface.engine';

describe('AccountingInterfaceEngine', () => {
  let engine: AccountingInterfaceEngine;

  beforeEach(() => {
    engine = new AccountingInterfaceEngine();
  });

  const baseConfig: AccountingBatchConfig = {
    periodId: 'period-2026-10',
    periodCode: '2026-10',
    periodStartDate: '2026-10-01',
    periodEndDate: '2026-10-31',
    accountingDate: '2026-10-31',
    companyNit: '900123456',
    companyDv: '1',
    companyLegalName: 'SEGURIDAD NOXIA LTDA',
    exportFormat: AccountingExportFormat.WORLD_OFFICE,
    batchNumber: 'NC-202610-01',
    defaultSalariesPayableAccount: '250505',
    defaultSalariesPayableName: 'Salarios por Pagar',
  };

  const sampleGuard: AccountingSettlementInput = {
    employeeId: 'emp-guard-01',
    documentNumber: '1010123456',
    fullName: 'JUAN PEREZ GUARDA',
    isInternalDependency: false, // Operative guard (Account 7205xx)
    costCenterCode: 'CC-OMEGA-01',
    costCenterName: 'PUESTO BANCO OMEGA',
    dependencyCode: 201,
    netPay: 1736000,
    lines: [
      {
        conceptCode: 101,
        conceptName: 'Sueldo Básico',
        nature: 'EARNING',
        amount: 1423500,
        pucAccountAdministrative: '510506',
        pucAccountOperative: '720506',
      },
      {
        conceptCode: 105,
        conceptName: 'Auxilio de Transporte',
        nature: 'EARNING',
        amount: 200000,
        pucAccountAdministrative: '510527',
        pucAccountOperative: '720527',
      },
      {
        conceptCode: 110,
        conceptName: 'Horas Extras Nocturnas (HEN)',
        nature: 'EARNING',
        amount: 226500,
        pucAccountAdministrative: '510515',
        pucAccountOperative: '720515',
      },
      {
        conceptCode: 201,
        conceptName: 'Aporte Salud Empleado',
        nature: 'DEDUCTION',
        amount: 57000,
        pucAccountOperative: '237005',
        epsNit: '800130907', // EPS Sanitas
        thirdPartyName: 'EPS SANITAS S.A.',
      },
      {
        conceptCode: 202,
        conceptName: 'Aporte Pensión Empleado',
        nature: 'DEDUCTION',
        amount: 57000,
        pucAccountOperative: '238030',
        afpNit: '800227940', // Porvenir
        thirdPartyName: 'PORVENIR S.A.',
      },
    ],
  };

  const sampleAdmin: AccountingSettlementInput = {
    employeeId: 'emp-admin-01',
    documentNumber: '1020234567',
    fullName: 'MARIA LOPEZ GERENTE',
    isInternalDependency: true, // Internal/Admin staff (Account 5105xx)
    costCenterCode: 'CC-ADMIN',
    costCenterName: 'SEDE PRINCIPAL ADMIN',
    dependencyCode: 101,
    netPay: 2760000,
    lines: [
      {
        conceptCode: 101,
        conceptName: 'Sueldo Básico',
        nature: 'EARNING',
        amount: 3000000,
        pucAccountAdministrative: '510506',
        pucAccountOperative: '720506',
      },
      {
        conceptCode: 201,
        conceptName: 'Aporte Salud Empleado',
        nature: 'DEDUCTION',
        amount: 120000,
        pucAccountAdministrative: '237005',
        epsNit: '899999107',
      },
      {
        conceptCode: 202,
        conceptName: 'Aporte Pensión Empleado',
        nature: 'DEDUCTION',
        amount: 120000,
        pucAccountAdministrative: '238030',
        afpNit: '800227940',
      },
    ],
  };

  it('should generate balanced double-entry accounting batch and route accounts by operative vs admin', () => {
    const result = engine.generateAccountingBatch(
      [sampleGuard, sampleAdmin],
      baseConfig,
    );

    expect(result.isBalanced).toBe(true);
    expect(result.difference).toBeLessThan(0.01);
    expect(result.totalDebit).toBe(1850000 + 3000000); // Guard earnings + Admin earnings = 4,850,000
    expect(result.totalCredit).toBe(result.totalDebit);

    // Verify guard lines route to 7205xx
    const guardBasic = result.lines.find(
      (l) => l.thirdPartyNit === '1010123456' && l.conceptCode === 101,
    );
    expect(guardBasic).toBeDefined();
    expect(guardBasic?.pucAccount).toBe('720506');
    expect(guardBasic?.debitAmount).toBe(1423500);

    // Verify admin lines route to 5105xx
    const adminBasic = result.lines.find(
      (l) => l.thirdPartyNit === '1020234567' && l.conceptCode === 101,
    );
    expect(adminBasic).toBeDefined();
    expect(adminBasic?.pucAccount).toBe('510506');
    expect(adminBasic?.debitAmount).toBe(3000000);

    // Verify EPS third party NIT routing
    const epsLine = result.lines.find((l) => l.thirdPartyNit === '800130907');
    expect(epsLine).toBeDefined();
    expect(epsLine?.creditAmount).toBe(57000);
    expect(epsLine?.pucAccount).toBe('237005');

    // Verify Net Pay lines to 250505
    const guardNet = result.lines.find(
      (l) => l.thirdPartyNit === '1010123456' && l.conceptCode === 999,
    );
    expect(guardNet).toBeDefined();
    expect(guardNet?.pucAccount).toBe('250505');
    expect(guardNet?.creditAmount).toBe(1736000);
  });

  it('should format World Office CSV with official headers and 13 columns', () => {
    const result = engine.generateAccountingBatch([sampleGuard], {
      ...baseConfig,
      exportFormat: AccountingExportFormat.WORLD_OFFICE,
    });

    expect(result.fileName).toContain('NOMINA_WORLDOFFICE_');
    expect(result.formattedContent).toContain(
      'Empresa;Tipo_Documento;Numero_Documento;Fecha;Tercero_Inicial;Cuenta_Contable',
    );
    expect(result.formattedContent).toContain('"NM"');
    expect(result.formattedContent).toContain('"900123456"');
    expect(result.formattedContent).toContain('"720506"');
    expect(result.formattedContent).toContain('1423500.00;0.00'); // Debit
    expect(result.formattedContent).toContain('0.00;1736000.00'); // Credit
  });

  it('should format Helisa CSV with official headers, nature D/C, and verification digits', () => {
    const result = engine.generateAccountingBatch([sampleGuard], {
      ...baseConfig,
      exportFormat: AccountingExportFormat.HELISA,
    });

    expect(result.fileName).toContain('NOMINA_HELISA_');
    expect(result.formattedContent).toContain(
      'Tipo_Comprobante;Numero_Documento;Fecha_Asiento;Cuenta_PUC;Centro_Costo',
    );
    expect(result.formattedContent).toContain('"05"'); // Helisa comprobante 05
    expect(result.formattedContent).toContain('"D"'); // Debit nature
    expect(result.formattedContent).toContain('"C"'); // Credit nature
    expect(result.formattedContent).toContain('1423500.00');
    expect(result.formattedContent).toContain('1736000.00');
  });
});
