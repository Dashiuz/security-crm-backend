import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface RenovaExportItem {
  companyNit: string;
  companyName: string;
  documentType: string;
  document: string;
  lastName: string;
  maternalSurname: string;
  firstName: string;
  secondName: string;
  gender: string;
  birthdate: string;
  entryDate: string;
  daneCityCode: string;
  daneCityName: string;
  dependencyName: string;
  svspCourseCode: string;
  svspCourseName: string;
  academyNit: string;
  academyName: string;
  nroCode: string;
  issueDate: string;
  expiryDate: string;
  status: 'VIGENTE' | 'POR VENCER' | 'VENCIDO' | 'SIN CURSO';
}

@Injectable()
export class RenovaExcelExporterService {
  private readonly logger = new Logger(RenovaExcelExporterService.name);

  async generateRenovaExcelBuffer(
    items: RenovaExportItem[],
    companyLegalName: string,
    companyNit: string,
  ): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'NOXIA ERP - Dirección Financiera y Nómina';
      workbook.lastModifiedBy = 'NOXIA SuperVigilancia Module';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet('RENOVA_SVSP', {
        pageSetup: { orientation: 'landscape', fitToPage: true },
        views: [{ state: 'frozen', ySplit: 4 }],
      });

      // 1. Título y Cabecera Institucional
      worksheet.mergeCells('A1:V1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value =
        'SUPERINTENDENCIA DE VIGILANCIA Y SEGURIDAD PRIVADA — REPORTE RENOVA / APO';
      titleCell.font = {
        name: 'Calibri',
        size: 14,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E1B4B' }, // Deep Violet Dark
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 28;

      worksheet.mergeCells('A2:V2');
      const subCell = worksheet.getCell('A2');
      subCell.value = `EMPRESA: ${companyLegalName.toUpperCase()} | NIT: ${companyNit} | GENERADO: ${new Date().toISOString().split('T')[0]}`;
      subCell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      subCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4C1D95' }, // Violet Accent
      };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      worksheet.addRow([]); // Fila 3 vacía para respiración visual

      // 2. Encabezados Reglamentarios (Fila 4)
      const headers = [
        'NIT_EMPRESA',
        'RAZON_SOCIAL',
        'TIPO_DOCUMENTO',
        'NUMERO_DOCUMENTO',
        'PRIMER_APELLIDO',
        'SEGUNDO_APELLIDO',
        'PRIMER_NOMBRE',
        'SEGUNDO_NOMBRE',
        'GENERO',
        'FECHA_NACIMIENTO',
        'FECHA_VINCULACION',
        'CODIGO_CIUDAD_DANE',
        'CIUDAD_SERVICIO',
        'DEPENDENCIA_PUESTO',
        'CODIGO_CURSO_SVSP',
        'NIVEL_CURSO_SVSP',
        'NIT_ESCUELA_CAPACITACION',
        'NOMBRE_ESCUELA',
        'NRO_REGISTRO_SVSP',
        'FECHA_GRADO_CURSO',
        'FECHA_VENCIMIENTO_CURSO',
        'ESTADO_VIGENCIA',
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = {
          name: 'Calibri',
          size: 9,
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF6D28D9' }, // Royal Violet
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'medium', color: { argb: 'FF4C1D95' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });

      // 3. Filas de Datos
      for (const item of items) {
        const row = worksheet.addRow([
          item.companyNit,
          item.companyName,
          item.documentType,
          item.document,
          item.lastName,
          item.maternalSurname,
          item.firstName,
          item.secondName,
          item.gender,
          item.birthdate,
          item.entryDate,
          item.daneCityCode,
          item.daneCityName,
          item.dependencyName,
          item.svspCourseCode,
          item.svspCourseName,
          item.academyNit,
          item.academyName,
          item.nroCode,
          item.issueDate,
          item.expiryDate,
          item.status,
        ]);

        row.height = 20;

        // Formato tipográfico y celdas
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
            left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          };

          // Alineaciones específicas
          if (
            [1, 3, 4, 9, 10, 11, 12, 15, 17, 19, 20, 21].includes(colNumber)
          ) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (colNumber === 22) {
            // Columna de estado con semáforo
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { name: 'Calibri', size: 9, bold: true };
            if (item.status === 'VIGENTE') {
              cell.font = { ...cell.font, color: { argb: 'FF047857' } }; // Verde
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD1FAE5' },
              };
            } else if (item.status === 'POR VENCER') {
              cell.font = { ...cell.font, color: { argb: 'FFB45309' } }; // Ámbar
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF3C7' },
              };
            } else {
              cell.font = { ...cell.font, color: { argb: 'FFB91C1C' } }; // Rojo
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEE2E2' },
              };
            }
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
        });
      }

      // 4. Ajuste automático de anchos de columna
      worksheet.columns.forEach((column) => {
        let maxLen = 12;
        if (column.values) {
          column.values.forEach((v, idx) => {
            if (idx > 3 && v !== null && v !== undefined) {
              const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
              if (str.length > maxLen) maxLen = str.length;
            }
          });
        }
        column.width = Math.min(maxLen + 3, 40);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (err: any) {
      this.logger.error(
        `Error generando libro Excel RENOVA: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }
}
