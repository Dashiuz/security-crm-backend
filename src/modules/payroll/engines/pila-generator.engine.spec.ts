import { ArlRiskClass, LeaveAndAbsenceType } from '@prisma/client';
import {
  PilaGeneratorEngine,
  PilaCompanyConfig,
  PilaEmployeeInput,
} from './pila-generator.engine';

describe('PilaGeneratorEngine', () => {
  let engine: PilaGeneratorEngine;

  beforeEach(() => {
    engine = new PilaGeneratorEngine();
  });

  const baseCompanyConfig: PilaCompanyConfig = {
    companyNit: '900123456',
    companyDv: '1',
    companyLegalName: 'SEGURIDAD NOXIA LTDA',
    arlEntityCode: '14-23',
    smmlv: 1423500,
    applyExonerationLaw1607: true,
    year: 2026,
    month: 10,
    operatorName: 'SOI',
  };

  const sampleGuard: PilaEmployeeInput = {
    employeeId: 'emp-101',
    documentType: 'CC',
    documentNumber: '1010123456',
    firstName: 'CARLOS',
    secondName: 'ANDRES',
    firstLastName: 'RODRIGUEZ',
    secondLastName: 'PEREZ',
    daneDepartmentCode: '11',
    daneCityCode: '001',
    contributorType: '01',
    contributorSubtype: '00',
    arlRiskClass: ArlRiskClass.RISK_IV,
    epsCodePlu: 'EPS017',
    afpCodePlu: '230301',
    ccfCodePlu: 'CCF01',
    baseSalaryMonthly: 1423500,
    isIntegralSalary: false,
    totalEarnings: 1850000,
    basicSalaryEarned: 1423500,
    ibcEps: 1850000,
    ibcAfp: 1850000,
    ibcArl: 1850000,
    ibcCcf: 1850000,
    workedDays: 30,
    unpaidAbsenceDays: 0,
    incapacityDays: 0,
    vacationDays: 0,
    leaves: [],
  };

  it('should generate single Tipo 2 line for a regular worker with 30 worked days and apply Ley 1607 exoneration', () => {
    const result = engine.generatePilaBatch([sampleGuard], baseCompanyConfig);

    expect(result.totalLines).toBe(1);
    expect(result.grandTotalAmount).toBeGreaterThan(0);
    expect(result.totalExoneratedLaw1607).toBeGreaterThan(0);

    const line = result.lines[0];
    expect(line.workedDaysHealth).toBe(30);
    expect(line.workedDaysPension).toBe(30);
    expect(line.workedDaysArl).toBe(30);
    expect(line.workedDaysCcf).toBe(30);
    expect(line.isExoneratedLaw1607).toBe(true);
    expect(line.healthEmployerRate).toBe(0);
    expect(line.senaAmount).toBe(0);
    expect(line.icbfAmount).toBe(0);
    expect(line.rawPositionalRecord).toBeDefined();
    expect(line.rawPositionalRecord?.length).toBeGreaterThan(200);
  });

  it('should not apply Ley 1607 exoneration if base salary is >= 10 SMMLV', () => {
    const highEarner: PilaEmployeeInput = {
      ...sampleGuard,
      employeeId: 'emp-boss',
      baseSalaryMonthly: 15000000, // > 10 * 1423500
      totalEarnings: 16000000,
      basicSalaryEarned: 15000000,
      ibcEps: 16000000,
      ibcAfp: 16000000,
      ibcArl: 16000000,
      ibcCcf: 16000000,
    };

    const result = engine.generatePilaBatch([highEarner], baseCompanyConfig);
    const line = result.lines[0];

    expect(line.isExoneratedLaw1607).toBe(false);
    expect(line.healthEmployerRate).toBe(8.5);
    expect(line.senaAmount).toBeGreaterThan(0);
    expect(line.icbfAmount).toBeGreaterThan(0);
  });

  it('should partition into multiple Tipo 2 lines when employee has an incapacity (IGE)', () => {
    const guardWithIncapacity: PilaEmployeeInput = {
      ...sampleGuard,
      workedDays: 25,
      incapacityDays: 5,
      leaves: [
        {
          id: 'leave-1',
          leaveType: LeaveAndAbsenceType.SICK_LEAVE_EG,
          startDate: '2026-10-10',
          endDate: '2026-10-14',
          totalDays: 5,
        },
      ],
    };

    const result = engine.generatePilaBatch(
      [guardWithIncapacity],
      baseCompanyConfig,
    );

    expect(result.totalLines).toBe(2);
    const regularLine = result.lines[0];
    const leaveLine = result.lines[1];

    expect(regularLine.workedDaysHealth).toBe(25);
    expect(leaveLine.workedDaysHealth).toBe(5);
    expect(regularLine.workedDaysHealth + leaveLine.workedDaysHealth).toBe(30);

    expect(leaveLine.isIge).toBe(true);
    expect(leaveLine.arlRatePct).toBe(0); // ARL 0% during non-work incapacity
    expect(leaveLine.arlAmount).toBe(0);
  });

  it('should generate official flat text (.TXT) buffer with header Tipo 1 and lines Tipo 2', () => {
    const result = engine.generatePilaBatch([sampleGuard], baseCompanyConfig);
    const txt = result.txtBuffer;

    expect(txt).toContain('01'); // Tipo 1 header
    expect(txt).toContain('SEGURIDAD NOXIA LTDA');
    expect(txt).toContain('02'); // Tipo 2 line
    expect(txt).toContain('1010123456');
  });

  it('should generate audit CSV buffer', () => {
    const result = engine.generatePilaBatch([sampleGuard], baseCompanyConfig);
    const csv = result.csvSummaryBuffer;

    expect(csv).toContain('SECUENCIA,DOCUMENTO,NOMBRES_APELLIDOS');
    expect(csv).toContain('"CC 1010123456","RODRIGUEZ PEREZ CARLOS ANDRES"');
  });
});
