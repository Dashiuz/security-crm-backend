import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayrollEmployeesRepository } from '../repositories/payroll-employees.repository';
import {
  RenovaExcelExporterService,
  RenovaExportItem,
} from './renova-excel-exporter.service';
import { PayrollPayslipPdfService } from './payroll-payslip-pdf.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UpsertPayrollProfileDto,
  CreateFamilyMemberDto,
  UpdateRequirementCheckDto,
  CreateSvspCourseDto,
  CreateInternalTrainingDto,
  QueryPayrollEmployeesDto,
  ApplySalaryAdjustmentDto,
} from '../dtos/payroll-employee-dossier.dto';

export interface EmployeeWithCalculatedFields {
  id: string;
  fullName: string;
  firstName: string;
  secondName?: string | null;
  lastName: string;
  maternalSurname?: string | null;
  documentType: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  entryDate: string;
  isActive: boolean;
  isRetired: boolean;
  payrollProfile: any | null;
  currentSvspCourse: any | null;
  svspStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';
  svspDaysRemaining: number | null;
  contractAlertStatus: 'OK' | 'PREAVISO_REQUIRED' | 'EXPIRED';
  folderCompletionPct: number;
  isBlockedForRehire: boolean;
}

@Injectable()
export class PayrollEmployeesService {
  private readonly logger = new Logger(PayrollEmployeesService.name);

  constructor(
    private readonly repository: PayrollEmployeesRepository,
    private readonly renovaExporter: RenovaExcelExporterService,
    private readonly payslipPdfService: PayrollPayslipPdfService,
    private readonly prisma: PrismaService,
  ) {}

