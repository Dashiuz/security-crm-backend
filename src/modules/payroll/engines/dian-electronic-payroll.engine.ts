import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  DianProviderMode,
  DianEnvironmentType,
  ElectronicDocumentType,
  ElectronicPayrollStatus,
} from '@prisma/client';

export interface DianEmployeeInput {
  employeeId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  secondName?: string | null;
  firstLastName: string;
  secondLastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  daneDepartmentCode?: string | null;
  daneCityCode?: string | null;
  daneCityName?: string | null;
  hireDate: Date | string;
  contractType?: string | null;
  baseSalary: number;
  isIntegralSalary?: boolean;
  workedDays: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  lines: Array<{
    conceptCode: number;
    conceptName: string;
    nature: string;
    dianNieCode?: string | null;
    dianNieFieldName?: string | null;
    quantity: number;
    totalValue: number;
    isConstitutiveOfSalary: boolean;
  }>;
}

export interface DianCompanyConfig {
  companyNit: string;
  companyDv: string;
  companyLegalName: string;
  daneCityCode: string;
  daneDepartmentCode: string;
  dianPrefix: string;
  dianAdjustmentPrefix: string;
  dianEnvironment: DianEnvironmentType;
  dianSoftwareId?: string | null;
  dianSoftwarePin?: string | null;
  dianApiToken?: string | null;
  year: number;
  month: number;
  periodStartDate: Date | string;
  periodEndDate: Date | string;
}

export interface DianDocumentGenerationResult {
  employeeId: string;
  consecutive: number;
  documentNumber: string;
  documentType: ElectronicDocumentType;
  providerMode: DianProviderMode;
  status: ElectronicPayrollStatus;
  cune: string;
  qrUrl: string;
  issueDate: Date;
  workedDays: number;
  totalAccrued: number;
  totalDeductions: number;
  netAmount: number;
  nieBreakdown: Record<
    string,
    { code: string; name: string; amount: number; quantity?: number }
  >;
  xmlContent?: string;
  providerPayload?: any;
  rejectionErrors?: string[];
}

export interface DianBatchGenerationResult {
  year: number;
  month: number;
  providerMode: DianProviderMode;
  totalDocuments: number;
  validatedDocuments: number;
  acceptedDocuments: number;
  rejectedDocuments: number;
  totalAccrued: number;
  totalDeductions: number;
  netAmount: number;
  documents: DianDocumentGenerationResult[];
  excelNieSummary: Array<{
    documentNumber: string;
    employeeName: string;
    cune: string;
    status: string;
    totalDevengado: number;
    totalDeducciones: number;
    neto: number;
    nieDetails: string;
  }>;
}

@Injectable()
export class DianElectronicPayrollEngine {
  private static round(val: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((val + Number.EPSILON) * factor) / factor;
  }

  /**
   * Generación y validación del lote de Nómina Electrónica para los 3 proveedores
   */
  public generateElectronicBatch(
    employees: DianEmployeeInput[],
    config: DianCompanyConfig,
    providerMode: DianProviderMode = DianProviderMode.INTERNAL_DIAN_STANDARD,
    startConsecutive = 1,
  ): DianBatchGenerationResult {
    const documents: DianDocumentGenerationResult[] = [];
    let consecutive = startConsecutive;

    let totalAccrued = 0;
    let totalDeductions = 0;
    let netAmount = 0;
    let validatedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    for (const emp of employees) {
      const doc = this.buildIndividualDocument(
        emp,
        config,
        providerMode,
        consecutive,
      );

      documents.push(doc);
      consecutive++;

      totalAccrued += doc.totalAccrued;
      totalDeductions += doc.totalDeductions;
      netAmount += doc.netAmount;

      if (doc.status === ElectronicPayrollStatus.VALIDATED) {
        validatedCount++;
        acceptedCount++;
      } else if (doc.status === ElectronicPayrollStatus.REJECTED) {
        rejectedCount++;
      }
    }

    const excelNieSummary = documents.map((d) => ({
      documentNumber: d.documentNumber,
      employeeName: `${d.employeeId}`,
      cune: d.cune,
      status: d.status,
      totalDevengado: d.totalAccrued,
      totalDeducciones: d.totalDeductions,
      neto: d.netAmount,
      nieDetails: Object.entries(d.nieBreakdown)
        .map(([k, v]) => `${k}: $${v.amount.toLocaleString('es-CO')}`)
        .join(' | '),
    }));

    return {
      year: config.year,
      month: config.month,
      providerMode,
      totalDocuments: documents.length,
      validatedDocuments: validatedCount,
      acceptedDocuments: acceptedCount,
      rejectedDocuments: rejectedCount,
      totalAccrued: DianElectronicPayrollEngine.round(totalAccrued),
      totalDeductions: DianElectronicPayrollEngine.round(totalDeductions),
      netAmount: DianElectronicPayrollEngine.round(netAmount),
      documents,
      excelNieSummary,
    };
  }

