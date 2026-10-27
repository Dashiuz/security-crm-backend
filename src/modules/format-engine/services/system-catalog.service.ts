import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface SystemFieldCategory {
  id: string;
  name: string;
  icon?: string;
  fields: Array<{
    systemPath: string;
    label: string;
    token: string;
    dataType: 'TEXT' | 'DATE' | 'CURRENCY' | 'NUMBER' | 'IMAGE';
    example: string;
  }>;
}

@Injectable()
export class SystemCatalogService {
  private readonly logger = new Logger(SystemCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve el catálogo estructurado de campos de base de datos disponibles para mapear.
   */
  getSystemCatalog(): SystemFieldCategory[] {
    return [
      {
        id: 'TENANT',
        name: 'Mi Empresa (Tenant)',
        fields: [
          {
            systemPath: 'tenant.profile.legalName',
            label: 'Razón Social Institucional',
            token: 'empresa_razon_social',
            dataType: 'TEXT',
            example: 'NOXIA SEGURIDAD PRIVADA S.A.S.',
          },
          {
            systemPath: 'tenant.logoUrl',
            label: 'Logotipo Corporativo de la Empresa',
            token: 'empresa_logo',
            dataType: 'IMAGE',
            example: 'https://s3.amazonaws.com/noxia/tenant-logo.png',
          },
          {
            systemPath: 'tenant.profile.taxId',
            label: 'NIT de la Empresa',
            token: 'empresa_nit',
            dataType: 'TEXT',
            example: '900.542.890-1',
          },
          {
            systemPath: 'tenant.skin.supervigilanciaLicense',
            label: 'Número Licencia SuperVigilancia',
            token: 'empresa_licencia_svsp',
            dataType: 'TEXT',
            example: 'RES-2024-SVSP-9842',
          },
          {
            systemPath: 'tenant.skin.supervigilanciaLicDate',
            label: 'Fecha Expedición Licencia SVSP',
            token: 'empresa_licencia_fecha',
            dataType: 'DATE',
            example: '15/01/2024',
          },
          {
            systemPath: 'tenant.skin.supervigilanciaLicExpiry',
            label: 'Fecha Vencimiento Licencia SVSP',
            token: 'empresa_licencia_vence',
            dataType: 'DATE',
            example: '14/01/2029',
          },
          {
            systemPath: 'tenant.profile.legalRepresentative',
            label: 'Representante Legal de la Empresa',
            token: 'empresa_representante',
            dataType: 'TEXT',
            example: 'Ing. Alejandro Castro',
          },
          {
            systemPath: 'tenant.profile.city',
            label: 'Ciudad Principal de la Empresa',
            token: 'empresa_ciudad',
            dataType: 'TEXT',
            example: 'Bogotá D.C.',
          },
          {
            systemPath: 'tenant.profile.address',
            label: 'Dirección Sede Principal',
            token: 'empresa_direccion',
            dataType: 'TEXT',
            example: 'Calle 93B # 13-45',
          },
          {
            systemPath: 'tenant.profile.contactPhone',
            label: 'Teléfono de Contacto',
            token: 'empresa_telefono',
            dataType: 'TEXT',
            example: '(601) 745-8900',
          },
          {
            systemPath: 'tenant.skin.uniformsResolutionNum',
            label: 'Resolución de Uniformes',
            token: 'empresa_res_uniformes',
            dataType: 'TEXT',
            example: 'RES-UNIF-2022-410',
          },
          {
            systemPath: 'tenant.skin.overtimeResolutionNum',
            label: 'Resolución de Horas Extras',
            token: 'empresa_res_horas_extras',
            dataType: 'TEXT',
            example: 'RES-MINTRAB-2023-1104',
          },
        ],
      },
      {
        id: 'CLIENT',
        name: 'Cliente / Contratante',
        fields: [
          {
            systemPath: 'client.name',
            label: 'Nombre / Razón Social del Cliente',
            token: 'cliente_nombre',
            dataType: 'TEXT',
            example: 'Conjunto Residencial Altos de la Colina',
          },
          {
            systemPath: 'client.logoUrl',
            label: 'Logotipo Oficial del Cliente',
            token: 'cliente_logo',
            dataType: 'IMAGE',
            example: 'https://s3.amazonaws.com/noxia/client-logo.png',
          },
          {
            systemPath: 'client.nit',
            label: 'NIT / Cédula del Cliente',
            token: 'cliente_nit',
            dataType: 'TEXT',
            example: '901.442.128-4',
          },
          {
            systemPath: 'client.legalRepName',
            label: 'Administrador o Representante Legal',
            token: 'cliente_administrador',
            dataType: 'TEXT',
            example: 'Dra. María Fernanda Gómez',
          },
          {
            systemPath: 'client.address',
            label: 'Dirección de la Sede / Puesto',
            token: 'cliente_direccion',
            dataType: 'TEXT',
            example: 'Carrera 7 # 145-20',
          },
          {
            systemPath: 'client.city',
            label: 'Ciudad de la Sede',
            token: 'cliente_ciudad',
            dataType: 'TEXT',
            example: 'Bogotá D.C.',
          },
          {
            systemPath: 'client.stratum',
            label: 'Estrato Socioeconómico',
            token: 'cliente_estrato',
            dataType: 'NUMBER',
            example: '4',
          },
          {
            systemPath: 'client.email',
            label: 'Correo Electrónico de Notificación',
            token: 'cliente_email',
            dataType: 'TEXT',
            example: 'administracion@altoscolina.com',
          },
        ],
      },
      {
        id: 'EMPLOYEE',
        name: 'Empleado / Guarda de Seguridad',
        fields: [
          {
            systemPath: 'employee.fullName',
            label: 'Nombre Completo del Empleado',
            token: 'empleado_nombre',
            dataType: 'TEXT',
            example: 'Juan Carlos Rodríguez Pérez',
          },
          {
            systemPath: 'employee.photoUrl',
            label: 'Fotografía Oficial del Empleado (Carné)',
            token: 'empleado_foto',
            dataType: 'IMAGE',
            example: 'https://s3.amazonaws.com/noxia/guard-photo.jpg',
          },
          {
            systemPath: 'employee.documentNumber',
            label: 'Número de Cédula (C.C.)',
            token: 'empleado_cedula',
            dataType: 'TEXT',
            example: '1.020.340.560',
          },
          {
            systemPath: 'employee.position.name',
            label: 'Cargo / Rango Operativo',
            token: 'empleado_cargo',
            dataType: 'TEXT',
            example: 'Vigilante Físico 24 Horas',
          },
          {
            systemPath: 'employee.baseSalary',
            label: 'Salario Base Mensual',
            token: 'empleado_salario',
            dataType: 'CURRENCY',
            example: '$ 2.100.000',
          },
          {
            systemPath: 'employee.hireDate',
            label: 'Fecha de Ingreso Laboral',
            token: 'empleado_fecha_ingreso',
            dataType: 'DATE',
            example: '01/02/2024',
          },
        ],
      },
      {
        id: 'VACATION',
        name: 'Procesos: Solicitud de Vacaciones',
        fields: [
          {
            systemPath: 'vacation.startDate',
            label: 'Fecha de Inicio de Vacaciones',
            token: 'vacaciones_fecha_salida',
            dataType: 'DATE',
            example: '15/11/2026',
          },
          {
            systemPath: 'vacation.endDate',
            label: 'Fecha de Reintegro Laboral',
            token: 'vacaciones_fecha_reintegro',
            dataType: 'DATE',
            example: '02/12/2026',
          },
          {
            systemPath: 'vacation.daysCount',
            label: 'Días Hábiles Solicitados',
            token: 'vacaciones_dias',
            dataType: 'NUMBER',
            example: '15',
          },
          {
            systemPath: 'vacation.replacementName',
            label: 'Guarda de Reemplazo Asignado',
            token: 'vacaciones_reemplazo',
            dataType: 'TEXT',
            example: 'Pedro Nel Gómez',
          },
        ],
      },
      {
        id: 'FINANCE',
        name: 'Financiero y Contratos',
        fields: [
          {
            systemPath: 'proposal.totalMonthlyWithTax',
            label: 'Valor Mensual Total con IVA',
            token: 'propuesta_total_mensual',
            dataType: 'CURRENCY',
            example: '$ 15.285.000 COP',
          },
          {
            systemPath: 'finance.amountInWords',
            label: 'Monto Total en Letras (Legal Colombia)',
            token: 'monto_en_letras',
            dataType: 'TEXT',
            example: 'QUINCE MILLONES DOSCIENTOS OCHENTA Y CINCO MIL PESOS M/CTE',
          },
          {
            systemPath: 'proposal.omegaCode',
            label: 'Código OMEGA / Folio Radicado',
            token: 'propuesta_codigo_omega',
            dataType: 'TEXT',
            example: 'OMG-2026-0042',
          },
          {
            systemPath: 'proposal.contractDurationMonths',
            label: 'Vigencia del Contrato (Meses)',
            token: 'propuesta_meses',
            dataType: 'NUMBER',
            example: '12',
          },
        ],
      },
      {
        id: 'MEDIA_SECURITY',
        name: 'Imágenes y Firmas Digitales',
        fields: [
          {
            systemPath: 'securityStudy.baseImageUrl',
            label: 'Plano Satelital / CAD del Puesto',
            token: 'estudio_plano_cad',
            dataType: 'IMAGE',
            example: 'https://s3.amazonaws.com/noxia/cad-plan.jpg',
          },
          {
            systemPath: 'user.signatureUrl',
            label: 'Firma Digitalizada del Usuario Emisor',
            token: 'usuario_firma',
            dataType: 'IMAGE',
            example: 'data:image/png;base64,...',
          },
        ],
      },
      {
        id: 'SYSTEM',
        name: 'Sistema y Fechas',
        fields: [
          {
            systemPath: 'system.currentDateFormatted',
            label: 'Fecha de Hoy (Texto Formal)',
            token: 'fecha_hoy_formal',
            dataType: 'TEXT',
            example: '25 de octubre de 2026',
          },
          {
            systemPath: 'system.currentYear',
            label: 'Año Calendario Actual',
            token: 'año_actual',
            dataType: 'NUMBER',
            example: '2026',
          },
          {
            systemPath: 'system.currentTime',
            label: 'Hora Actual de Radicación',
            token: 'hora_actual',
            dataType: 'TEXT',
            example: '10:30 AM',
          },
        ],
      },
    ];
  }

  /**
   * Resuelve valores reales de la base de datos para una entidad dada en un tenant.
   */
  async resolveContextValues(
    tenantId: string,
    context?: {
      clientId?: string;
      employeeId?: string;
      proposalId?: string;
      userId?: string;
    },
  ): Promise<Record<string, any>> {
    const values: Record<string, any> = {};

    // 1. Datos del Sistema y Fechas
    const now = new Date();
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    values['fecha_hoy_formal'] = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
    values['año_actual'] = String(now.getFullYear());
    values['hora_actual'] = now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 2. Datos de Mi Empresa (Tenant, TenantProfile y TenantDocumentSkin)
    try {
      const [tenant, profile, skin] = await Promise.all([
        this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { logoUrl: true },
        }),
        this.prisma.tenantProfile.findUnique({ where: { tenantId } }),
        this.prisma.tenantDocumentSkin.findFirst({ where: { tenantId } }),
      ]);

      if (tenant?.logoUrl) {
        values['empresa_logo'] = tenant.logoUrl;
      }

      if (profile) {
        values['empresa_razon_social'] = profile.legalName || 'EMPRESA DE SEGURIDAD';
        values['empresa_nit'] = profile.taxId || '';
        values['empresa_representante'] = profile.legalRepresentative || '';
        values['empresa_ciudad'] = profile.city || 'Bogotá D.C.';
        values['empresa_direccion'] = profile.address || '';
        values['empresa_telefono'] = profile.contactPhone || '';
        values['empresa_ciudad_direccion'] = `${profile.address || ''}, ${profile.city || ''}`;
      }

      if (skin) {
        values['empresa_licencia_svsp'] = skin.supervigilanciaLicense || '';
        values['empresa_licencia_fecha'] = skin.supervigilanciaLicDate
          ? new Date(skin.supervigilanciaLicDate).toLocaleDateString('es-CO')
          : '';
        values['empresa_licencia_vence'] = skin.supervigilanciaLicExpiry
          ? new Date(skin.supervigilanciaLicExpiry).toLocaleDateString('es-CO')
          : '';
        values['empresa_res_uniformes'] = skin.uniformsResolutionNum || '';
        values['empresa_res_horas_extras'] = skin.overtimeResolutionNum || '';
      }
    } catch (err: any) {
      this.logger.error(`Error resolviendo datos de empresa: ${err.message}`);
    }

