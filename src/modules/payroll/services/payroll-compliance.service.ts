import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PilaBatchStatus,
  DianProviderMode,
  DianEnvironmentType,
  ElectronicPayrollStatus,
  ElectronicDocumentType,
  AccountingExportFormat,
  ArlRiskClass,
} from '@prisma/client';
import {
  GeneratePilaBatchDto,
  QueryPilaLinesDto,
  GenerateElectronicBatchDto,
  CreateAdjustmentNoteDto,
  QueryElectronicDocumentsDto,
  GenerateAccountingBatchDto,
  GenerateForm220Dto,
  GenerateLaborCertificateDto,
  QueryAccumulatedReportDto,
} from '../dtos/payroll-compliance.dto';
import {
  PilaGeneratorEngine,
  PilaCompanyConfig,
  PilaEmployeeInput,
} from '../engines/pila-generator.engine';
import {
  DianElectronicPayrollEngine,
  DianCompanyConfig,
  DianEmployeeInput,
} from '../engines/dian-electronic-payroll.engine';
import {
  AccountingInterfaceEngine,
  AccountingBatchConfig,
  AccountingSettlementInput,
} from '../engines/accounting-interface.engine';
import {
  Form220AndAccumulatedEngine,
  Form220Input,
  AnnualSettlementInput,
} from '../engines/form220-and-accumulated.engine';
import {
  PayrollCompliancePdfService,
  LaborCertificatePdfData,
  Form220PdfData,
} from './payroll-compliance-pdf.service';

@Injectable()
export class PayrollComplianceService {
  private readonly logger = new Logger(PayrollComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pilaEngine: PilaGeneratorEngine,
    private readonly dianEngine: DianElectronicPayrollEngine,
    private readonly accountingEngine: AccountingInterfaceEngine,
    private readonly form220Engine: Form220AndAccumulatedEngine,
    private readonly pdfService: PayrollCompliancePdfService,
  ) {}

  // ============================================================================
  // 1. DASHBOARD OVERVIEW & KPIS
  // ============================================================================

