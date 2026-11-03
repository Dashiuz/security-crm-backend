import { Test, TestingModule } from '@nestjs/testing';
import { PayrollComplianceController } from './payroll-compliance.controller';
import { PayrollComplianceService } from '../services/payroll-compliance.service';
import {
  DianProviderMode,
  AccountingExportFormat,
  ElectronicDocumentType,
} from '@prisma/client';

describe('PayrollComplianceController', () => {
  let controller: PayrollComplianceController;
  let service: any;

  const mockReq = {
    user: {
      tenantId: 'tenant-123',
      sub: 'user-456',
    },
  };

  beforeEach(async () => {
    service = {
      getComplianceDashboardKpis: jest
        .fn()
        .mockResolvedValue({ pila: {}, electronicPayroll: {} }),
      generatePilaBatch: jest.fn().mockResolvedValue({ id: 'pila-1' }),
      getPilaBatch: jest.fn().mockResolvedValue({ id: 'pila-1', lines: [] }),
      exportPilaFlatFile: jest
        .fn()
        .mockResolvedValue({ fileName: 'PILA.txt', content: '01HEADER' }),
      exportPilaAuditCsv: jest
        .fn()
        .mockResolvedValue({ fileName: 'PILA.csv', content: 'COL1,COL2' }),
      generateElectronicBatch: jest.fn().mockResolvedValue({ id: 'elec-1' }),
      getElectronicBatch: jest
        .fn()
        .mockResolvedValue({ id: 'elec-1', documents: [] }),
      transmitElectronicDocument: jest
        .fn()
        .mockResolvedValue({ id: 'doc-1', status: 'TRANSMITTED_ACCEPTED' }),
      transmitAllElectronicBatch: jest
        .fn()
        .mockResolvedValue({ id: 'elec-1', status: 'TRANSMITTED_ACCEPTED' }),
      createAdjustmentNote: jest.fn().mockResolvedValue({ id: 'adj-1' }),
      generateAccountingBatch: jest
        .fn()
        .mockResolvedValue({ id: 'acc-1', isBalanced: true }),
      getAccountingBatch: jest
        .fn()
        .mockResolvedValue({ id: 'acc-1', lines: [] }),
      exportAccountingCsv: jest
        .fn()
        .mockResolvedValue({ fileName: 'WO.csv', content: 'COL1;COL2' }),
      generateForm220Certificates: jest
        .fn()
        .mockResolvedValue([{ id: 'cert-1' }]),
      getForm220Certificates: jest.fn().mockResolvedValue([{ id: 'cert-1' }]),
      downloadForm220Pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-220')),
      downloadLaborCertificatePdf: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-labor')),
      getAnnualAccumulatedReport: jest
        .fn()
        .mockResolvedValue({ year: 2026, employees: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollComplianceController],
      providers: [
        {
          provide: PayrollComplianceService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<PayrollComplianceController>(
      PayrollComplianceController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getComplianceDashboardKpis with tenantId', async () => {
    await controller.getDashboardKpis(mockReq);
    expect(service.getComplianceDashboardKpis).toHaveBeenCalledWith(
      'tenant-123',
    );
  });

  it('should call generatePilaBatch with tenantId, dto and sub', async () => {
    const dto = { periodId: 'p-1' };
    await controller.generatePilaBatch(mockReq, dto);
    expect(service.generatePilaBatch).toHaveBeenCalledWith(
      'tenant-123',
      dto,
      'user-456',
    );
  });

  it('should call exportPilaFlatFile and set headers on response', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    await controller.exportPilaFlatFile(mockReq, mockRes, 'pila-1');
    expect(service.exportPilaFlatFile).toHaveBeenCalledWith(
      'tenant-123',
      'pila-1',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; charset=utf-8',
    );
    expect(mockRes.end).toHaveBeenCalledWith('01HEADER');
  });

  it('should call generateElectronicBatch', async () => {
    const dto = { periodId: 'p-1', providerMode: DianProviderMode.DATAICO };
    await controller.generateElectronicBatch(mockReq, dto);
    expect(service.generateElectronicBatch).toHaveBeenCalledWith(
      'tenant-123',
      dto,
      'user-456',
    );
  });

  it('should call transmitElectronicDocument', async () => {
    await controller.transmitElectronicDocument(mockReq, 'doc-1');
    expect(service.transmitElectronicDocument).toHaveBeenCalledWith(
      'tenant-123',
      'doc-1',
      'user-456',
    );
  });

  it('should call createAdjustmentNote', async () => {
    const dto = {
      documentType: ElectronicDocumentType.ADJUSTMENT_NOTE_REPLACE,
      reason: 'Ajuste de días laborados',
    };
    await controller.createAdjustmentNote(mockReq, 'doc-1', dto);
    expect(service.createAdjustmentNote).toHaveBeenCalledWith(
      'tenant-123',
      'doc-1',
      dto,
      'user-456',
    );
  });

  it('should call generateAccountingBatch', async () => {
    const dto = {
      periodId: 'p-1',
      exportFormat: AccountingExportFormat.HELISA,
    };
    await controller.generateAccountingBatch(mockReq, dto);
    expect(service.generateAccountingBatch).toHaveBeenCalledWith(
      'tenant-123',
      dto,
      'user-456',
    );
  });

  it('should call downloadLaborCertificatePdf and return pdf buffer', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    const dto = { employeeId: 'emp-1', includeAverageSalary: true };
    await controller.downloadLaborCertificatePdf(mockReq, mockRes, dto);
    expect(service.downloadLaborCertificatePdf).toHaveBeenCalledWith(
      'tenant-123',
      dto,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(mockRes.end).toHaveBeenCalled();
  });
});