    // 3. Datos del Cliente (si se proporcionó clientId)
    if (context?.clientId) {
      try {
        const client = await this.prisma.client.findFirst({
          where: { id: context.clientId, tenantId },
        });
        if (client) {
          values['cliente_nombre'] = client.name;
          values['cliente_nit'] = client.nit;
          values['cliente_administrador'] = client.administrator || '';
          values['cliente_direccion'] = client.address || '';
          values['cliente_ciudad'] = client.city || '';
          values['cliente_estrato'] = client.stratum !== null ? String(client.stratum) : '';
          values['cliente_email'] = client.email || '';
          if (client.mapboxBaseImageS3Key) {
            values['estudio_plano_cad'] = client.mapboxBaseImageS3Key;
          }
        }
      } catch (err: any) {
        this.logger.error(`Error resolviendo datos de cliente: ${err.message}`);
      }
    }

    // 4. Datos del Empleado (si se proporcionó employeeId)
    if (context?.employeeId) {
      try {
        const employee = await this.prisma.employee.findFirst({
          where: { id: context.employeeId, tenantId },
          include: { positionRef: true, mediaAttachments: true },
        });
        if (employee) {
          values['empleado_nombre'] =
            employee.fullName || `${employee.firstName} ${employee.lastName}`.trim();
          if (employee.mediaAttachments && employee.mediaAttachments.length > 0) {
            values['empleado_foto'] = employee.mediaAttachments[0].s3Key;
          }
          if (employee.signatureUrl) {
            values['usuario_firma'] = employee.signatureUrl;
          }
          values['empleado_cedula'] = employee.document;
          values['empleado_cargo'] = employee.positionRef?.name || 'Vigilante de Seguridad';
          values['empleado_salario'] = `$ 2.000.000 COP`;
          values['empleado_fecha_ingreso'] = employee.entryDate
            ? new Date(employee.entryDate).toLocaleDateString('es-CO')
            : '';
        }
      } catch (err: any) {
        this.logger.error(`Error resolviendo datos de empleado: ${err.message}`);
      }
    }