  /**
   * Construye el documento individual con CUNE, NIE breakdown y payload específico
   */
  public buildIndividualDocument(
    emp: DianEmployeeInput,
    config: DianCompanyConfig,
    providerMode: DianProviderMode,
    consecutive: number,
    documentType: ElectronicDocumentType = ElectronicDocumentType.INDIVIDUAL_PAYROLL,
    predecessor?: { cune: string; issueDate: Date },
  ): DianDocumentGenerationResult {
    const rejectionErrors: string[] = [];

    // Validaciones previas DIAN (evita rechazos en el portal)
    if (!emp.documentNumber || emp.documentNumber.trim().length === 0) {
      rejectionErrors.push(
        'Falta el número de documento de identidad del trabajador.',
      );
    }
    if (!emp.firstName || !emp.firstLastName) {
      rejectionErrors.push(
        'El trabajador debe tener nombres y apellidos completos.',
      );
    }
    if (!emp.daneCityCode || !emp.daneDepartmentCode) {
      rejectionErrors.push(
        'Falta el código DANE de municipio y departamento del trabajador.',
      );
    }

    // Agrupación de conceptos por código oficial NIE
    const nieBreakdown: Record<
      string,
      { code: string; name: string; amount: number; quantity?: number }
    > = {};

    let totalDevengos = 0;
    let totalDeducciones = 0;

    for (const line of emp.lines) {
      const code = line.dianNieCode || this.inferNieCode(line);
      const val = DianElectronicPayrollEngine.round(line.totalValue);

      if (!nieBreakdown[code]) {
        nieBreakdown[code] = {
          code,
          name: line.dianNieFieldName || line.conceptName,
          amount: 0,
          quantity: 0,
        };
      }
      nieBreakdown[code].amount = DianElectronicPayrollEngine.round(
        nieBreakdown[code].amount + val,
      );
      nieBreakdown[code].quantity =
        (nieBreakdown[code].quantity || 0) + (line.quantity || 1);

      if (line.nature === 'DEVENGO' || line.nature === 'EARNING') {
        totalDevengos += val;
      } else if (
        line.nature === 'DEDUCCION' ||
        line.nature === 'DEDUCTION' ||
        line.nature === 'SEG_SOCIAL'
      ) {
        totalDeducciones += val;
      }
    }

    // Si no vinieron líneas detalladas, inferir devengos y deducciones desde cabecera
    if (Object.keys(nieBreakdown).length === 0) {
      totalDevengos = DianElectronicPayrollEngine.round(emp.totalEarnings);
      totalDeducciones = DianElectronicPayrollEngine.round(emp.totalDeductions);
      nieBreakdown['NIE070'] = {
        code: 'NIE070',
        name: 'SueldoTrabajado',
        amount: totalDevengos,
        quantity: emp.workedDays,
      };
      nieBreakdown['NIE163'] = {
        code: 'NIE163',
        name: 'AporteSalud',
        amount: DianElectronicPayrollEngine.round(totalDeducciones * 0.5),
      };
      nieBreakdown['NIE166'] = {
        code: 'NIE166',
        name: 'AportePension',
        amount: DianElectronicPayrollEngine.round(totalDeducciones * 0.5),
      };
    }

    const netPay = DianElectronicPayrollEngine.round(
      totalDevengos - totalDeducciones,
    );
    const issueDate = new Date();
    const prefix =
      documentType === ElectronicDocumentType.INDIVIDUAL_PAYROLL
        ? config.dianPrefix || 'NE'
        : config.dianAdjustmentPrefix || 'NA';
    const documentNumber = `${prefix}-${consecutive}`;

    // Cálculo del CUNE SHA-384
    const cune = this.calculateCune({
      numNE: documentNumber,
      fecNE: issueDate.toISOString().slice(0, 10),
      horNE: issueDate.toTimeString().slice(0, 8) + '-05:00',
      valDev: totalDevengos.toFixed(2),
      valDed: totalDeducciones.toFixed(2),
      valTol: netPay.toFixed(2),
      nitNIE: config.companyNit,
      docEmp: emp.documentNumber,
      tipoXML:
        documentType === ElectronicDocumentType.INDIVIDUAL_PAYROLL
          ? '102'
          : '103',
      softwarePin: config.dianSoftwarePin || '12345',
      tipoAmb:
        config.dianEnvironment === DianEnvironmentType.PRODUCCION_1 ? '1' : '2',
    });

    const qrUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cune}`;

    let xmlContent: string | undefined;
    let providerPayload: any | undefined;

    if (providerMode === DianProviderMode.INTERNAL_DIAN_STANDARD) {
      xmlContent = this.buildUbl21Xml({
        documentNumber,
        documentType,
        cune,
        issueDate,
        emp,
        config,
        nieBreakdown,
        totalDevengos,
        totalDeducciones,
        netPay,
        predecessor,
      });
    } else if (providerMode === DianProviderMode.DATAICO) {
      providerPayload = this.buildDataicoPayload({
        documentNumber,
        consecutive,
        cune,
        issueDate,
        emp,
        config,
        nieBreakdown,
        totalDevengos,
        totalDeducciones,
        netPay,
      });
    } else if (providerMode === DianProviderMode.THE_FACTORY_HKA) {
      providerPayload = this.buildTheFactoryHkaPayload({
        documentNumber,
        consecutive,
        cune,
        issueDate,
        emp,
        config,
        nieBreakdown,
        totalDevengos,
        totalDeducciones,
        netPay,
      });
    }

    const status =
      rejectionErrors.length > 0
        ? ElectronicPayrollStatus.REJECTED
        : ElectronicPayrollStatus.VALIDATED;

    return {
      employeeId: emp.employeeId,
      consecutive,
      documentNumber,
      documentType,
      providerMode,
      status,
      cune,
      qrUrl,
      issueDate,
      workedDays: emp.workedDays || 30,
      totalAccrued: totalDevengos,
      totalDeductions: totalDeducciones,
      netAmount: netPay,
      nieBreakdown,
      xmlContent,
      providerPayload,
      rejectionErrors: rejectionErrors.length > 0 ? rejectionErrors : undefined,
    };
  }

  /**
   * Cálculo determinístico del CUNE según Anexo Técnico v1.0 DIAN (SHA-384)
   */
  public calculateCune(params: {
    numNE: string;
    fecNE: string;
    horNE: string;
    valDev: string;
    valDed: string;
    valTol: string;
    nitNIE: string;
    docEmp: string;
    tipoXML: string;
    softwarePin: string;
    tipoAmb: string;
  }): string {
    const rawChain =
      params.numNE +
      params.fecNE +
      params.horNE +
      params.valDev +
      params.valDed +
      params.valTol +
      params.nitNIE +
      params.docEmp +
      params.tipoXML +
      params.softwarePin +
      params.tipoAmb;

    return crypto.createHash('sha384').update(rawChain, 'utf8').digest('hex');
  }

  private inferNieCode(line: { conceptCode: number; nature: string }): string {
    const c = line.conceptCode;
    if (c === 1) return 'NIE070'; // Sueldo
    if (c === 17) return 'NIE071'; // Auxilio Transporte
    if (c === 2) return 'NIE078'; // Recargo Nocturno
    if (c === 3) return 'NIE083'; // Horas Extras Diurnas
    if (c === 4) return 'NIE088'; // Horas Extras Nocturnas
    if (c === 5) return 'NIE093'; // Recargo Festivo
    if (c === 6) return 'NIE098'; // Dominical
    if (c === 7) return 'NIE103'; // Extra Diurna Festiva
    if (c === 8) return 'NIE108'; // Extra Nocturna Festiva
    if (c === 14) return 'NIE118'; // Prima Legal
    if (c === 11) return 'NIE119'; // Cesantías
    if (c === 12) return 'NIE120'; // Intereses Cesantías
    if (c === 15) return 'NIE121'; // Vacaciones
    if (c === 10) return 'NIE148'; // Bonificaciones / Concepto NS
    if (c >= 600 && c <= 601) return 'NIE163'; // Salud
    if (c >= 602 && c <= 603) return 'NIE166'; // Pensión
    if (c === 604) return 'NIE168'; // FSP
    if (c >= 505 && c <= 509) return 'NIE180'; // Préstamos / Libranzas
    return line.nature === 'DEVENGO' ? 'NIE148' : 'NIE198';
  }

  private buildUbl21Xml(params: any): string {
    const {
      documentNumber,
      cune,
      issueDate,
      emp,
      config,
      nieBreakdown,
      totalDevengos,
      totalDeducciones,
      netPay,
      predecessor,
      documentType,
    } = params;

    const isAdjustment =
      documentType !== ElectronicDocumentType.INDIVIDUAL_PAYROLL;
    const rootTag = isAdjustment
      ? 'NominaIndividualDeAjuste'
      : 'NominaIndividual';
    const xmlNs = isAdjustment
      ? 'dian:gov:co:facturaelectronica:NominaIndividualDeAjuste'
      : 'dian:gov:co:facturaelectronica:NominaIndividual';

    const predecessorXml = predecessor
      ? `  <Reemplazar>
    <ReemplazandoPredecesor NumeroPred="${predecessor.cune}" CUNEPred="${predecessor.cune}" FechaGenPred="${predecessor.issueDate ? new Date(predecessor.issueDate).toISOString().slice(0, 10) : ''}"/>
  </Reemplazar>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag} xmlns="${xmlNs}"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  SchemaVersion="1.0:NumeroSecuenciaXML">
