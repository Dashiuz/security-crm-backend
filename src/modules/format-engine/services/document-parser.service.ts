import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as ExcelJS from 'exceljs';

export interface ParseResult {
  html: string;
  detectedVariables: string[];
  originalType: 'DOCX' | 'XLSX' | 'UNKNOWN';
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);
  private readonly variableRegex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

  /**
   * Procesa un archivo en memoria (.docx o .xlsx) y lo convierte a HTML semántico compatible con TipTap.
   * El buffer original es consumido y no se almacena en disco ni en AWS S3 (Parse & Drop).
   */
  async parseFileBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType?: string,
  ): Promise<ParseResult> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('El archivo subido está vacío.');
    }

    const lowerName = (fileName || '').toLowerCase();
    const isDocx =
      lowerName.endsWith('.docx') ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isXlsx =
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls') ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (isDocx) {
      return this.parseDocx(buffer);
    } else if (isXlsx) {
      return this.parseXlsx(buffer);
    } else {
      throw new BadRequestException(
        'Formato no soportado. Debe ser un archivo de Microsoft Word (.docx) o Excel (.xlsx).',
      );
    }
  }

  /**
   * Convierte un documento Word (.docx) en memoria a HTML estructurado con tablas.
   */
  private async parseDocx(buffer: Buffer): Promise<ParseResult> {
    try {
      const options = {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          'table => table.noxia-table:fresh',
        ],
      };

      const result = await mammoth.convertToHtml({ buffer }, options);
      let rawHtml = result.value || '';

      // Normalizar cualquier {token} o [token] a {{token}}
      rawHtml = this.normalizeTagsToMustache(rawHtml);

      const detectedVariables = this.extractVariables(rawHtml);

      return {
        html: rawHtml,
        detectedVariables,
        originalType: 'DOCX',
      };
    } catch (error: any) {
      this.logger.error(
        `Error parseando archivo Word (.docx): ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `No fue posible procesar el archivo Word. Asegúrese de que no esté protegido con contraseña o dañado.`,
      );
    }
  }

  /**
   * Convierte una hoja de cálculo Excel (.xlsx) en memoria a una tabla HTML estructurada.
   */
  private async parseXlsx(buffer: Buffer): Promise<ParseResult> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      let fullHtml = '';
      const allDetected: Set<string> = new Set();

      workbook.eachSheet((worksheet) => {
        let sheetHtml = `<div class="noxia-sheet"><h3 style="margin-bottom: 8px;">${worksheet.name}</h3>`;
        sheetHtml += `<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 16px;"><tbody>`;

        worksheet.eachRow({ includeEmpty: false }, (row) => {
          sheetHtml += '<tr>';
          row.eachCell({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value;
            let strVal = '';
            if (cellValue !== null && cellValue !== undefined) {
              if (typeof cellValue === 'object') {
                if (cellValue instanceof Date) {
                  strVal = cellValue.toISOString();
                } else if ('result' in (cellValue as any)) {
                  const res = (cellValue as any).result;
                  strVal = res !== null && res !== undefined ? String(res) : '';
                } else if ('text' in (cellValue as any)) {
                  const txt = (cellValue as any).text;
                  strVal = txt !== null && txt !== undefined ? String(txt) : '';
                } else if (
                  'richText' in (cellValue as any) &&
                  Array.isArray((cellValue as any).richText)
                ) {
                  strVal = (cellValue as any).richText
                    .map((rt: any) => rt.text || '')
                    .join('');
                } else {
                  strVal = JSON.stringify(cellValue);
                }
              } else {
                strVal = String(cellValue);
              }
            }

            const normalized = this.normalizeTagsToMustache(strVal);

            const isHeader = cell.font?.bold || row.number === 1;
            const tag = isHeader ? 'th' : 'td';
            const bg =
              cell.fill && 'fgColor' in (cell.fill as any)
                ? '#f8fafc'
                : 'inherit';

            sheetHtml += `<${tag} style="padding: 6px 10px; border: 1px solid #cbd5e1; background-color: ${bg};">${normalized || '&nbsp;'}</${tag}>`;
          });
          sheetHtml += '</tr>';
        });

        sheetHtml += `</tbody></table></div>`;
        fullHtml += sheetHtml;
      });

      const detected = this.extractVariables(fullHtml);
      detected.forEach((v) => allDetected.add(v));

      return {
        html: fullHtml,
        detectedVariables: Array.from(allDetected),
        originalType: 'XLSX',
      };
    } catch (error: any) {
      this.logger.error(
        `Error parseando archivo Excel (.xlsx): ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `No fue posible procesar el archivo Excel. Asegúrese de que sea un archivo .xlsx válido.`,
      );
    }
  }

  /**
   * Normaliza etiquetas estilo {variable} o [variable] a sintaxis estándar {{variable}}
   */
  private normalizeTagsToMustache(text: string): string {
    if (!text) return '';
    // Reemplaza {variable} con {{variable}} si no tiene ya doble llave
    let res = text.replace(/(?<!\{)\{([a-zA-Z0-9_.]+)\}(?!\})/g, '{{$1}}');
    // Reemplaza [variable] con {{variable}}
    res = res.replace(/\[([a-zA-Z0-9_.]+)\]/g, '{{$1}}');
    return res;
  }

  /**
   * Extrae todas las variables únicas con sintaxis {{variable}} de un texto HTML
   */
  extractVariables(template: string): string[] {
    if (!template) return [];
    const matches = new Set<string>();
    let match: RegExpExecArray | null;

    this.variableRegex.lastIndex = 0;
    while ((match = this.variableRegex.exec(template)) !== null) {
      matches.add(match[1]);
    }

    return Array.from(matches);
  }
}