    // 5. Datos de Propuesta / Financiero (si se proporcionó proposalId)
    if (context?.proposalId) {
      try {
        const proposal = await this.prisma.commercialProposal.findFirst({
          where: { id: context.proposalId, tenantId },
        });
        if (proposal) {
          const total = Number(proposal.totalMonthlyWithTax || 0);
          values['propuesta_total_mensual'] = `$ ${total.toLocaleString('es-CO')} COP`;
          values['monto_en_letras'] = this.numberToColombianWords(total);
          values['propuesta_codigo_omega'] = proposal.proposalFolioCode || '';
          values['propuesta_meses'] = String(proposal.contractDurationMonths || 12);
        }
      } catch (err: any) {
        this.logger.error(`Error resolviendo datos de propuesta: ${err.message}`);
      }
    }

    // 6. Datos del Usuario Emisor (si se proporcionó userId)
    if (context?.userId) {
      try {
        const user = await this.prisma.user.findFirst({
          where: { id: context.userId, tenantId },
          select: { signatureUrl: true },
        });
        if (user?.signatureUrl) {
          values['usuario_firma'] = user.signatureUrl;
        }
      } catch (err: any) {
        this.logger.error(`Error resolviendo firma de usuario: ${err.message}`);
      }
    }

    return values;
  }

  /**
   * Convierte un número entero a su equivalente formal en letras en pesos colombianos.
   * Ej: 15285000 -> "QUINCE MILLONES DOSCIENTOS OCHENTA Y CINCO MIL PESOS M/CTE"
   */
  numberToColombianWords(amount: number): string {
    if (!amount || isNaN(amount)) return 'CERO PESOS M/CTE';
    const integerPart = Math.floor(Math.abs(amount));

    const units = [
      '',
      'UN',
      'DOS',
      'TRES',
      'CUATRO',
      'CINCO',
      'SEIS',
      'SIETE',
      'OCHO',
      'NUEVE',
      'DIEZ',
      'ONCE',
      'DOCE',
      'TRECE',
      'CATORCE',
      'QUINCE',
      'DIECISÉIS',
      'DIECISIETE',
      'DIECIOCHO',
      'DIECINUEVE',
      'VEINTE',
    ];
    const tens = [
      '',
      '',
      'VEINTI',
      'TREINTA',
      'CUARENTA',
      'CINCUENTA',
      'SESENTA',
      'SETENTA',
      'OCHENTA',
      'NOVENTA',
    ];
    const hundreds = [
      '',
      'CIENTO',
      'DOSCIENTOS',
      'TRESCIENTOS',
      'CUATROCIENTOS',
      'QUINIENTOS',
      'SEISCIENTOS',
      'SETECIENTOS',
      'OCHOCIENTOS',
      'NOVECIENTOS',
    ];

    function convertGroup(n: number): string {
      let output = '';
      if (n === 100) return 'CIEN';

      const h = Math.floor(n / 100);
      const rem = n % 100;
      if (h > 0) output += hundreds[h] + ' ';

      if (rem <= 20) {
        output += units[rem];
      } else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        if (t === 2 && u > 0) {
          output += 'VEINTI' + units[u];
        } else {
          output += tens[t] + (u > 0 ? ' Y ' + units[u] : '');
        }
      }
      return output.trim();
    }

    if (integerPart === 0) return 'CERO PESOS M/CTE';

    const millions = Math.floor(integerPart / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const remainder = integerPart % 1000;

    let result = '';

    if (millions > 0) {
      if (millions === 1) {
        result += 'UN MILLÓN ';
      } else {
        result += convertGroup(millions) + ' MILLONES ';
      }
    }

    if (thousands > 0) {
      if (thousands === 1) {
        result += 'MIL ';
      } else {
        result += convertGroup(thousands) + ' MIL ';
      }
    }

    if (remainder > 0) {
      result += convertGroup(remainder) + ' ';
    }

    return `${result.trim()} PESOS M/CTE`;
  }
}