${predecessorXml}
  <Novedad CUNE="${cune}">${isAdjustment ? 'true' : 'false'}</Novedad>
  <Periodo FechaIngreso="${emp.hireDate ? new Date(emp.hireDate).toISOString().slice(0, 10) : '2026-01-01'}"
    FechaLiquidacionInicio="${new Date(config.periodStartDate).toISOString().slice(0, 10)}"
    FechaLiquidacionFin="${new Date(config.periodEndDate).toISOString().slice(0, 10)}"
    TiempoLaborado="${emp.workedDays}" FechaEmision="${issueDate.toISOString().slice(0, 10)}"/>
  <NumeroSecuenciaXML CodigoTrabajador="${emp.documentNumber}" Prefijo="${config.dianPrefix}" Consecutivo="${documentNumber}" Numero="${documentNumber}"/>
  <InformacionGeneral Version="V1.0: Documento Soporte de Pago de Nomina Electronica"
    Ambiente="${config.dianEnvironment === DianEnvironmentType.PRODUCCION_1 ? '1' : '2'}"
    TipoXML="${isAdjustment ? '103' : '102'}"
    CUNE="${cune}" EncripCUNE="CUNESHA384" FechaGen="${issueDate.toISOString().slice(0, 10)}"
    HoraGen="${issueDate.toTimeString().slice(0, 8)}-05:00" PeriodoNomina="4" TipoMoneda="COP"/>
  <Empleador RazonSocial="${config.companyLegalName}" NIT="${config.companyNit}" DV="${config.companyDv}" Pais="CO"
    DepartamentoEstado="${config.daneDepartmentCode}" MunicipioCiudad="${config.daneCityCode}"/>
  <Trabajador TipoTrabajador="01" SubTipoTrabajador="00" TipoDocumento="${emp.documentType}"
    NumeroDocumento="${emp.documentNumber}" PrimerApellido="${emp.firstLastName}" SegundoApellido="${emp.secondLastName || ''}"
    PrimerNombre="${emp.firstName}" OtrosNombres="${emp.secondName || ''}" LugarTrabajoPais="CO"
    LugarTrabajoDepartamentoEstado="${emp.daneDepartmentCode || '11'}"
    LugarTrabajoMunicipioCiudad="${emp.daneCityCode || '11001'}" Sueldo="${emp.baseSalary}"/>
  <Pago Forma="1" Metodo="47"/>
  <Devengados>
    <Basico DiasTrabajados="${emp.workedDays}" SueldoTrabajado="${totalDevengos.toFixed(2)}"/>
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="${totalDeducciones.toFixed(2)}"/>
  </Deducciones>
  <DevengadosTotal>${totalDevengos.toFixed(2)}</DevengadosTotal>
  <DeduccionesTotal>${totalDeducciones.toFixed(2)}</DeduccionesTotal>
  <ComprobanteTotal>${netPay.toFixed(2)}</ComprobanteTotal>
