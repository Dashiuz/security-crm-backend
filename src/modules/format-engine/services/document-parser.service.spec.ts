import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DocumentParserService } from './document-parser.service';
import * as mammoth from 'mammoth';
import * as ExcelJS from 'exceljs';

jest.mock('mammoth');

describe('DocumentParserService', () => {
  let service: DocumentParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentParserService],
    }).compile();

    service = module.get<DocumentParserService>(DocumentParserService);
    jest.clearAllMocks();
  });

  describe('parseFileBuffer validations', () => {
    it('should throw BadRequestException if buffer is empty or null', async () => {
      await expect(
        service.parseFileBuffer(Buffer.from(''), 'test.docx'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if extension is not supported', async () => {
      await expect(
        service.parseFileBuffer(
          Buffer.from('content'),
          'test.pdf',
          'application/pdf',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('parseDocx', () => {
    it('should parse docx buffer into html and detect variables and normalize single brackets', async () => {
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value:
          '<p>Estimado {cliente.nombre}, su factura es [cliente.nit] con total {{total}}</p>',
      });

      const buffer = Buffer.from('fake-docx-content');
      const result = await service.parseFileBuffer(buffer, 'documento.docx');

      expect(result.originalType).toBe('DOCX');
      expect(result.html).toContain('{{cliente.nombre}}');
      expect(result.html).toContain('{{cliente.nit}}');
      expect(result.html).toContain('{{total}}');
      expect(result.detectedVariables).toEqual(
        expect.arrayContaining(['cliente.nombre', 'cliente.nit', 'total']),
      );
    });

    it('should throw BadRequestException if mammoth fails', async () => {
      (mammoth.convertToHtml as jest.Mock).mockRejectedValue(
        new Error('Corrupt file'),
      );

      const buffer = Buffer.from('corrupt-docx');
      await expect(
        service.parseFileBuffer(buffer, 'corrupt.docx'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('parseXlsx', () => {
    it('should parse an xlsx workbook buffer into html tables and extract variables', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Hoja1');
      sheet.addRow(['Columna 1', 'Columna 2']);
      sheet.addRow(['{empresa.nombre}', 50000]);
      sheet.addRow([{ text: 'Detalle: [empresa.nit]' }, { result: 100000 }]);

      const buffer = Buffer.from((await workbook.xlsx.writeBuffer()) as any);

      const result = await service.parseFileBuffer(buffer, 'plantilla.xlsx');

      expect(result.originalType).toBe('XLSX');
      expect(result.html).toContain('Hoja1');
      expect(result.html).toContain('{{empresa.nombre}}');
      expect(result.html).toContain('{{empresa.nit}}');
      expect(result.detectedVariables).toEqual(
        expect.arrayContaining(['empresa.nombre', 'empresa.nit']),
      );
    });

    it('should throw BadRequestException if xlsx load fails', async () => {
      const corruptBuffer = Buffer.from('not an excel file');
      await expect(
        service.parseFileBuffer(corruptBuffer, 'invalid.xlsx'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('extractVariables', () => {
    it('should return empty array for empty or falsy template', () => {
      expect(service.extractVariables('')).toEqual([]);
    });

    it('should extract unique variables from template', () => {
      const html =
        '<p>{{empresa.nit}} y {{empresa.nit}} con {{cliente.razon_social}}</p>';
      const vars = service.extractVariables(html);
      expect(vars).toEqual(['empresa.nit', 'cliente.razon_social']);
    });
  });
});
