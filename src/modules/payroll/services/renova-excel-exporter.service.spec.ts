import {
  RenovaExcelExporterService,
  RenovaExportItem,
} from './renova-excel-exporter.service';
import * as ExcelJS from 'exceljs';

describe('RenovaExcelExporterService', () => {
  let service: RenovaExcelExporterService;

  beforeEach(() => {
    service = new RenovaExcelExporterService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a valid excel workbook buffer with correct sheets and headers', async () => {
    const mockItems: RenovaExportItem[] = [
      {
        companyNit: '900123456',
        companyName: 'SEGURIDAD EXPLORER LTDA',
        documentType: 'CC',
        document: '1018456789',
        lastName: 'PEREZ',
        maternalSurname: 'GOMEZ',
        firstName: 'JUAN',
        secondName: 'CARLOS',
        gender: 'M',
        birthdate: '1990-05-15',
        entryDate: '2024-01-10',
        daneCityCode: '11001',
        daneCityName: 'BOGOTÁ D.C.',
        dependencyName: 'EDIFICIO HORIZONTE',
        svspCourseCode: '1101',
        svspCourseName: 'FUNDAMENTACION VIGILANCIA',
        academyNit: '800555444',
        academyName: 'ACADEMIA NACIONAL DE SEGURIDAD',
        nroCode: 'NRO-2026-1018456789',
        issueDate: '2026-01-15',
        expiryDate: '2027-01-15',
        status: 'VIGENTE',
      },
      {
        companyNit: '900123456',
        companyName: 'SEGURIDAD EXPLORER LTDA',
        documentType: 'CC',
        document: '1020333444',
        lastName: 'RODRIGUEZ',
        maternalSurname: '',
        firstName: 'ANDRES',
        secondName: '',
        gender: 'M',
        birthdate: '1988-11-20',
        entryDate: '2023-08-01',
        daneCityCode: '11001',
        daneCityName: 'BOGOTÁ D.C.',
        dependencyName: 'DISPONIBLE',
        svspCourseCode: '1201',
        svspCourseName: 'REENTRENAMIENTO VIGILANCIA',
        academyNit: '800555444',
        academyName: 'ACADEMIA NACIONAL DE SEGURIDAD',
        nroCode: 'NRO-2025-1020333444',
        issueDate: '2025-10-01',
        expiryDate: '2026-10-01',
        status: 'POR VENCER',
      },
      {
        companyNit: '900123456',
        companyName: 'SEGURIDAD EXPLORER LTDA',
        documentType: 'CC',
        document: '52444555',
        lastName: 'TORRES',
        maternalSurname: 'SILVA',
        firstName: 'MARIA',
        secondName: '',
        gender: 'F',
        birthdate: '1992-03-10',
        entryDate: '2025-02-01',
        daneCityCode: '11001',
        daneCityName: 'BOGOTÁ D.C.',
        dependencyName: 'DISPONIBLE',
        svspCourseCode: '',
        svspCourseName: 'SIN CURSO',
        academyNit: '',
        academyName: 'NO REGISTRADA',
        nroCode: '',
        issueDate: '',
        expiryDate: '',
        status: 'SIN CURSO',
      },
    ];

    const buffer = await service.generateRenovaExcelBuffer(
      mockItems,
      'SEGURIDAD EXPLORER LTDA',
      '900123456',
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Validar que el buffer es leíble por exceljs
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet('RENOVA_SVSP');
    expect(worksheet).toBeDefined();

    const titleVal = worksheet?.getCell('A1').text || '';
    expect(titleVal).toContain('SUPERINTENDENCIA DE VIGILANCIA');

    const headersRow = worksheet?.getRow(4);
    expect(headersRow?.getCell(1).value).toBe('NIT_EMPRESA');
    expect(headersRow?.getCell(4).value).toBe('NUMERO_DOCUMENTO');
    expect(headersRow?.getCell(22).value).toBe('ESTADO_VIGENCIA');

    const firstDataRow = worksheet?.getRow(5);
    expect(firstDataRow?.getCell(4).value).toBe('1018456789');
    expect(firstDataRow?.getCell(5).value).toBe('PEREZ');
    expect(firstDataRow?.getCell(22).value).toBe('VIGENTE');
  });

  it('should handle empty export items gracefully', async () => {
    const buffer = await service.generateRenovaExcelBuffer(
      [],
      'EMPRESA VACÍA S.A.S.',
      '900999999',
    );
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