  private calculateSvspStatus(
    course: any | null,
    today = new Date(),
  ): {
    status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';
    daysRemaining: number | null;
  } {
    if (!course || !course.expiryDate) {
      return { status: 'MISSING', daysRemaining: null };
    }

    const expiry = new Date(course.expiryDate);
    const diffMs = expiry.getTime() - today.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return { status: 'EXPIRED', daysRemaining: days };
    }
    if (days <= 30) {
      return { status: 'EXPIRING_SOON', daysRemaining: days };
    }
    return { status: 'VALID', daysRemaining: days };
  }

  private calculateContractAlert(
    profile: any | null,
    isActive: boolean,
    today = new Date(),
  ): 'OK' | 'PREAVISO_REQUIRED' | 'EXPIRED' {
    if (
      !isActive ||
      !profile ||
      profile.contractType !== 'FIXED_TERM' ||
      !profile.contractEndDate
    ) {
      return 'OK';
    }

    const endDate = new Date(profile.contractEndDate);
    const diffMs = endDate.getTime() - today.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) return 'EXPIRED';
    if (days <= 35) return 'PREAVISO_REQUIRED';
    return 'OK';
  }

  private calculateFolderCompletion(checks: any[]): number {
    const mandatoryChecks = checks.filter(
      (c) => c.requirement && c.requirement.isMandatory,
    );
    if (mandatoryChecks.length === 0) return 100;

    const completed = mandatoryChecks.filter((c) => {
      if (c.status === 'WAIVED') return true;
      if (c.status === 'VERIFIED') {
        if (c.expiryDate) {
          return new Date(c.expiryDate).getTime() >= new Date().getTime();
        }
        return true;
      }
      return false;
    });

    return Math.round((completed.length / mandatoryChecks.length) * 100);
  }

  async findEmployees(
    tenantId: string,
    filters: QueryPayrollEmployeesDto,
  ): Promise<EmployeeWithCalculatedFields[]> {
    try {
      const rows = await this.repository.findEmployeesWithPayroll(
        tenantId,
        filters,
      );
      const today = new Date();

      const enriched: EmployeeWithCalculatedFields[] = rows.map((emp) => {
        const latestCourse =
          emp.svspCourses && emp.svspCourses.length > 0
            ? emp.svspCourses[0]
            : null;
        const { status: svspStatus, daysRemaining: svspDaysRemaining } =
          this.calculateSvspStatus(latestCourse, today);
        const contractAlertStatus = this.calculateContractAlert(
          emp.payrollProfile,
          emp.isActive,
          today,
        );
        const folderCompletionPct = this.calculateFolderCompletion(
          emp.requirementChecks || [],
        );

        return {
          id: emp.id,
          fullName: emp.fullName,
          firstName: emp.firstName,
          secondName: emp.secondName,
          lastName: emp.lastName,
          maternalSurname: emp.maternalSurname,
          documentType: emp.documentType,
          document: emp.document,
          email: emp.email,
          phone: emp.phone,
          entryDate: emp.entryDate
            ? emp.entryDate.toISOString().split('T')[0]
            : '',
          isActive: emp.isActive,
          isRetired: emp.isRetired,
          payrollProfile: emp.payrollProfile,
          currentSvspCourse: latestCourse,
          svspStatus,
          svspDaysRemaining,
          contractAlertStatus,
          folderCompletionPct,
          isBlockedForRehire: emp.payrollProfile?.isBlockedForRehire ?? false,
        };
      });

      if (filters.svspStatus) {
        return enriched.filter((e) => e.svspStatus === filters.svspStatus);
      }

      return enriched;
    } catch (err: any) {
      this.logger.error(
        `Error en findEmployees [tenantId=${tenantId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async getKpis(tenantId: string) {
    try {
      const employees = await this.findEmployees(tenantId, { isActive: true });

      const totalActiveEmployees = employees.length;
      let svspValidCount = 0;
      let svspAlertCount = 0;
      let contractsExpiringSoonCount = 0;
      let incompleteFoldersCount = 0;

      for (const emp of employees) {
        if (emp.svspStatus === 'VALID') {
          svspValidCount++;
        } else if (
          emp.svspStatus === 'EXPIRING_SOON' ||
          emp.svspStatus === 'EXPIRED'
        ) {
          svspAlertCount++;
        }

        if (emp.contractAlertStatus === 'PREAVISO_REQUIRED') {
          contractsExpiringSoonCount++;
        }

        if (emp.folderCompletionPct < 100) {
          incompleteFoldersCount++;
        }
      }

      return {
        totalActiveEmployees,
        svspValidCount,
        svspAlertCount,
        contractsExpiringSoonCount,
        incompleteFoldersCount,
      };
    } catch (err: any) {
      this.logger.error(
        `Error calculando KPIs de nómina [tenantId=${tenantId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async getEmployeeDossier(tenantId: string, employeeId: string) {
    try {
      const { employee, allRequirements } =
        await this.repository.findEmployeeDossier(tenantId, employeeId);

      // Combinar los requisitos del tenant con los cheques del empleado para matriz completa
      const checkMap = new Map<string, any>();
      (employee.requirementChecks || []).forEach((c) => {
        checkMap.set(c.requirementId, c);
      });

      const mergedRequirements = allRequirements.map((req) => {
        const check = checkMap.get(req.id);
        return {
          requirementId: req.id,
          code: req.code,
          name: req.name,
          isMandatory: req.isMandatory,
          hasExpiry: req.hasExpiry,
          status: check?.status || 'PENDING',
          issueDate: check?.issueDate
            ? check.issueDate.toISOString().split('T')[0]
            : null,
          expiryDate: check?.expiryDate
            ? check.expiryDate.toISOString().split('T')[0]
            : null,
          verifiedAt: check?.verifiedAt ? check.verifiedAt.toISOString() : null,
          s3Key: check?.s3Key || null,
          fileName: check?.fileName || null,
          notes: check?.notes || null,
          checkId: check?.id || null,
        };
      });

      const latestCourse =
        employee.svspCourses?.find((c) => c.isCurrent) ||
        employee.svspCourses?.[0] ||
        null;
      const { status: svspStatus, daysRemaining: svspDaysRemaining } =
        this.calculateSvspStatus(latestCourse);
      const contractAlertStatus = this.calculateContractAlert(
        employee.payrollProfile,
        employee.isActive,
      );
      const folderCompletionPct = this.calculateFolderCompletion(
        mergedRequirements.map((r) => ({
          requirement: { isMandatory: r.isMandatory },
          status: r.status,
          expiryDate: r.expiryDate,
        })),
      );

      return {
        employee: {
          id: employee.id,
          fullName: employee.fullName,
          firstName: employee.firstName,
          secondName: employee.secondName,
          lastName: employee.lastName,
          maternalSurname: employee.maternalSurname,
          documentType: employee.documentType,
          document: employee.document,
          email: employee.email,
          phone: employee.phone,
          address: employee.address,
          gender: employee.gender,
          birthdate: employee.birthdate
            ? employee.birthdate.toISOString().split('T')[0]
            : null,
          entryDate: employee.entryDate
            ? employee.entryDate.toISOString().split('T')[0]
            : null,
          isActive: employee.isActive,
          isRetired: employee.isRetired,
          retiredAt: employee.retiredAt
            ? employee.retiredAt.toISOString().split('T')[0]
            : null,
          departmentName: employee.departmentRef?.name || null,
          positionName: employee.positionRef?.name || null,
        },
        payrollProfile: employee.payrollProfile,
        familyMembers: employee.familyMembers,
        requirementMatrix: mergedRequirements,
        svspCourses: employee.svspCourses,
        internalTrainings: employee.internalTrainings,
        salaryHistories: employee.salaryHistories || [],
        periodSettlements: (employee.periodSettlements || []).map((s: any) => ({
          id: s.id,
          periodId: s.periodId,
          periodLabel: s.period?.label || 'Periodo',
          startDate: s.period?.startDate
            ? s.period.startDate.toISOString().split('T')[0]
            : '',
          endDate: s.period?.endDate
            ? s.period.endDate.toISOString().split('T')[0]
            : '',
          status: s.status,
          workedDays: s.workedDays,
          totalEarnings: Number(s.totalEarnings),
          totalDeductions: Number(s.totalDeductions),
          netPayAmount: Number(s.netPayAmount),
          payslipEmailStatus: s.payslipEmailStatus,
          createdAt: s.createdAt,
        })),
        svspStatus,
        svspDaysRemaining,
        contractAlertStatus,
        folderCompletionPct,
      };
    } catch (err: any) {
      this.logger.error(
        `Error obteniendo expediente 360° [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async upsertPayrollProfile(
    tenantId: string,
    employeeId: string,
    dto: UpsertPayrollProfileDto,
  ) {
    try {
      return await this.repository.upsertPayrollProfile(
        tenantId,
        employeeId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error en upsertPayrollProfile [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async addFamilyMember(
    tenantId: string,
    employeeId: string,
    dto: CreateFamilyMemberDto,
  ) {
    try {
      return await this.repository.createFamilyMember(
        tenantId,
        employeeId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error en addFamilyMember [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async deleteFamilyMember(tenantId: string, id: string) {
    try {
      return await this.repository.deleteFamilyMember(tenantId, id);
    } catch (err: any) {
      this.logger.error(
        `Error en deleteFamilyMember [id=${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async updateRequirementCheck(
    tenantId: string,
    employeeId: string,
    requirementId: string,
    dto: UpdateRequirementCheckDto,
  ) {
    try {
      return await this.repository.updateRequirementCheck(
        tenantId,
        employeeId,
        requirementId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error en updateRequirementCheck [requirementId=${requirementId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async addSvspCourse(
    tenantId: string,
    employeeId: string,
    dto: CreateSvspCourseDto,
  ) {
    try {
      return await this.repository.createSvspCourse(tenantId, employeeId, dto);
    } catch (err: any) {
      this.logger.error(
        `Error en addSvspCourse [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async deleteSvspCourse(tenantId: string, id: string) {
    try {
      return await this.repository.deleteSvspCourse(tenantId, id);
    } catch (err: any) {
      this.logger.error(
        `Error en deleteSvspCourse [id=${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async addInternalTraining(
    tenantId: string,
    employeeId: string,
    dto: CreateInternalTrainingDto,
  ) {
    try {
      return await this.repository.createInternalTraining(
        tenantId,
        employeeId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error en addInternalTraining [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async deleteInternalTraining(tenantId: string, id: string) {
    try {
      return await this.repository.deleteInternalTraining(tenantId, id);
    } catch (err: any) {
      this.logger.error(
        `Error en deleteInternalTraining [id=${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async exportRenovaExcel(tenantId: string): Promise<Buffer> {
    try {
      const { settings, employees } =
        await this.repository.findDataForRenovaExport(tenantId);

      const companyNit = settings?.companyNit || '900000000';
      const companyName =
        settings?.companyLegalName || 'EMPRESA DE SEGURIDAD PRIVADA';
      const today = new Date();

      const items: RenovaExportItem[] = employees.map((emp) => {
        const profile = emp.payrollProfile;
        const course = emp.svspCourses?.[0] || null;

        let status: 'VIGENTE' | 'POR VENCER' | 'VENCIDO' | 'SIN CURSO' =
          'SIN CURSO';
        if (course && course.expiryDate) {
          const diffDays = Math.ceil(
            (new Date(course.expiryDate).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          if (diffDays < 0) status = 'VENCIDO';
          else if (diffDays <= 30) status = 'POR VENCER';
          else status = 'VIGENTE';
        }

        return {
          companyNit,
          companyName,
          documentType: emp.documentType,
          document: emp.document,
          lastName: (emp.lastName || '').toUpperCase(),
          maternalSurname: (emp.maternalSurname || '').toUpperCase(),
          firstName: (emp.firstName || '').toUpperCase(),
          secondName: (emp.secondName || '').toUpperCase(),
          gender: emp.gender || 'M',
          birthdate: emp.birthdate
            ? emp.birthdate.toISOString().split('T')[0]
            : '',
          entryDate: emp.entryDate
            ? emp.entryDate.toISOString().split('T')[0]
            : '',
          daneCityCode: profile?.daneCityCode || '11001',
          daneCityName: (profile?.daneCityName || 'BOGOTÁ D.C.').toUpperCase(),
          dependencyName: (
            profile?.primaryDependency?.name || 'DISPONIBLE'
          ).toUpperCase(),
          svspCourseCode: course?.svspLevel?.code || '',
          svspCourseName: (
            course?.svspLevel?.name || 'SIN CURSO'
          ).toUpperCase(),
          academyNit: course?.academy?.nit || '',
          academyName: (course?.academy?.name || 'NO REGISTRADA').toUpperCase(),
          nroCode: course?.nroCode || '',
          issueDate: course?.issueDate
            ? course.issueDate.toISOString().split('T')[0]
            : '',
          expiryDate: course?.expiryDate
            ? course.expiryDate.toISOString().split('T')[0]
            : '',
          status,
        };
      });

      return await this.renovaExporter.generateRenovaExcelBuffer(
        items,
        companyName,
        companyNit,
      );
    } catch (err: any) {
      this.logger.error(
        `Error exportando archivo RENOVA [tenantId=${tenantId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async applySalaryAdjustment(
    tenantId: string,
    employeeId: string,
    dto: ApplySalaryAdjustmentDto,
    userId?: string,
  ) {
    try {
      return await this.repository.applySalaryAdjustment(
        tenantId,
        employeeId,
        dto,
        userId,
      );
    } catch (err: any) {
      this.logger.error(
        `Error aplicando ajuste salarial a empleado [${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async getPayslipPdf(
    tenantId: string,
    employeeId: string,
    settlementId: string,
    groupOvertime = false,
  ): Promise<Buffer> {
    try {
      const settlement = await this.repository.findSettlementForPayslip(
        tenantId,
        employeeId,
        settlementId,
      );

      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const renderItem = {
        settlementId: settlement.id,
        periodLabel: settlement.period?.label || 'Periodo de Nómina',
        startDate: settlement.period?.startDate
          ? settlement.period.startDate.toISOString().split('T')[0]
          : '',
        endDate: settlement.period?.endDate
          ? settlement.period.endDate.toISOString().split('T')[0]
          : '',
        paymentDate: settlement.period?.paymentDate
          ? settlement.period.paymentDate.toISOString().split('T')[0]
          : null,
        company: {
          legalName: settings?.companyLegalName || 'EMPRESA DE SEGURIDAD',
          nit: settings?.companyNit || '900000000',
          dv: settings?.companyDv || '1',
          city: settings?.daneCityName || 'BOGOTÁ D.C.',
          signatureName: settings?.signatureName1 || 'PAGADOR AUTORIZADO',
          signatureRole: settings?.signatureRole1 || 'Dirección Financiera',
        },
        employee: {
          documentType: settlement.employee.documentType,
          document: settlement.employee.document,
          fullName: settlement.employee.fullName,
          positionName: 'Personal Operativo',
          branchName: settlement.branch?.name || 'Principal',
          dependencyName: settlement.primaryDependency?.name || 'OPERACIONES',
          baseSalaryMonthly: Number(settlement.baseSalaryMonthly),
          bankName: settlement.bank?.name || 'Por ventanilla',
          accountNumber: settlement.bankAccountNumber || 'N/A',
          epsName: 'EPS Afiliada',
          afpName: 'AFP Afiliada',
        },
        workedDays: settlement.workedDays,
        totalEarnings: Number(settlement.totalEarnings),
        totalDeductions: Number(settlement.totalDeductions),
        netPayAmount: Number(settlement.netPayAmount),
        lines: settlement.lines.map((l: any) => ({
          conceptCode: l.concept.code,
          conceptName: l.concept.name,
          nature: l.nature,
          quantity: Number(l.quantity),
          totalValue: Number(l.totalValue),
        })),
        groupOvertime,
      };

      return await this.payslipPdfService.generatePayslipsPdf([renderItem]);
    } catch (err: any) {
      this.logger.error(
        `Error generando desprendible PDF para empleado [${employeeId}], liquidación [${settlementId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }
}