</${rootTag}>`;
  }

  private buildDataicoPayload(params: any): any {
    return {
      actions: { send_dian: true },
      payroll: {
        number: params.consecutive,
        prefix: params.config.dianPrefix,
        issue_date: params.issueDate.toISOString().slice(0, 10),
        cune: params.cune,
        period: {
          admision_date: new Date(params.emp.hireDate)
            .toISOString()
            .slice(0, 10),
          settlement_start_date: new Date(params.config.periodStartDate)
            .toISOString()
            .slice(0, 10),
          settlement_end_date: new Date(params.config.periodEndDate)
            .toISOString()
            .slice(0, 10),
          amount_time: params.emp.workedDays,
        },
        employee: {
          first_name: params.emp.firstName,
          first_surname: params.emp.firstLastName,
          identification_type: params.emp.documentType,
          identification_number: params.emp.documentNumber,
          salary: params.emp.baseSalary,
          dane_city: params.emp.daneCityCode || '11001',
        },
        accruals: {
          basic: {
            worked_days: params.emp.workedDays,
            salary: params.totalDevengos,
          },
        },
        deductions: {
          health: {
            percentage: 4.0,
            amount: params.totalDeducciones * 0.5,
          },
          pension: {
            percentage: 4.0,
            amount: params.totalDeducciones * 0.5,
          },
        },
        total_accruals: params.totalDevengos,
        total_deductions: params.totalDeducciones,
        total_payroll: params.netPay,
      },
    };
  }

  private buildTheFactoryHkaPayload(params: any): any {
    return {
      documento: {
        tipoDocumento: '102',
        prefijo: params.config.dianPrefix,
        consecutivo: params.consecutive,
        fechaEmision: params.issueDate.toISOString().slice(0, 10),
        cune: params.cune,
        moneda: 'COP',
      },
      empleador: {
        razonSocial: params.config.companyLegalName,
        nit: params.config.companyNit,
        dv: params.config.companyDv,
        municipioCiudad: params.config.daneCityCode,
        departamentoEstado: params.config.daneDepartmentCode,
      },
      trabajador: {
        tipoDocumento: params.emp.documentType,
        numeroDocumento: params.emp.documentNumber,
        primerNombre: params.emp.firstName,
        primerApellido: params.emp.firstLastName,
        sueldo: params.emp.baseSalary,
      },
      totales: {
        totalDevengados: params.totalDevengos,
        totalDeducciones: params.totalDeducciones,
        totalComprobante: params.netPay,
      },
    };
  }
}
