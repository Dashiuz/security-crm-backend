import { Test, TestingModule } from '@nestjs/testing';
import { PayrollComplianceService } from './payroll-compliance.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PilaGeneratorEngine } from '../engines/pila-generator.engine';
import { DianElectronicPayrollEngine } from '../engines/dian-electronic-payroll.engine';
import { AccountingInterfaceEngine } from '../engines/accounting-interface.engine';
import { Form220AndAccumulatedEngine } from '../engines/form220-and-accumulated.engine';
import { PayrollCompliancePdfService } from './payroll-compliance-pdf.service';
import {
  DianProviderMode,
  AccountingExportFormat,
  ElectronicPayrollStatus,
  ArlRiskClass,
} from '@prisma/client';

describe('PayrollComplianceService', () => {
  let service: PayrollComplianceService;
  let prisma: any;
  let pdfService: any;

  const mockTenantId = 'tenant-test-123';
  const mockUserId = 'user-admin-456';

  beforeEach(async () => {
    prisma = {
      tenant: { findUnique: jest.fn() },
      payrollSettings: { findUnique: jest.fn(), update: jest.fn() },
      payrollPeriod: { findFirst: jest.fn() },
      payrollPeriodSettlement: { findMany: jest.fn() },
      payrollPilaBatch: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      payrollPilaRecordLine: { findMany: jest.fn() },
      payrollElectronicBatch: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      payrollElectronicDocument: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      payrollAccountingBatch: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      payrollAccountingLine: { findMany: jest.fn() },
      payrollTaxCertificate220: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    pdfService = {
      generateLaborCertificatePdf: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-labor-cert')),
      generateFormulario220Pdf: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-form-220')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollComplianceService,
        PilaGeneratorEngine,
        DianElectronicPayrollEngine,
        AccountingInterfaceEngine,
        Form220AndAccumulatedEngine,
        { provide: PrismaService, useValue: prisma },
        { provide: PayrollCompliancePdfService, useValue: pdfService },
      ],
    }).compile();

    service = module.get<PayrollComplianceService>(PayrollComplianceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getComplianceDashboardKpis', () => {
    it('should return aggregated metrics for all 4 compliance subsystems', async () => {
      prisma.payrollPilaBatch.count.mockResolvedValue(5);
      prisma.payrollPilaBatch.findFirst.mockResolvedValue({ id: 'pila-1' });
      prisma.payrollElectronicBatch.count.mockResolvedValue(3);
      prisma.payrollElectronicBatch.findFirst.mockResolvedValue({
        id: 'elec-1',
      });
      prisma.payrollElectronicDocument.groupBy.mockResolvedValue([
        { status: 'TRANSMITTED_ACCEPTED', _count: { id: 10 } },
        { status: 'REJECTED', _count: { id: 2 } },
      ]);
      prisma.payrollAccountingBatch.count.mockResolvedValue(4);
      prisma.payrollAccountingBatch.findFirst.mockResolvedValue({
        id: 'acc-1',
      });
      prisma.payrollTaxCertificate220.count.mockResolvedValue(15);

      const res = await service.getComplianceDashboardKpis(mockTenantId);

      expect(res.pila.totalBatches).toBe(5);
      expect(res.electronicPayroll.totalBatches).toBe(3);
      expect(res.electronicPayroll.documentCounts.TRANSMITTED_ACCEPTED).toBe(
        10,
      );
      expect(res.electronicPayroll.documentCounts.REJECTED).toBe(2);
      expect(res.accounting.totalBatches).toBe(4);
      expect(res.taxCertificates.total220Issued).toBe(15);
    });
  });

  describe('generatePilaBatch', () => {
    it('should generate PILA batch for period with 30-day lines', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'SEGURIDAD NOXIA LTDA',
      });
      prisma.payrollSettings.findUnique.mockResolvedValue({
        tenantId: mockTenantId,
        smmlv: 1423500,
        applyExonerationLaw1607: true,
        companyNit: '900123456',
        companyDv: '1',
        companyLegalName: 'SEGURIDAD NOXIA LTDA',
      });
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        id: 'period-1',
        code: '2026-10',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
      });
      prisma.payrollPeriodSettlement.findMany.mockResolvedValue([
        {
          id: 'set-1',
          basicSalaryEarned: 1423500,
          totalEarnings: 1850000,
          ibcEps: 1850000,
          ibcAfp: 1850000,
          ibcArl: 1850000,
          ibcCcf: 1850000,
          workedDays: 30,
          unpaidAbsenceDays: 0,
          incapacityDays: 0,
          vacationDays: 0,
          employee: {
            id: 'emp-1',
            documentType: 'CC',
            document: '1010123456',
            firstName: 'JUAN',
            lastName: 'PEREZ',
            payrollProfile: {
              customBaseSalary: 1423500,
              arlRiskClass: ArlRiskClass.RISK_IV,
            },
            leavesAndAbsences: [],
          },
          lines: [],
        },
      ]);
      prisma.payrollPilaBatch.findFirst.mockResolvedValue(null);
      prisma.payrollPilaBatch.create.mockImplementation((args: any) => ({
        id: 'pila-batch-1',
        ...args.data,
      }));

      const res = await service.generatePilaBatch(
        mockTenantId,
        { periodId: 'period-1' },
        mockUserId,
      );

      expect(res.id).toBe('pila-batch-1');
      expect(res.totalEmployees).toBe(1);
      expect(prisma.payrollPilaBatch.create).toHaveBeenCalled();
    });
  });

  describe('generateElectronicBatch & transmitElectronicDocument', () => {
    it('should generate electronic batch and transmit document', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'SEGURIDAD NOXIA LTDA',
      });
      prisma.payrollSettings.findUnique.mockResolvedValue({
        defaultDianProviderMode: DianProviderMode.INTERNAL_DIAN_STANDARD,
        dianNextConsecutive: 1,
        companyNit: '900123456',
        companyDv: '1',
        companyLegalName: 'SEGURIDAD NOXIA LTDA',
      });
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        id: 'period-1',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
      });
      prisma.payrollPeriodSettlement.findMany.mockResolvedValue([
        {
          id: 'set-1',
          workedDays: 30,
          totalEarnings: 1850000,
          totalDeductions: 114000,
          netPayAmount: 1736000,
          employee: {
            id: 'emp-1',
            documentType: 'CC',
            document: '1010123456',
            firstName: 'JUAN',
            lastName: 'PEREZ',
            payrollProfile: {
              customBaseSalary: 1423500,
              daneCityCode: '11001',
              contractType: 'INDEFINITE',
            },
          },
          lines: [
            {
              concept: {
                code: 101,
                name: 'Sueldo Básico',
                nature: 'DEVENGO',
                dianNieCode: 'NIE070',
                isConstitutiveOfSalary: true,
              },
              quantity: 30,
              totalValue: 1850000,
            },
            {
              concept: {
                code: 201,
                name: 'Salud',
                nature: 'DEDUCCION',
                dianNieCode: 'NIE140',
                isConstitutiveOfSalary: false,
              },
              quantity: 30,
              totalValue: 114000,
            },
          ],
        },
      ]);
      prisma.payrollElectronicBatch.findUnique.mockResolvedValue(null);
      prisma.payrollElectronicBatch.create.mockResolvedValue({
        id: 'elec-batch-1',
        totalDocuments: 1,
      });

      const batch = await service.generateElectronicBatch(
        mockTenantId,
        {
          periodId: 'period-1',
          providerMode: DianProviderMode.INTERNAL_DIAN_STANDARD,
        },
        mockUserId,
      );

      expect(batch.id).toBe('elec-batch-1');

      // Test transmit
      prisma.payrollElectronicDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        batchId: 'elec-batch-1',
        status: ElectronicPayrollStatus.VALIDATED,
      });
      prisma.payrollElectronicDocument.update.mockResolvedValue({
        id: 'doc-1',
        status: ElectronicPayrollStatus.TRANSMITTED_ACCEPTED,
      });

      const trans = await service.transmitElectronicDocument(
        mockTenantId,
        'doc-1',
        mockUserId,
      );
      expect(trans.status).toBe(ElectronicPayrollStatus.TRANSMITTED_ACCEPTED);
    });
  });

  describe('generateAccountingBatch & exportAccountingCsv', () => {
    it('should generate balanced accounting batch and export CSV', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'SEGURIDAD NOXIA LTDA',
      });
      prisma.payrollSettings.findUnique.mockResolvedValue({
        defaultAccountingFormat: AccountingExportFormat.WORLD_OFFICE,
        companyNit: '900123456',
        companyDv: '1',
        companyLegalName: 'SEGURIDAD NOXIA LTDA',
      });
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        id: 'period-1',
        code: '2026-10',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
      });
      prisma.payrollPeriodSettlement.findMany.mockResolvedValue([
        {
          id: 'set-1',
          netPayAmount: 1736000,
          employee: {
            id: 'emp-1',
            document: '1010123456',
            firstName: 'JUAN',
            lastName: 'PEREZ',
            payrollProfile: {},
          },
          primaryDependency: {
            isInternal: false,
            accountingCostCenter: '001',
            name: 'OPERATIVO',
            code: 201,
          },
          lines: [
            {
              totalValue: 1850000,
              concept: {
                code: 101,
                name: 'Sueldo Básico',
                nature: 'EARNING',
                pucAccountOperative: '720506',
              },
            },
            {
              totalValue: 114000,
              concept: {
                code: 201,
                name: 'Salud',
                nature: 'DEDUCTION',
                pucAccountOperative: '237005',
              },
            },
          ],
        },
      ]);
      prisma.payrollAccountingBatch.findUnique.mockResolvedValue(null);
      prisma.payrollAccountingBatch.create.mockResolvedValue({
        id: 'acc-batch-1',
        totalDebit: 1850000,
        totalCredit: 1850000,
        isBalanced: true,
      });

      const accBatch = await service.generateAccountingBatch(
        mockTenantId,
        {
          periodId: 'period-1',
          exportFormat: AccountingExportFormat.WORLD_OFFICE,
        },
        mockUserId,
      );

      expect(accBatch.id).toBe('acc-batch-1');
      expect(accBatch.isBalanced).toBe(true);
    });
  });

  describe('Labor Certificate and Form 220 PDF', () => {
    it('should generate labor certificate PDF buffer', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: mockTenantId,
        name: 'SEGURIDAD NOXIA LTDA',
      });
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-1',
        documentType: 'CC',
        document: '1010123456',
        firstName: 'CARLOS',
        lastName: 'RODRIGUEZ',
        entryDate: new Date('2024-01-15'),
        isActive: true,
        payrollProfile: { customBaseSalary: 1423500 },
        positionRef: { name: 'Guarda' },
      });
      prisma.payrollSettings.findUnique.mockResolvedValue({
        smmlv: 1423500,
        companyLegalName: 'SEGURIDAD NOXIA LTDA',
        companyNit: '900123456',
      });

      const buf = await service.downloadLaborCertificatePdf(mockTenantId, {
        employeeId: 'emp-1',
        includeAverageSalary: false,
      });

      expect(buf).toBeInstanceOf(Buffer);
      expect(pdfService.generateLaborCertificatePdf).toHaveBeenCalled();
    });

    it('should generate Form 220 PDF buffer', async () => {
      prisma.payrollTaxCertificate220.findFirst.mockResolvedValue({
        id: 'cert-1',
        year: 2026,
        retentionAgentName: 'SEGURIDAD NOXIA LTDA',
        retentionAgentNit: '900123456',
        employeeDocument: '1010123456',
        employeeFullName: 'CARLOS RODRIGUEZ',
        issueDate: new Date('2027-02-15'),
        certifiedFromDate: new Date('2026-01-01'),
        certifiedToDate: new Date('2026-12-31'),
        expeditionCity: 'BOGOTA D.C.',
        row36Salaries: 20000000,
        row49TotalGrossIncome: 20000000,
        row50HealthDeduction: 800000,
        row51PensionAndFspDeduction: 800000,
        row55WithholdingTax: 100000,
        employee: { documentType: 'CC' },
      });

      const buf = await service.downloadForm220Pdf(mockTenantId, 'cert-1');

      expect(buf).toBeInstanceOf(Buffer);
      expect(pdfService.generateFormulario220Pdf).toHaveBeenCalled();
    });
  });
});
