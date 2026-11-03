import {
  BankAchGeneratorEngine,
  AchBatchGeneratorInput,
} from './bank-ach-generator.engine';

describe('BankAchGeneratorEngine', () => {
  const sampleInput: AchBatchGeneratorInput = {
    company: {
      nit: '900123456',
      dv: '1',
      legalName: 'SEGURIDAD NOXIA LTDA',
    },
    disbursementType: 'PAYROLL_PERIOD',
    year: 2026,
    month: 10,
    exportFormat: 'PAB_BANCOLOMBIA',
    items: [
      {
        employeeId: 'emp-1',
        documentType: 'CC',
        document: '1010123456',
        fullName: 'JUAN PEREZ GUARDA',
        bankCode: '1007',
        bankName: 'BANCOLOMBIA',
        achCode: '007',
        accountType: 'SAVINGS',
        accountNumber: '12345678901',
        netAmount: 1859927.6,
      },
      {
        employeeId: 'emp-2',
        documentType: 'CC',
        document: '1020234567',
        fullName: 'PEDRO GOMEZ SIN CUENTA',
        accountType: 'CASH_OR_CHECK',
        accountNumber: '',
        netAmount: 1750000.0,
      },
    ],
  };

  it('should generate PAB Bancolombia flat text file and separate warnings for cash/missing account', () => {
    const res = BankAchGeneratorEngine.generate(sampleInput);

    expect(res.validRecordsCount).toBe(1);
    expect(res.skippedMissingAccountCount).toBe(1);
    expect(res.fileName).toContain('PAB_BANCOLOMBIA_NOMINA_202610.txt');
    expect(res.fileContent).toContain('1000000900123456'); // Nit pagador
    expect(res.fileContent).toContain('6000001010123456'); // Nit beneficiario
    expect(res.warnings.length).toBe(1);
    expect(res.warnings[0].fullName).toBe('PEDRO GOMEZ SIN CUENTA');
  });

  it('should generate Standard ACH CSV file', () => {
    const res = BankAchGeneratorEngine.generate({
      ...sampleInput,
      exportFormat: 'STANDARD_ACH',
    });

    expect(res.fileName).toContain('DISPERSION_ACH_NOMINA_202610.csv');
    expect(res.fileContent).toContain('TIPO_DOC;DOCUMENTO;EMPLEADO');
    expect(res.fileContent).toContain('CC;1010123456;JUAN PEREZ GUARDA');
  });
});
