import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UpsertPayrollProfileDto,
  CreateFamilyMemberDto,
  UpdateRequirementCheckDto,
  CreateSvspCourseDto,
  CreateInternalTrainingDto,
  QueryPayrollEmployeesDto,
} from '../dtos/payroll-employee-dossier.dto';

@Injectable()
export class PayrollEmployeesRepository {
  private readonly logger = new Logger(PayrollEmployeesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findEmployeesWithPayroll(
    tenantId: string,
    filters: QueryPayrollEmployeesDto,
  ) {
    try {
      const where: any = { tenantId };

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.search) {
        const term = filters.search.trim();
        where.OR = [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { fullName: { contains: term, mode: 'insensitive' } },
          { document: { contains: term, mode: 'insensitive' } },
          {
            svspCourses: {
              some: {
                nroCode: { contains: term, mode: 'insensitive' },
              },
            },
          },
        ];
      }

      if (filters.dependencyId) {
        where.payrollProfile = {
          ...(where.payrollProfile || {}),
          primaryDependencyId: filters.dependencyId,
        };
      }

      if (filters.branchId) {
        where.payrollProfile = {
          ...(where.payrollProfile || {}),
          branchId: filters.branchId,
        };
      }

      const rows = await this.prisma.employee.findMany({
        where,
        include: {
          payrollProfile: {
            include: {
              branch: true,
              primaryDependency: true,
              epsEntity: true,
              afpEntity: true,
              cesantiasEntity: true,
              ccfEntity: true,
              bank: true,
              exitReason: true,
            },
          },
          svspCourses: {
            where: { isCurrent: true },
            include: {
              svspLevel: true,
              academy: true,
            },
            orderBy: { expiryDate: 'desc' },
            take: 1,
          },
          requirementChecks: {
            include: { requirement: true },
          },
          familyMembers: true,
          internalTrainings: {
            orderBy: { trainingDate: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      return rows;
    } catch (err: any) {
      this.logger.error(
        `Error buscando empleados de nómina [tenantId=${tenantId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async findEmployeeDossier(tenantId: string, employeeId: string) {
    try {
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        include: {
          departmentRef: true,
          positionRef: true,
          payrollProfile: {
            include: {
              branch: true,
              primaryDependency: true,
              epsEntity: true,
              afpEntity: true,
              cesantiasEntity: true,
              ccfEntity: true,
              bank: true,
              exitReason: true,
            },
          },
          familyMembers: {
            orderBy: { createdAt: 'desc' },
          },
          requirementChecks: {
            include: { requirement: true },
            orderBy: { requirement: { code: 'asc' } },
          },
          svspCourses: {
            include: {
              svspLevel: true,
              academy: true,
            },
            orderBy: { issueDate: 'desc' },
          },
          internalTrainings: {
            orderBy: { trainingDate: 'desc' },
          },
          salaryHistories: {
            orderBy: { effectiveDate: 'desc' },
          },
          periodSettlements: {
            include: { period: true },
            orderBy: { createdAt: 'desc' },
            take: 24,
          },
          vacationSettlements: {
            orderBy: { createdAt: 'desc' },
            take: 24,
          },
          finalSettlements: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!employee) {
        throw new NotFoundException(`Empleado [${employeeId}] no encontrado.`);
      }

      // Traer todos los requisitos de contratación activos para asegurar que la matriz esté completa
      const allRequirements =
        await this.prisma.payrollHiringRequirement.findMany({
          where: { tenantId, isActive: true },
          orderBy: { code: 'asc' },
        });

      return { employee, allRequirements };
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
      const { entryDate, isRetired, retiredAt, ...profileData } = dto;

      // Actualizar datos base del empleado si vienen en el payload
      const employeeUpdateData: any = {};
      if (entryDate) employeeUpdateData.entryDate = new Date(entryDate);
      if (isRetired !== undefined) employeeUpdateData.isRetired = isRetired;
      if (retiredAt) employeeUpdateData.retiredAt = new Date(retiredAt);

      if (Object.keys(employeeUpdateData).length > 0) {
        await this.prisma.employee.update({
          where: { id: employeeId },
          data: employeeUpdateData,
        });
      }

      const parsedData: any = {
        ...profileData,
        contractEndDate: profileData.contractEndDate
          ? new Date(profileData.contractEndDate)
          : undefined,
        probationEndDate: profileData.probationEndDate
          ? new Date(profileData.probationEndDate)
          : undefined,
      };

      const result = await this.prisma.employeePayrollProfile.upsert({
        where: { employeeId },
        update: parsedData,
        create: {
          tenantId,
          employeeId,
          ...parsedData,
        },
        include: {
          branch: true,
          primaryDependency: true,
          epsEntity: true,
          afpEntity: true,
          cesantiasEntity: true,
          ccfEntity: true,
          bank: true,
          exitReason: true,
        },
      });

      return result;
    } catch (err: any) {
      this.logger.error(
        `Error guardando perfil de nómina [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async createFamilyMember(
    tenantId: string,
    employeeId: string,
    dto: CreateFamilyMemberDto,
  ) {
    try {
      return await this.prisma.employeeFamilyMember.create({
        data: {
          tenantId,
          employeeId,
          fullName: dto.fullName,
          relationship: dto.relationship,
          documentType: dto.documentType || 'TI',
          document: dto.document,
          birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
          gender: dto.gender,
          phone: dto.phone,
          isDependentForSubsidy: dto.isDependentForSubsidy ?? true,
          isScholar: dto.isScholar ?? false,
          notes: dto.notes,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Error creando integrante familiar [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async deleteFamilyMember(tenantId: string, id: string) {
    try {
      const existing = await this.prisma.employeeFamilyMember.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new NotFoundException(`Miembro familiar [${id}] no encontrado.`);
      }
      return await this.prisma.employeeFamilyMember.delete({
        where: { id },
      });
    } catch (err: any) {
      this.logger.error(
        `Error eliminando miembro familiar [id=${id}]: ${err?.message || err}`,
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
      const dataToSave: any = {
        status: dto.status,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        s3Key: dto.s3Key,
        fileName: dto.fileName,
        notes: dto.notes,
        verifiedAt: dto.status === 'VERIFIED' ? new Date() : null,
      };

      return await this.prisma.employeeRequirementCheck.upsert({
        where: {
          tenantId_employeeId_requirementId: {
            tenantId,
            employeeId,
            requirementId,
          },
        },
        update: dataToSave,
        create: {
          tenantId,
          employeeId,
          requirementId,
          ...dataToSave,
        },
        include: {
          requirement: true,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Error actualizando requisito [requirementId=${requirementId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async createSvspCourse(
    tenantId: string,
    employeeId: string,
    dto: CreateSvspCourseDto,
  ) {
    try {
      // 1. Obtener vigencia del nivel SVSP si no se proporcionó expiryDate
      let expiryDate: Date;
      if (dto.expiryDate) {
        expiryDate = new Date(dto.expiryDate);
      } else {
        const level = await this.prisma.payrollSvspLevel.findUnique({
          where: { id: dto.svspLevelId },
        });
        const validityDays = level?.validityDays || 365;
        const issueDate = new Date(dto.issueDate);
        expiryDate = new Date(issueDate.getTime());
        expiryDate.setDate(expiryDate.getDate() + validityDays);
      }

      // 2. Marcar cursos previos del empleado como no actuales
      await this.prisma.employeeSvspCourse.updateMany({
        where: { tenantId, employeeId, isCurrent: true },
        data: { isCurrent: false },
      });

      // 3. Crear el nuevo curso
      return await this.prisma.employeeSvspCourse.create({
        data: {
          tenantId,
          employeeId,
          svspLevelId: dto.svspLevelId,
          academyId: dto.academyId,
          nroCode: dto.nroCode,
          certificateNumber: dto.certificateNumber,
          issueDate: new Date(dto.issueDate),
          expiryDate,
          s3Key: dto.s3Key,
          fileName: dto.fileName,
          isCurrent: true,
          notes: dto.notes,
        },
        include: {
          svspLevel: true,
          academy: true,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Error registrando curso SVSP [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async deleteSvspCourse(tenantId: string, id: string) {
    try {
      const existing = await this.prisma.employeeSvspCourse.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new NotFoundException(`Curso SVSP [${id}] no encontrado.`);
      }

      const deleted = await this.prisma.employeeSvspCourse.delete({
        where: { id },
      });

      // Si el curso borrado era el actual, reactivar el curso más reciente disponible
      if (existing.isCurrent) {
        const latest = await this.prisma.employeeSvspCourse.findFirst({
          where: { tenantId, employeeId: existing.employeeId },
          orderBy: { issueDate: 'desc' },
        });
        if (latest) {
          await this.prisma.employeeSvspCourse.update({
            where: { id: latest.id },
            data: { isCurrent: true },
          });
        }
      }

      return deleted;
    } catch (err: any) {
      this.logger.error(
        `Error eliminando curso SVSP [id=${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async createInternalTraining(
    tenantId: string,
    employeeId: string,
    dto: CreateInternalTrainingDto,
  ) {
    try {
      return await this.prisma.employeeInternalTraining.create({
        data: {
          tenantId,
          employeeId,
          title: dto.title,
          topic: dto.topic,
          instructorName: dto.instructorName,
          trainingDate: new Date(dto.trainingDate),
          durationHours: dto.durationHours ?? 2.0,
          score: dto.score ?? 5.0,
          approved: dto.approved ?? true,
          notes: dto.notes,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Error registrando capacitación interna [employeeId=${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async deleteInternalTraining(tenantId: string, id: string) {
    try {
      const existing = await this.prisma.employeeInternalTraining.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new NotFoundException(`Capacitación [${id}] no encontrada.`);
      }
      return await this.prisma.employeeInternalTraining.delete({
        where: { id },
      });
    } catch (err: any) {
      this.logger.error(
        `Error eliminando capacitación interna [id=${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async findDataForRenovaExport(tenantId: string) {
    try {
      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const employees = await this.prisma.employee.findMany({
        where: { tenantId, isActive: true },
        include: {
          payrollProfile: {
            include: { primaryDependency: true },
          },
          svspCourses: {
            where: { isCurrent: true },
            include: {
              svspLevel: true,
              academy: true,
            },
            take: 1,
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      return { settings, employees };
    } catch (err: any) {
      this.logger.error(
        `Error consultando datos para exportación RENOVA [tenantId=${tenantId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async applySalaryAdjustment(
    tenantId: string,
    employeeId: string,
    dto: {
      salaryMode: any;
      adjustmentType: 'PERCENTAGE' | 'FIXED_AMOUNT';
      increasePct?: number;
      newSalary?: number;
      effectiveDate: string;
      reason: string;
    },
    userId?: string,
  ) {
    try {
      const profile = await this.prisma.employeePayrollProfile.findUnique({
        where: { employeeId },
      });

      if (!profile) {
        throw new NotFoundException(
          `Perfil laboral del empleado [${employeeId}] no encontrado.`,
        );
      }

      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });
      const smmlv = Number(settings?.smmlv || 1750905.0);

      const previousSalary = Number(profile.customBaseSalary);
      let calculatedNewSalary = previousSalary;

      if (dto.salaryMode === 'MINIMUM_WAGE') {
        calculatedNewSalary = smmlv;
      } else if (
        dto.adjustmentType === 'PERCENTAGE' &&
        dto.increasePct !== undefined
      ) {
        calculatedNewSalary =
          Math.round(previousSalary * (1 + dto.increasePct / 100) * 100) / 100;
      } else if (
        dto.adjustmentType === 'FIXED_AMOUNT' &&
        dto.newSalary !== undefined
      ) {
        calculatedNewSalary = Number(dto.newSalary);
      }

      if (calculatedNewSalary < smmlv && dto.salaryMode !== 'BY_DEPENDENCY') {
        calculatedNewSalary = smmlv;
      }

      const variationPct =
        previousSalary > 0
          ? Math.round(
              ((calculatedNewSalary - previousSalary) / previousSalary) * 10000,
            ) / 100
          : 0;

      // Update profile
      const updatedProfile = await this.prisma.employeePayrollProfile.update({
        where: { id: profile.id },
        data: {
          salaryMode: dto.salaryMode,
          customBaseSalary: calculatedNewSalary,
          updatedById: userId,
        },
      });

      // Create history record
      const history = await this.prisma.employeeSalaryHistory.create({
        data: {
          tenantId,
          employeeId,
          salaryMode: dto.salaryMode,
          previousSalary,
          newSalary: calculatedNewSalary,
          variationPct,
          effectiveDate: new Date(dto.effectiveDate),
          origin: 'INDIVIDUAL_INCREASE',
          reason: dto.reason,
          createdById: userId,
          updatedById: userId,
        },
      });

      return {
        updatedProfile,
        history,
      };
    } catch (err: any) {
      this.logger.error(
        `Error aplicando ajuste salarial a empleado [${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async findSettlementForPayslip(
    tenantId: string,
    employeeId: string,
    settlementId: string,
  ) {
    try {
      const settlement = await this.prisma.payrollPeriodSettlement.findFirst({
        where: {
          id: settlementId,
          employeeId,
          tenantId,
        },
        include: {
          period: true,
          employee: true,
          primaryDependency: true,
          branch: true,
          bank: true,
          lines: {
            include: { concept: true },
            orderBy: [{ nature: 'asc' }, { conceptId: 'asc' }],
          },
        },
      });

      if (!settlement) {
        throw new NotFoundException(
          `Liquidación [${settlementId}] no encontrada para el empleado.`,
        );
      }

      return settlement;
    } catch (err: any) {
      this.logger.error(
        `Error buscando liquidación para desprendible [${settlementId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }
}