  public async getComplianceDashboardKpis(tenantId: string) {
    try {
      const [
        totalPilaBatches,
        lastPilaBatch,
        totalElectronicBatches,
        lastElectronicBatch,
        electronicDocStats,
        totalAccountingBatches,
        lastAccountingBatch,
        totalCertificates220,
      ] = await Promise.all([
        this.prisma.payrollPilaBatch.count({ where: { tenantId } }),
        this.prisma.payrollPilaBatch.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          include: { period: true },
        }),
        this.prisma.payrollElectronicBatch.count({ where: { tenantId } }),
        this.prisma.payrollElectronicBatch.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          include: { period: true },
        }),
        this.prisma.payrollElectronicDocument.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: { id: true },
        }),
        this.prisma.payrollAccountingBatch.count({ where: { tenantId } }),
        this.prisma.payrollAccountingBatch.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          include: { period: true },
        }),
        this.prisma.payrollTaxCertificate220.count({ where: { tenantId } }),
      ]);

      const docStatusCounts = {
        DRAFT: 0,
        VALIDATED: 0,
        TRANSMITTED_ACCEPTED: 0,
        REJECTED: 0,
        REPLACED_BY_NOTE: 0,
      };

      for (const stat of electronicDocStats) {
        docStatusCounts[stat.status] = stat._count.id;
      }

      return {
        pila: {
          totalBatches: totalPilaBatches,
          lastBatch: lastPilaBatch,
        },
        electronicPayroll: {
          totalBatches: totalElectronicBatches,
          lastBatch: lastElectronicBatch,
          documentCounts: docStatusCounts,
        },
        accounting: {
          totalBatches: totalAccountingBatches,
          lastBatch: lastAccountingBatch,
        },
        taxCertificates: {
          total220Issued: totalCertificates220,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error loading compliance dashboard KPIs: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 2. PILA (PLANILLA ÚNICA RES. 2388)
  // ============================================================================

  public async generatePilaBatch(
    tenantId: string,
    dto: GeneratePilaBatchDto,
    userId?: string,
  ) {
    try {
      const [settings, tenant, period, settlements] = await Promise.all([
        this.prisma.payrollSettings.findUnique({ where: { tenantId } }),
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.payrollPeriod.findFirst({
          where: { id: dto.periodId, tenantId },
        }),
        this.prisma.payrollPeriodSettlement.findMany({
          where: { periodId: dto.periodId, tenantId },
          include: {
            employee: {
              include: {
                payrollProfile: {
                  include: {
                    epsEntity: true,
                    afpEntity: true,
                    ccfEntity: true,
                  },
                },
                leavesAndAbsences: true,
              },
            },
            lines: true,
          },
        }),
      ]);

      if (!tenant) throw new NotFoundException('Empresa/Tenant no encontrado.');
      if (!period)
        throw new NotFoundException('Periodo de nómina no encontrado.');
      if (settlements.length === 0) {
        throw new BadRequestException(
          'El periodo no tiene liquidaciones generadas para procesar PILA.',
        );
      }

      const smmlv = settings?.smmlv ? Number(settings.smmlv) : 1750905;
      const applyExoneration = settings?.applyExonerationLaw1607 ?? true;

      const pStartDate = new Date(period.startDate);
      const year = pStartDate.getFullYear();
      const month = pStartDate.getMonth() + 1;

      const companyConfig: PilaCompanyConfig = {
        companyNit: settings?.companyNit || '900123456',
        companyDv: settings?.companyDv || '1',
        companyLegalName:
          settings?.companyLegalName || tenant.name || 'SEGURIDAD NOXIA LTDA',
        arlEntityCode: settings?.arlEntityCode || '14-23',
        smmlv,
        applyExonerationLaw1607: applyExoneration,
        year,
        month,
        operatorName: dto.operatorName || 'SOI',
      };

      const employeeInputs: PilaEmployeeInput[] = settlements.map((s) => {
        const emp = s.employee;
        const prof = emp.payrollProfile;

        const periodStartStr = pStartDate.toISOString().slice(0, 10);
        const periodEndStr = new Date(period.endDate)
          .toISOString()
          .slice(0, 10);

        const relevantLeaves = emp.leavesAndAbsences
          .filter((l) => {
            const lStart = new Date(l.startDate).toISOString().slice(0, 10);
            const lEnd = new Date(l.endDate).toISOString().slice(0, 10);
            return lStart <= periodEndStr && lEnd >= periodStartStr;
          })
          .map((l) => ({
            id: l.id,
            leaveType: l.leaveType,
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays,
          }));

        return {
          employeeId: emp.id,
          documentType: emp.documentType,
          documentNumber: emp.document,
          firstName: emp.firstName,
          secondName: emp.secondName || null,
          firstLastName: emp.lastName,
          secondLastName: emp.maternalSurname || null,
          daneDepartmentCode: prof?.daneCityCode?.slice(0, 2) || '11',
          daneCityCode: prof?.daneCityCode || '001',
          contributorType: prof?.pilaContributorType || '01',
          contributorSubtype: prof?.pilaContributorSubtype || '00',
          isPensioner: prof?.isPensioner ?? false,
          arlRiskClass: prof?.arlRiskClass || ArlRiskClass.RISK_IV,
          epsCodePlu: prof?.epsEntity?.pluCode || 'EPS017',
          afpCodePlu: prof?.afpEntity?.pluCode || '230301',
          ccfCodePlu: prof?.ccfEntity?.pluCode || 'CCF01',
          baseSalaryMonthly: prof?.customBaseSalary
            ? Number(prof.customBaseSalary)
            : smmlv,
          isIntegralSalary: prof?.isIntegralSalary ?? false,
          entryDate: emp.entryDate,
          retirementDate: emp.retiredAt,
          totalEarnings: Number(s.totalEarnings),
          basicSalaryEarned: Number(s.basicSalaryEarned),
          ibcEps: Number(s.ibcEps),
          ibcAfp: Number(s.ibcAfp),
          ibcArl: Number(s.ibcArl),
          ibcCcf: Number(s.ibcCcf),
          workedDays: s.workedDays,
          unpaidAbsenceDays: s.unpaidAbsenceDays,
          incapacityDays: s.incapacityDays,
          vacationDays: s.vacationDays,
          leaves: relevantLeaves,
        };
      });

      const batchEngineResult = this.pilaEngine.generatePilaBatch(
        employeeInputs,
        companyConfig,
      );

      // Remove previous batch for same period if exists
      const existing = await this.prisma.payrollPilaBatch.findFirst({
        where: {
          tenantId,
          periodId: dto.periodId,
          branchId: dto.branchId || null,
        },
      });
      if (existing) {
        await this.prisma.payrollPilaBatch.delete({
          where: { id: existing.id },
        });
      }

      const createdBatch = await this.prisma.payrollPilaBatch.create({
        data: {
          tenantId,
          periodId: dto.periodId,
          branchId: dto.branchId || null,
          status: PilaBatchStatus.VALIDATED,
          operatorName: dto.operatorName || 'SOI',
          totalEmployees: batchEngineResult.totalEmployees,
          totalLines: batchEngineResult.totalLines,
          totalIbcHealth: batchEngineResult.totalIbcHealth,
          totalIbcPension: batchEngineResult.totalIbcPension,
          totalIbcArl: batchEngineResult.totalIbcArl,
          totalIbcCcf: batchEngineResult.totalIbcCcf,
          totalHealthEmployee: batchEngineResult.totalHealthEmployee,
          totalHealthEmployer: batchEngineResult.totalHealthEmployer,
          totalPensionEmployee: batchEngineResult.totalPensionEmployee,
          totalPensionEmployer: batchEngineResult.totalPensionEmployer,
          totalFsp: batchEngineResult.totalFsp,
          totalArl: batchEngineResult.totalArl,
          totalCcf: batchEngineResult.totalCcf,
          totalSena: batchEngineResult.totalSena,
          totalIcbf: batchEngineResult.totalIcbf,
          totalExoneratedLaw1607: batchEngineResult.totalExoneratedLaw1607,
          grandTotalAmount: batchEngineResult.grandTotalAmount,
          createdById: userId,
          lines: {
            create: batchEngineResult.lines.map((l) => ({
              tenantId,
              sequenceNumber: l.sequenceNumber,
              employeeId: l.employeeId,
              documentType: l.documentType,
              documentNumber: l.documentNumber,
              firstLastName: l.firstLastName,
              secondLastName: l.secondLastName || null,
              firstName: l.firstName,
              secondName: l.secondName || null,
              daneDepartmentCode: l.daneDepartmentCode,
              daneCityCode: l.daneCityCode,
              contributorType: l.contributorType,
              contributorSubtype: l.contributorSubtype,
              isIng: l.isIng,
              isRet: l.isRet,
              isTde: l.isTde,
              isTae: l.isTae,
              isTdp: l.isTdp,
              isTap: l.isTap,
              isVsp: l.isVsp,
              isCor: l.isCor,
              isVst: l.isVst,
              isSln: l.isSln,
              isIge: l.isIge,
              isLma: l.isLma,
              isVacLr: l.isVacLr,
              isAvp: l.isAvp,
              isVct: l.isVct,
              isIrl: l.isIrl,
              ingDate: l.ingDate,
              retDate: l.retDate,
              slnStartDate: l.slnStartDate,
              slnEndDate: l.slnEndDate,
              igeStartDate: l.igeStartDate,
              igeEndDate: l.igeEndDate,
              lmaStartDate: l.lmaStartDate,
              lmaEndDate: l.lmaEndDate,
              vacStartDate: l.vacStartDate,
              vacEndDate: l.vacEndDate,
              irlStartDate: l.irlStartDate,
              irlEndDate: l.irlEndDate,
              epsCodePlu: l.epsCodePlu,
              afpCodePlu: l.afpCodePlu,
              ccfCodePlu: l.ccfCodePlu,
              arlRiskClass: l.arlRiskClass,
              arlRatePct: l.arlRatePct,
              workedDaysPension: l.workedDaysPension,
              workedDaysHealth: l.workedDaysHealth,
              workedDaysArl: l.workedDaysArl,
              workedDaysCcf: l.workedDaysCcf,
              baseSalary: l.baseSalary,
              isIntegralSalary: l.isIntegralSalary,
              ibcPension: l.ibcPension,
              ibcHealth: l.ibcHealth,
              ibcArl: l.ibcArl,
              ibcCcf: l.ibcCcf,
              pensionEmployeeRate: l.pensionEmployeeRate,
              pensionEmployerRate: l.pensionEmployerRate,
              pensionTotalAmount: l.pensionTotalAmount,
              fspRate: l.fspRate,
              fspAmount: l.fspAmount,
              healthEmployeeRate: l.healthEmployeeRate,
              healthEmployerRate: l.healthEmployerRate,
              healthTotalAmount: l.healthTotalAmount,
              arlAmount: l.arlAmount,
              ccfRate: l.ccfRate,
              ccfAmount: l.ccfAmount,
              senaAmount: l.senaAmount,
              icbfAmount: l.icbfAmount,
              isExoneratedLaw1607: l.isExoneratedLaw1607,
              totalLineAmount: l.totalLineAmount,
              rawPositionalRecord: l.rawPositionalRecord,
            })),
          },
        },
        include: {
          period: true,
          lines: { take: 50 },
        },
      });

      return createdBatch;
    } catch (error) {
      this.logger.error(
        `Error generating PILA batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async getPilaBatch(
    tenantId: string,
    batchId: string,
    query?: QueryPilaLinesDto,
  ) {
    try {
      const batch = await this.prisma.payrollPilaBatch.findFirst({
        where: { id: batchId, tenantId },
        include: {
          period: true,
          branch: true,
        },
      });
      if (!batch) throw new NotFoundException('Lote PILA no encontrado.');

      const whereLines: any = { tenantId, batchId };
      if (query?.search) {
        whereLines.employee = {
          OR: [
            { document: { contains: query.search, mode: 'insensitive' } },
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
          ],
        };
      }
      if (query?.noveltyFilter) {
        const nf = query.noveltyFilter.toUpperCase();
        if (nf === 'ING') whereLines.isIng = true;
        if (nf === 'RET') whereLines.isRet = true;
        if (nf === 'IGE') whereLines.isIge = true;
        if (nf === 'IRL') whereLines.isIrl = true;
        if (nf === 'SLN') whereLines.isSln = true;
        if (nf === 'VAC') whereLines.isVacLr = true;
        if (nf === 'VST') whereLines.isVst = true;
      }

      const lines = await this.prisma.payrollPilaRecordLine.findMany({
        where: whereLines,
        orderBy: { sequenceNumber: 'asc' },
        include: {
          employee: {
            select: {
              id: true,
              documentType: true,
              document: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {
        ...batch,
        lines,
      };
    } catch (error) {
      this.logger.error(
        `Error getting PILA batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async exportPilaFlatFile(tenantId: string, batchId: string) {
    try {
      const batch = await this.prisma.payrollPilaBatch.findFirst({
        where: { id: batchId, tenantId },
        include: {
          period: true,
          lines: { orderBy: { sequenceNumber: 'asc' } },
        },
      });
      if (!batch) throw new NotFoundException('Lote PILA no encontrado.');

      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });
      const nit = settings?.companyNit || '900123456';
      const companyName = (settings?.companyLegalName || 'SEGURIDAD NOXIA LTDA')
        .padEnd(200, ' ')
        .slice(0, 200);

      const pStart = new Date(batch.period.startDate);
      const year = pStart.getFullYear();
      const month = pStart.getMonth() + 1;

      // Header Tipo 01
      const header01 = [
        '01',
        '1',
        '0001',
        companyName,
        'NI',
        nit.padEnd(16, ' ').slice(0, 16),
        (settings?.companyDv || '1').slice(0, 1),
        'E',
        ' '.repeat(20),
        'S',
        ' '.repeat(40),
        year.toString().padStart(4, '0'),
        month.toString().padStart(2, '0'),
        ' '.repeat(10),
      ].join('');

      const lines02 = batch.lines
        .map((l) => l.rawPositionalRecord || '')
        .filter(Boolean);
      const content = [header01, ...lines02].join('\r\n');
      const fileName = `PILA_${batch.operatorName || 'SOI'}_${year}${month.toString().padStart(2, '0')}.txt`;

      await this.prisma.payrollPilaBatch.update({
        where: { id: batchId },
        data: { status: PilaBatchStatus.EXPORTED, fileNameTxt: fileName },
      });

      return { fileName, content };
    } catch (error) {
      this.logger.error(
        `Error exporting PILA flat file: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async exportPilaAuditCsv(tenantId: string, batchId: string) {
    try {
      const batch = await this.prisma.payrollPilaBatch.findFirst({
        where: { id: batchId, tenantId },
        include: {
          period: true,
          lines: {
            orderBy: { sequenceNumber: 'asc' },
            include: { employee: true },
          },
        },
      });
      if (!batch) throw new NotFoundException('Lote PILA no encontrado.');

      const headers = [
        'SECUENCIA',
        'DOCUMENTO',
        'NOMBRES_APELLIDOS',
        'DIAS_SALUD',
        'DIAS_PENSION',
        'DIAS_ARL',
        'DIAS_CCF',
        'NOVEDADES',
        'IBC_SALUD',
        'IBC_PENSION',
        'IBC_ARL',
        'IBC_CCF',
        'APORTE_SALUD',
        'APORTE_PENSION',
        'FSP',
        'APORTE_ARL',
        'APORTE_CCF',
        'TOTAL_LINEA',
      ];

      const rows = batch.lines.map((l) => {
        const empName = l.employee
          ? `${l.employee.lastName} ${l.employee.firstName}`
          : 'N/A';
        const novs: string[] = [];
        if (l.isIng) novs.push('ING');
        if (l.isRet) novs.push('RET');
        if (l.isIge) novs.push('IGE');
        if (l.isIrl) novs.push('IRL');
        if (l.isLma) novs.push('LMA');
        if (l.isVacLr) novs.push('VAC');
        if (l.isSln) novs.push('SLN');
        if (l.isVst) novs.push('VST');

        return [
          l.sequenceNumber,
          `"${l.employee?.documentType} ${l.employee?.document}"`,
          `"${empName}"`,
          l.workedDaysHealth,
          l.workedDaysPension,
          l.workedDaysArl,
          l.workedDaysCcf,
          `"${novs.join('/') || 'NINGUNA'}"`,
          Number(l.ibcHealth).toFixed(2),
          Number(l.ibcPension).toFixed(2),
          Number(l.ibcArl).toFixed(2),
          Number(l.ibcCcf).toFixed(2),
          Number(l.healthTotalAmount).toFixed(2),
          Number(l.pensionTotalAmount).toFixed(2),
          Number(l.fspAmount).toFixed(2),
          Number(l.arlAmount).toFixed(2),
          Number(l.ccfAmount).toFixed(2),
          Number(l.totalLineAmount).toFixed(2),
        ].join(';');
      });

      const pStart = new Date(batch.period.startDate);
      const content = [headers.join(';'), ...rows].join('\r\n');
      const fileName = `PILA_AUDITORIA_${pStart.getFullYear()}${(pStart.getMonth() + 1).toString().padStart(2, '0')}.csv`;

      await this.prisma.payrollPilaBatch.update({
        where: { id: batchId },
        data: { fileNameCsv: fileName },
      });

      return { fileName, content };
    } catch (error) {
      this.logger.error(
        `Error exporting PILA audit CSV: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 3. NÓMINA ELECTRÓNICA DIAN (RES. 000013)
  // ============================================================================

  public async generateElectronicBatch(
    tenantId: string,
    dto: GenerateElectronicBatchDto,
    userId?: string,
  ) {
    try {
      const [settings, tenant, period, settlements] = await Promise.all([
        this.prisma.payrollSettings.findUnique({ where: { tenantId } }),
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.payrollPeriod.findFirst({
          where: { id: dto.periodId, tenantId },
        }),
        this.prisma.payrollPeriodSettlement.findMany({
          where: { periodId: dto.periodId, tenantId },
          include: {
            employee: {
              include: {
                payrollProfile: true,
              },
            },
            lines: {
              include: {
                concept: true,
              },
            },
          },
        }),
      ]);

      if (!tenant) throw new NotFoundException('Empresa/Tenant no encontrado.');
      if (!period)
        throw new NotFoundException('Periodo de nómina no encontrado.');
      if (settlements.length === 0) {
        throw new BadRequestException(
          'El periodo no tiene liquidaciones generadas.',
        );
      }

      const providerMode =
        dto.providerMode ||
        settings?.defaultDianProviderMode ||
        DianProviderMode.INTERNAL_DIAN_STANDARD;
      const environment =
        dto.environment ||
        settings?.dianEnvironment ||
        DianEnvironmentType.HABILITACION_2;
      const prefix = settings?.dianPrefix || 'NE';
      const adjPrefix = settings?.dianAdjustmentPrefix || 'NA';

      const pStartDate = new Date(period.startDate);
      const year = pStartDate.getFullYear();
      const month = pStartDate.getMonth() + 1;

      const companyConfig: DianCompanyConfig = {
        companyNit: settings?.companyNit || '900123456',
        companyDv: settings?.companyDv || '1',
        companyLegalName:
          settings?.companyLegalName || tenant.name || 'SEGURIDAD NOXIA LTDA',
        daneCityCode: settings?.daneCityCode || '11001',
        daneDepartmentCode: settings?.daneDepartmentCode || '11',
        dianPrefix: prefix,
        dianAdjustmentPrefix: adjPrefix,
        dianEnvironment: environment,
        dianSoftwareId: settings?.dianSoftwareId || 'software-uuid',
        dianSoftwarePin: settings?.dianSoftwarePin || '12345',
        dianApiToken: settings?.dianApiToken || null,
        year,
        month,
        periodStartDate: period.startDate,
        periodEndDate: period.endDate,
      };

      const employeeInputs: DianEmployeeInput[] = settlements.map((s) => {
        const emp = s.employee;
        const prof = emp.payrollProfile;

        return {
          employeeId: emp.id,
          documentType: emp.documentType,
          documentNumber: emp.document,
          firstName: emp.firstName,
          secondName: emp.secondName || null,
          firstLastName: emp.lastName,
          secondLastName: emp.maternalSurname || null,
          email: emp.email || null,
          phone: emp.phone || null,
          address: emp.address || null,
          daneDepartmentCode: prof?.daneCityCode?.slice(0, 2) || '11',
          daneCityCode: prof?.daneCityCode || '11001',
          daneCityName: prof?.daneCityName || 'BOGOTA D.C.',
          hireDate: emp.entryDate || period.startDate,
          contractType: prof?.contractType || 'FIXED_TERM',
          baseSalary: prof?.customBaseSalary
            ? Number(prof.customBaseSalary)
            : 1750905,
          isIntegralSalary: prof?.isIntegralSalary ?? false,
          workedDays: s.workedDays,
          totalEarnings: Number(s.totalEarnings),
          totalDeductions: Number(s.totalDeductions),
          netPay: Number(s.netPayAmount),
          lines: s.lines.map((l) => ({
            conceptCode: l.concept.code,
            conceptName: l.concept.name,
            nature: l.concept.nature,
            dianNieCode: l.concept.dianNieCode,
            dianNieFieldName: l.concept.dianNieFieldName,
            quantity: Number(l.quantity || 1),
            totalValue: Number(l.totalValue),
            isConstitutiveOfSalary: l.concept.isConstitutiveOfSalary,
          })),
        };
      });

      const startConsecutive = settings?.dianNextConsecutive || 1;
      const batchResult = this.dianEngine.generateElectronicBatch(
        employeeInputs,
        companyConfig,
        providerMode,
        startConsecutive,
      );

      // Remove existing batch for same period & providerMode if in DRAFT/REJECTED
      const existing = await this.prisma.payrollElectronicBatch.findUnique({
        where: {
          tenantId_periodId_providerMode: {
            tenantId,
            periodId: dto.periodId,
            providerMode,
          },
        },
      });

      if (existing) {
        await this.prisma.payrollElectronicBatch.delete({
          where: { id: existing.id },
        });
      }

      // Create electronic batch
      const createdBatch = await this.prisma.payrollElectronicBatch.create({
        data: {
          tenantId,
          periodId: dto.periodId,
          year,
          month,
          providerMode,
          environment,
          prefix,
          status:
            batchResult.rejectedDocuments > 0
              ? ElectronicPayrollStatus.DRAFT
              : ElectronicPayrollStatus.VALIDATED,
          totalDocuments: batchResult.totalDocuments,
          validatedDocuments: batchResult.validatedDocuments,
          acceptedDocuments: batchResult.acceptedDocuments,
          rejectedDocuments: batchResult.rejectedDocuments,
          totalAccrued: batchResult.totalAccrued,
          totalDeductions: batchResult.totalDeductions,
          netAmount: batchResult.netAmount,
          createdById: userId,
          documents: {
            create: batchResult.documents.map((d) => ({
              tenantId,
              employeeId: d.employeeId,
              consecutive: d.consecutive,
              documentNumber: d.documentNumber,
              documentType: d.documentType,
              providerMode: d.providerMode,
              status: d.status,
              cune: d.cune,
              qrUrl: d.qrUrl,
              issueDate: d.issueDate,
              workedDays: d.workedDays,
              totalAccrued: d.totalAccrued,
              totalDeductions: d.totalDeductions,
              netAmount: d.netAmount,
              nieBreakdownJson: d.nieBreakdown as any,
              xmlContent: d.xmlContent || null,
              providerPayloadJson: d.providerPayload || null,
              rejectionErrorsJson: d.rejectionErrors
                ? (d.rejectionErrors as any)
                : null,
            })),
          },
        },
        include: {
          period: true,
          documents: { take: 20 },
        },
      });

      // Update next consecutive
      if (settings) {
        await this.prisma.payrollSettings.update({
          where: { tenantId },
          data: {
            dianNextConsecutive: startConsecutive + batchResult.totalDocuments,
          },
        });
      }

      return createdBatch;
    } catch (error) {
      this.logger.error(
        `Error generating Electronic Payroll batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async getElectronicBatch(
    tenantId: string,
    batchId: string,
    query?: QueryElectronicDocumentsDto,
  ) {
    try {
      const batch = await this.prisma.payrollElectronicBatch.findFirst({
        where: { id: batchId, tenantId },
        include: { period: true },
      });
      if (!batch)
        throw new NotFoundException(
          'Lote de Nómina Electrónica no encontrado.',
        );

      const whereDocs: any = { tenantId, batchId };
      if (query?.status) whereDocs.status = query.status;
      if (query?.search) {
        whereDocs.OR = [
          { documentNumber: { contains: query.search, mode: 'insensitive' } },
          { cune: { contains: query.search, mode: 'insensitive' } },
          {
            employee: {
              OR: [
                { document: { contains: query.search, mode: 'insensitive' } },
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      const documents = await this.prisma.payrollElectronicDocument.findMany({
        where: whereDocs,
        orderBy: { consecutive: 'asc' },
        include: {
          employee: {
            select: {
              id: true,
              documentType: true,
              document: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {
        ...batch,
        documents,
      };
    } catch (error) {
      this.logger.error(
        `Error getting Electronic Payroll batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async transmitElectronicDocument(
    tenantId: string,
    docId: string,
    userId?: string,
  ) {
    try {
      const doc = await this.prisma.payrollElectronicDocument.findFirst({
        where: { id: docId, tenantId },
      });
      if (!doc)
        throw new NotFoundException('Documento electrónico no encontrado.');

      if (doc.status === ElectronicPayrollStatus.REJECTED) {
        throw new BadRequestException(
          'El documento presenta errores de validación y debe ser corregido antes de transmitir.',
        );
      }

      // Mark as TRANSMITTED_ACCEPTED
      const updated = await this.prisma.payrollElectronicDocument.update({
        where: { id: docId },
        data: {
          status: ElectronicPayrollStatus.TRANSMITTED_ACCEPTED,
          updatedById: userId,
        },
      });

      // Update parent batch counters
      await this.prisma.payrollElectronicBatch.update({
        where: { id: doc.batchId },
        data: {
          acceptedDocuments: { increment: 1 },
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Error transmitting Electronic Document: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async transmitAllElectronicBatch(
    tenantId: string,
    batchId: string,
    userId?: string,
  ) {
    try {
      const batch = await this.prisma.payrollElectronicBatch.findFirst({
        where: { id: batchId, tenantId },
      });
      if (!batch) throw new NotFoundException('Lote no encontrado.');

      await this.prisma.payrollElectronicDocument.updateMany({
        where: { batchId, tenantId, status: ElectronicPayrollStatus.VALIDATED },
        data: {
          status: ElectronicPayrollStatus.TRANSMITTED_ACCEPTED,
          updatedById: userId,
        },
      });

      const acceptedCount = await this.prisma.payrollElectronicDocument.count({
        where: {
          batchId,
          tenantId,
          status: ElectronicPayrollStatus.TRANSMITTED_ACCEPTED,
        },
      });

      const updatedBatch = await this.prisma.payrollElectronicBatch.update({
        where: { id: batchId },
        data: {
          status: ElectronicPayrollStatus.TRANSMITTED_ACCEPTED,
          acceptedDocuments: acceptedCount,
        },
      });

      return updatedBatch;
    } catch (error) {
      this.logger.error(
        `Error transmitting all electronic batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async createAdjustmentNote(
    tenantId: string,
    docId: string,
    dto: CreateAdjustmentNoteDto,
    userId?: string,
  ) {
    try {
      const origDoc = await this.prisma.payrollElectronicDocument.findFirst({
        where: { id: docId, tenantId },
        include: {
          employee: { include: { payrollProfile: true } },
          batch: true,
        },
      });
      if (!origDoc)
        throw new NotFoundException(
          'Documento electrónico original no encontrado.',
        );
      if (origDoc.status !== ElectronicPayrollStatus.TRANSMITTED_ACCEPTED) {
        throw new BadRequestException(
          'Solo documentos con estado TRANSMITTED_ACCEPTED pueden ser ajustados con Nota (103).',
        );
      }

      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const adjPrefix = settings?.dianAdjustmentPrefix || 'NA';
      const nextConsecutive = (settings?.dianNextConsecutive || 100) + 1;
      const documentNumber = `${adjPrefix}-${nextConsecutive}`;

      // Build adjustment note document
      const adjDoc = await this.prisma.payrollElectronicDocument.create({
        data: {
          tenantId,
          batchId: origDoc.batchId,
          employeeId: origDoc.employeeId,
          consecutive: nextConsecutive,
          documentNumber,
          documentType: dto.documentType,
          providerMode: origDoc.providerMode,
          status: ElectronicPayrollStatus.VALIDATED,
          cune: `ADJ-${origDoc.cune}`,
          qrUrl: origDoc.qrUrl,
          issueDate: new Date(),
          workedDays:
            dto.documentType === ElectronicDocumentType.ADJUSTMENT_NOTE_DELETE
              ? 0
              : origDoc.workedDays,
          totalAccrued:
            dto.documentType === ElectronicDocumentType.ADJUSTMENT_NOTE_DELETE
              ? 0
              : origDoc.totalAccrued,
          totalDeductions:
            dto.documentType === ElectronicDocumentType.ADJUSTMENT_NOTE_DELETE
              ? 0
              : origDoc.totalDeductions,
          netAmount:
            dto.documentType === ElectronicDocumentType.ADJUSTMENT_NOTE_DELETE
              ? 0
              : origDoc.netAmount,
          predecessorDocId: origDoc.id,
          predecessorCune: origDoc.cune,
          predecessorIssueDate: origDoc.issueDate,
          createdById: userId,
        },
      });

      // Mark original as REPLACED_BY_NOTE
      await this.prisma.payrollElectronicDocument.update({
        where: { id: docId },
        data: { status: ElectronicPayrollStatus.REPLACED_BY_NOTE },
      });

      return adjDoc;
    } catch (error) {
      this.logger.error(
        `Error creating adjustment note: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 4. INTERFAZ CONTABLE (WORLD OFFICE / HELISA)
  // ============================================================================

  public async generateAccountingBatch(
    tenantId: string,
    dto: GenerateAccountingBatchDto,
    userId?: string,
  ) {
    try {
      const [settings, tenant, period, settlements] = await Promise.all([
        this.prisma.payrollSettings.findUnique({ where: { tenantId } }),
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.payrollPeriod.findFirst({
          where: { id: dto.periodId, tenantId },
        }),
        this.prisma.payrollPeriodSettlement.findMany({
          where: { periodId: dto.periodId, tenantId },
          include: {
            employee: {
              include: {
                payrollProfile: {
                  include: {
                    epsEntity: true,
                    afpEntity: true,
                  },
                },
              },
            },
            primaryDependency: true,
            lines: {
              include: {
                concept: true,
              },
            },
          },
        }),
      ]);

      if (!tenant) throw new NotFoundException('Empresa/Tenant no encontrado.');
      if (!period) throw new NotFoundException('Periodo no encontrado.');
      if (settlements.length === 0) {
        throw new BadRequestException(
          'No hay liquidaciones en el periodo para generar interfaz contable.',
        );
      }

      const exportFormat =
        dto.exportFormat ||
        settings?.defaultAccountingFormat ||
        AccountingExportFormat.WORLD_OFFICE;

      const accountingConfig: AccountingBatchConfig = {
        periodId: period.id,
        periodCode: String(period.code),
        periodStartDate: period.startDate,
        periodEndDate: period.endDate,
        accountingDate: dto.accountingDate || period.endDate,
        companyNit: settings?.companyNit || '900123456',
        companyDv: settings?.companyDv || '1',
        companyLegalName:
          settings?.companyLegalName || tenant.name || 'SEGURIDAD NOXIA LTDA',
        exportFormat,
        batchNumber: dto.batchNumber,
      };

      const settlementInputs: AccountingSettlementInput[] = settlements.map(
        (s) => {
          const emp = s.employee;
          const dep = s.primaryDependency;

          return {
            employeeId: emp.id,
            documentNumber: emp.document,
            fullName: `${emp.lastName} ${emp.firstName}`,
            isInternalDependency: dep?.isInternal ?? false,
            costCenterCode: dep?.accountingCostCenter || '001',
            costCenterName: dep?.name || 'OPERATIVO GENERAL',
            dependencyCode: dep?.code || 101,
            netPay: Number(s.netPayAmount),
            lines: s.lines.map((l) => ({
              conceptCode: l.concept.code,
              conceptName: l.concept.name,
              nature: l.concept.nature as any,
              amount: Number(l.totalValue),
              pucAccountAdministrative: l.concept.adminPucAccount,
              pucAccountOperative: l.concept.operativePucAccount,
              pucAccountCounterpart: l.concept.creditCounterpartPuc,
              thirdPartyNit: l.concept.thirdPartyNit,
              epsNit: emp.payrollProfile?.epsEntity?.nit || null,
              afpNit: emp.payrollProfile?.afpEntity?.nit || null,
            })),
          };
        },
      );

      const batchResult = this.accountingEngine.generateAccountingBatch(
        settlementInputs,
        accountingConfig,
      );

      // Upsert batch
      const existing = await this.prisma.payrollAccountingBatch.findUnique({
        where: {
          tenantId_periodId_exportFormat: {
            tenantId,
            periodId: dto.periodId,
            exportFormat,
          },
        },
      });

      if (existing) {
        await this.prisma.payrollAccountingBatch.delete({
          where: { id: existing.id },
        });
      }

      const createdBatch = await this.prisma.payrollAccountingBatch.create({
        data: {
          tenantId,
          periodId: dto.periodId,
          exportFormat,
          batchNumber: batchResult.batchNumber,
          accountingDate: batchResult.accountingDate,
          totalDebit: batchResult.totalDebit,
          totalCredit: batchResult.totalCredit,
          isBalanced: batchResult.isBalanced,
          fileName: batchResult.fileName,
          totalLines: batchResult.totalLines,
          notes: dto.notes,
          createdById: userId,
          lines: {
            create: batchResult.lines.map((l) => ({
              tenantId,
              sequence: l.sequence,
              pucAccount: l.pucAccount,
              accountName: l.accountName,
              thirdPartyNit: l.thirdPartyNit,
              thirdPartyName: l.thirdPartyName,
              costCenterCode: l.costCenterCode,
              costCenterName: l.costCenterName,
              dependencyCode: l.dependencyCode,
              conceptCode: l.conceptCode,
              debitAmount: l.debitAmount,
              creditAmount: l.creditAmount,
              description: l.description,
            })),
          },
        },
        include: {
          period: true,
          lines: { take: 30 },
        },
      });

      return {
        ...createdBatch,
        formattedContent: batchResult.formattedContent,
      };
    } catch (error) {
      this.logger.error(
        `Error generating accounting batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async getAccountingBatch(tenantId: string, batchId: string) {
    try {
      const batch = await this.prisma.payrollAccountingBatch.findFirst({
        where: { id: batchId, tenantId },
        include: {
          period: true,
          lines: { orderBy: { sequence: 'asc' } },
        },
      });
      if (!batch) throw new NotFoundException('Lote contable no encontrado.');
      return batch;
    } catch (error) {
      this.logger.error(
        `Error getting accounting batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async exportAccountingCsv(tenantId: string, batchId: string) {
    try {
      const batch = await this.prisma.payrollAccountingBatch.findFirst({
        where: { id: batchId, tenantId },
        include: {
          period: true,
          lines: { orderBy: { sequence: 'asc' } },
        },
      });
      if (!batch) throw new NotFoundException('Lote contable no encontrado.');

      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const config: AccountingBatchConfig = {
        periodId: batch.periodId,
        periodCode: String(batch.period.code),
        periodStartDate: batch.period.startDate,
        periodEndDate: batch.period.endDate,
        accountingDate: batch.accountingDate,
        companyNit: settings?.companyNit || '900123456',
        companyDv: settings?.companyDv || '1',
        companyLegalName: settings?.companyLegalName || 'SEGURIDAD NOXIA LTDA',
        exportFormat: batch.exportFormat,
      };

      const dateStr = new Date(batch.accountingDate).toISOString().slice(0, 10);
      const linesOut = batch.lines.map((l) => ({
        sequence: l.sequence,
        pucAccount: l.pucAccount,
        accountName: l.accountName,
        thirdPartyNit: l.thirdPartyNit,
        thirdPartyName: l.thirdPartyName,
        costCenterCode: l.costCenterCode,
        costCenterName: l.costCenterName,
        dependencyCode: l.dependencyCode,
        conceptCode: l.conceptCode,
        debitAmount: Number(l.debitAmount),
        creditAmount: Number(l.creditAmount),
        description: l.description,
      }));

      let content = '';
      if (batch.exportFormat === AccountingExportFormat.WORLD_OFFICE) {
        content = this.accountingEngine.formatWorldOfficeCsv(
          linesOut,
          config,
          batch.batchNumber,
          dateStr,
        );
      } else {
        content = this.accountingEngine.formatHelisaCsv(
          linesOut,
          config,
          batch.batchNumber,
          dateStr,
        );
      }

      return {
        fileName:
          batch.fileName ||
          `NOMINA_CONTABLE_${batch.exportFormat}_${dateStr}.csv`,
        content,
      };
    } catch (error) {
      this.logger.error(
        `Error exporting accounting CSV: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 5. CERTIFICADOS (FORMULARIO 220 DIAN & CONSTANCIAS LABORALES)
  // ============================================================================

  public async generateForm220Certificates(
    tenantId: string,
    dto: GenerateForm220Dto,
    userId?: string,
  ) {
    try {
      const [settings, tenant, employees] = await Promise.all([
        this.prisma.payrollSettings.findUnique({ where: { tenantId } }),
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.employee.findMany({
          where: {
            tenantId,
            ...(dto.employeeId ? { id: dto.employeeId } : {}),
          },
          include: {
            payrollProfile: true,
          },
        }),
      ]);

      if (!tenant) throw new NotFoundException('Empresa no encontrada.');
      if (employees.length === 0)
        throw new NotFoundException(
          'No se encontraron empleados para certificar.',
        );

      const results: any[] = [];

      for (const emp of employees) {
        const yearStart = new Date(dto.year, 0, 1);
        const yearEnd = new Date(dto.year, 11, 31, 23, 59, 59);

        const settlements = await this.prisma.payrollPeriodSettlement.findMany({
          where: {
            tenantId,
            employeeId: emp.id,
            period: {
              startDate: { gte: yearStart },
              endDate: { lte: yearEnd },
            },
          },
          include: {
            lines: {
              include: { concept: true },
            },
          },
        });

        let salaries = 0;
        let socialBenefits = 0;
        let nonSalarial = 0;
        const otherInc = 0;
        let severancePaid = 0;
        let healthDed = 0;
        let pensionDed = 0;
        let withhold = 0;

        for (const s of settlements) {
          salaries += Number(s.basicSalaryEarned);
          healthDed += Number(s.ibcEps) * 0.04;
          pensionDed += Number(s.ibcAfp) * 0.04;
          withhold += Number(s.withholdingTaxAmount || 0);

          for (const l of s.lines) {
            if (l.concept.code === 105) nonSalarial += Number(l.totalValue);
            if (l.concept.code >= 110 && l.concept.code <= 130)
              salaries += Number(l.totalValue);
            if (l.concept.code === 301 || l.concept.code === 302)
              socialBenefits += Number(l.totalValue);
            if (l.concept.code === 303) severancePaid += Number(l.totalValue);
          }
        }

        const input: Form220Input = {
          year: dto.year,
          expeditionCity:
            dto.expeditionCity || settings?.daneCityName || 'BOGOTÁ D.C.',
          retentionAgentNit: settings?.companyNit || '900123456',
          retentionAgentName:
            settings?.companyLegalName || tenant.name || 'SEGURIDAD NOXIA LTDA',
          employeeId: emp.id,
          employeeDocument: emp.document,
          employeeFullName: `${emp.firstName} ${emp.lastName}`,
          salariesEarned: salaries,
          socialBenefitsEarned: socialBenefits,
          nonSalarialAllowances: nonSalarial,
          otherIncome: otherInc,
          severancePaidDirectly: severancePaid,
          healthDeductions: healthDed,
          pensionAndFspDeductions: pensionDed,
          withholdingTax: withhold,
        };

        const certResult = this.form220Engine.generateFormulario220(input);

        const upserted = await this.prisma.payrollTaxCertificate220.upsert({
          where: {
            tenantId_employeeId_year: {
              tenantId,
              employeeId: emp.id,
              year: dto.year,
            },
          },
          create: {
            tenantId,
            employeeId: emp.id,
            year: dto.year,
            issueDate: certResult.issueDate,
            certifiedFromDate: certResult.certifiedFromDate,
            certifiedToDate: certResult.certifiedToDate,
            expeditionCity: certResult.expeditionCity,
            retentionAgentNit: certResult.retentionAgentNit,
            retentionAgentName: certResult.retentionAgentName,
            employeeDocument: certResult.employeeDocument,
            employeeFullName: certResult.employeeFullName,
            row36Salaries: certResult.row36Salaries,
            row37Honoraries: certResult.row37Honoraries,
            row38SocialBenefits: certResult.row38SocialBenefits,
            row39AllowancesNonSalarial: certResult.row39AllowancesNonSalarial,
            row40OtherIncome: certResult.row40OtherIncome,
            row41Indemnifications: certResult.row41Indemnifications,
            row46SeverancePaid: certResult.row46SeverancePaid,
            row47PensionsIncome: certResult.row47PensionsIncome,
            row49TotalGrossIncome: certResult.row49TotalGrossIncome,
            row50HealthDeduction: certResult.row50HealthDeduction,
            row51PensionAndFspDeduction: certResult.row51PensionAndFspDeduction,
            row52VoluntaryPensionDeduction:
              certResult.row52VoluntaryPensionDeduction,
            row53AfcDeduction: certResult.row53AfcDeduction,
            row55WithholdingTax: certResult.row55WithholdingTax,
            qrCodeData: certResult.qrCodeData,
            createdById: userId,
          },
          update: {
            issueDate: certResult.issueDate,
            row36Salaries: certResult.row36Salaries,
            row38SocialBenefits: certResult.row38SocialBenefits,
            row39AllowancesNonSalarial: certResult.row39AllowancesNonSalarial,
            row46SeverancePaid: certResult.row46SeverancePaid,
            row49TotalGrossIncome: certResult.row49TotalGrossIncome,
            row50HealthDeduction: certResult.row50HealthDeduction,
            row51PensionAndFspDeduction: certResult.row51PensionAndFspDeduction,
            row55WithholdingTax: certResult.row55WithholdingTax,
            qrCodeData: certResult.qrCodeData,
            updatedById: userId,
          },
        });

        results.push(upserted);
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Error generating Form 220 certificates: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async getForm220Certificates(
    tenantId: string,
    year: number,
    employeeId?: string,
  ) {
    try {
      return await this.prisma.payrollTaxCertificate220.findMany({
        where: {
          tenantId,
          year,
          ...(employeeId ? { employeeId } : {}),
        },
        include: {
          employee: {
            select: {
              id: true,
              documentType: true,
              document: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { employeeFullName: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error getting Form 220 certificates: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async downloadForm220Pdf(
    tenantId: string,
    certId: string,
  ): Promise<Buffer> {
    try {
      const cert = await this.prisma.payrollTaxCertificate220.findFirst({
        where: { id: certId, tenantId },
        include: { employee: true },
      });
      if (!cert)
        throw new NotFoundException(
          'Certificado Formulario 220 no encontrado.',
        );

      const pdfData: Form220PdfData = {
        company: {
          legalName: cert.retentionAgentName,
          nit: cert.retentionAgentNit,
        },
        employee: {
          documentType: cert.employee.documentType,
          document: cert.employeeDocument,
          fullName: cert.employeeFullName,
        },
        year: cert.year,
        issueDate: cert.issueDate.toISOString().slice(0, 10),
        certifiedFromDate: cert.certifiedFromDate.toISOString().slice(0, 10),
        certifiedToDate: cert.certifiedToDate.toISOString().slice(0, 10),
        expeditionCity: cert.expeditionCity,
        row36Salaries: Number(cert.row36Salaries),
        row37Honoraries: Number(cert.row37Honoraries),
        row38SocialBenefits: Number(cert.row38SocialBenefits),
        row39AllowancesNonSalarial: Number(cert.row39AllowancesNonSalarial),
        row40OtherIncome: Number(cert.row40OtherIncome),
        row41Indemnifications: Number(cert.row41Indemnifications),
        row46SeverancePaid: Number(cert.row46SeverancePaid),
        row47PensionsIncome: Number(cert.row47PensionsIncome),
        row49TotalGrossIncome: Number(cert.row49TotalGrossIncome),
        row50HealthDeduction: Number(cert.row50HealthDeduction),
        row51PensionAndFspDeduction: Number(cert.row51PensionAndFspDeduction),
        row52VoluntaryPensionDeduction: Number(
          cert.row52VoluntaryPensionDeduction,
        ),
        row53AfcDeduction: Number(cert.row53AfcDeduction),
        row55WithholdingTax: Number(cert.row55WithholdingTax),
        qrCodeData: cert.qrCodeData || '',
      };

      return await this.pdfService.generateFormulario220Pdf(pdfData);
    } catch (error) {
      this.logger.error(
        `Error generating Form 220 PDF: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  public async downloadLaborCertificatePdf(
    tenantId: string,
    dto: GenerateLaborCertificateDto,
  ): Promise<Buffer> {
    try {
      const [settings, tenant, emp] = await Promise.all([
        this.prisma.payrollSettings.findUnique({ where: { tenantId } }),
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.employee.findFirst({
          where: { id: dto.employeeId, tenantId },
          include: {
            payrollProfile: {
              include: {
                epsEntity: true,
                afpEntity: true,
                ccfEntity: true,
              },
            },
            positionRef: true,
          },
        }),
      ]);

      if (!tenant) throw new NotFoundException('Empresa no encontrada.');
      if (!emp) throw new NotFoundException('Empleado no encontrado.');

      const basicSalary = emp.payrollProfile?.customBaseSalary
        ? Number(emp.payrollProfile.customBaseSalary)
        : Number(settings?.smmlv || 1750905);

      let averageSalary: number | null = null;
      if (dto.includeAverageSalary) {
        const lastSettlements =
          await this.prisma.payrollPeriodSettlement.findMany({
            where: { tenantId, employeeId: emp.id },
            orderBy: { createdAt: 'desc' },
            take: 3,
          });
        if (lastSettlements.length > 0) {
          const sumEarnings = lastSettlements.reduce(
            (acc, s) => acc + Number(s.totalEarnings),
            0,
          );
          averageSalary = Math.round(sumEarnings / lastSettlements.length);
        }
      }

      const pdfData: LaborCertificatePdfData = {
        company: {
          legalName:
            settings?.companyLegalName || tenant.name || 'SEGURIDAD NOXIA LTDA',
          nit: settings?.companyNit || '900123456',
          dv: settings?.companyDv || '1',
          city: settings?.daneCityName || 'Bogotá D.C.',
          address: settings?.companyAddress || 'Calle 100 # 15-20',
          phone: settings?.companyPhone || '601-3001234',
          signerName: settings?.signatureName1 || 'DIRECTOR DE TALENTO HUMANO',
          signerRole: settings?.signatureRole1 || 'Dirección de Talento Humano',
        },
        employee: {
          documentType: emp.documentType,
          document: emp.document,
          fullName: `${emp.firstName} ${emp.lastName}`,
          hireDate: emp.entryDate
            ? new Date(emp.entryDate).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : '01 de enero de 2025',
          retirementDate: emp.retiredAt
            ? new Date(emp.retiredAt).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : null,
          isActive: emp.isActive,
          positionName: emp.positionRef?.name || 'Guarda de Seguridad',
          contractTypeName:
            emp.payrollProfile?.contractType || 'Término Indefinido',
          basicSalary,
          averageSalary,
          includeAverageSalary: dto.includeAverageSalary ?? false,
          epsName: emp.payrollProfile?.epsEntity?.name || 'Sanitas',
          afpName: emp.payrollProfile?.afpEntity?.name || 'Porvenir',
          ccfName: emp.payrollProfile?.ccfEntity?.name || 'Compensar',
          arlRiskClass:
            emp.payrollProfile?.arlRiskClass || 'Clase IV (Riesgo Alto)',
        },
      };

      return await this.pdfService.generateLaborCertificatePdf(pdfData);
    } catch (error) {
      this.logger.error(
        `Error downloading Labor Certificate PDF: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 6. REPORTERÍA BI & ACUMULADOS ANUALES
  // ============================================================================

  public async getAnnualAccumulatedReport(
    tenantId: string,
    dto: QueryAccumulatedReportDto,
  ) {
    try {
      const yearStart = new Date(dto.year, 0, 1);
      const yearEnd = new Date(dto.year, 11, 31, 23, 59, 59);

      const settlements = await this.prisma.payrollPeriodSettlement.findMany({
        where: {
          tenantId,
          ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
          period: {
            startDate: { gte: yearStart },
            endDate: { lte: yearEnd },
          },
        },
        include: {
          employee: true,
          primaryDependency: true,
          period: true,
          lines: {
            include: { concept: true },
          },
        },
      });

      const inputs: AnnualSettlementInput[] = settlements.map((s) => {
        const emp = s.employee;
        const dep = s.primaryDependency;
        const pMonth = new Date(s.period.startDate).getMonth() + 1;

        let ot = 0;
        let trans = 0;
        const nonSal = 0;
        let otherEarn = 0;
        let otherDed = 0;

        for (const l of s.lines) {
          if (l.concept.code === 105) trans += Number(l.totalValue);
          if (l.concept.code >= 110 && l.concept.code <= 130)
            ot += Number(l.totalValue);
          if (l.concept.code >= 140 && l.concept.code <= 199)
            otherEarn += Number(l.totalValue);
          if (l.concept.code >= 210 && l.concept.code <= 299)
            otherDed += Number(l.totalValue);
        }

        return {
          employeeId: emp.id,
          employeeDocument: emp.document,
          employeeFullName: `${emp.lastName} ${emp.firstName}`,
          costCenterCode: dep?.accountingCostCenter || '001',
          costCenterName: dep?.name || 'OPERATIVO GENERAL',
          dependencyCode: dep?.code || 101,
          dependencyName: dep?.name || 'OPERATIVO GENERAL',
          month: pMonth,
          year: dto.year,
          basicSalary: Number(s.basicSalaryEarned),
          overtimeAndSurcharges: ot,
          transportAllowance: trans,
          nonSalarialAllowances: nonSal,
          incapacitiesAndLeaves: 0,
          otherEarnings: otherEarn,
          totalEarnings: Number(s.totalEarnings),
          healthDeduction: Number(s.ibcEps) * 0.04,
          pensionDeduction: Number(s.ibcAfp) * 0.04,
          fspDeduction: 0,
          withholdingTax: Number(s.withholdingTaxAmount || 0),
          otherDeductions: otherDed,
          totalDeductions: Number(s.totalDeductions),
          netPay: Number(s.netPayAmount),
        };
      });

      return this.form220Engine.generateAnnualAccumulatedMatrix(
        inputs,
        dto.year,
      );
    } catch (error) {
      this.logger.error(
        `Error loading annual accumulated report: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
