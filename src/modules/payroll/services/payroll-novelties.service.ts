import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PreviewLeaveDto,
  CreateLeaveAndAbsenceDto,
  UpdateClaimStatusDto,
  CreatePayrollLoanDto,
  RecordLoanInstallmentDto,
  UpdateLoanStatusDto,
  CreatePermanentConceptDto,
  CreatePeriodNoveltyDto,
  BulkImportPeriodNoveltiesDto,
} from '../dtos/payroll-novelties.dto';
import {
  IncapacityAndLeaveEngine,
  IncapacityCalculationResult,
} from '../engines/incapacity-and-leave.engine';
import { ShiftSequenceEngine } from '../engines/shift-sequence.engine';
import {
  LeaveAndAbsenceType,
  EpsClaimStatus,
  PayrollLoanStatus,
  PermanentConceptScope,
} from '@prisma/client';

@Injectable()
export class PayrollNoveltiesService {
  private readonly logger = new Logger(PayrollNoveltiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. KPIS RESUMEN EJECUTIVO
  // ==========================================
  async getKpis(tenantId: string, year: number, month: number) {
    try {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

      // 1. Incapacidades y licencias activas en el mes
      const activeLeaves = await this.prisma.payrollLeaveAndAbsence.findMany({
        where: {
          tenantId,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      // 2. Cartera EPS/ARL pendiente de recobro (PENDING_FILING o FILED_IN_AUDIT)
      const pendingClaims = await this.prisma.payrollLeaveAndAbsence.findMany({
        where: {
          tenantId,
          claimStatus: {
            in: [
              EpsClaimStatus.PENDING_FILING,
              EpsClaimStatus.FILED_IN_AUDIT,
              EpsClaimStatus.APPROVED_PENDING_PAYMENT,
            ],
          },
        },
      });

      const totalPendingClaimAmount = pendingClaims.reduce((sum, item) => {
        return sum + Number(item.entityRecognizedAmount || 0);
      }, 0);

      // 3. Cartera de préstamos activos y saldo total
      const activeLoans = await this.prisma.payrollLoan.findMany({
        where: {
          tenantId,
          status: PayrollLoanStatus.ACTIVE,
        },
      });

      const totalLoansOutstandingBalance = activeLoans.reduce((sum, item) => {
        return sum + Number(item.remainingBalance || 0);
      }, 0);

      // 4. Novedades variables del periodo
      const periodNovelties = await this.prisma.payrollPeriodNovelty.findMany({
        where: {
          tenantId,
          noveltyDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalPeriodNoveltiesAmount = periodNovelties.reduce((sum, item) => {
        return sum + Number(item.totalValue || 0);
      }, 0);

      return {
        year,
        month,
        activeLeavesCount: activeLeaves.length,
        pendingClaimsCount: pendingClaims.length,
        totalPendingClaimAmount:
          Math.round(totalPendingClaimAmount * 100) / 100,
        activeLoansCount: activeLoans.length,
        totalLoansOutstandingBalance:
          Math.round(totalLoansOutstandingBalance * 100) / 100,
        periodNoveltiesCount: periodNovelties.length,
        totalPeriodNoveltiesAmount:
          Math.round(totalPeriodNoveltiesAmount * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        `Error al calcular KPIs de novedades para tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // 2. INCAPACIDADES, LICENCIAS Y AUSENTISMOS
  // ==========================================
  async previewLeave(
    tenantId: string,
    dto: PreviewLeaveDto,
  ): Promise<IncapacityCalculationResult> {
    try {
      let baseSalary = dto.baseSalaryMonthly;

      if (!baseSalary && dto.employeeId) {
        const employee = await this.prisma.employee.findFirst({
          where: { id: dto.employeeId, tenantId },
          select: {
            payrollProfile: {
              select: { customBaseSalary: true },
            },
          },
        });
        if (employee?.payrollProfile?.customBaseSalary) {
          baseSalary = Number(employee.payrollProfile.customBaseSalary);
        }
      }

      if (!baseSalary || baseSalary <= 0) {
        baseSalary = 1750905.0; // Default SMMLV 2026
      }

      // Read legal settings
      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const smmlv = settings ? Number(settings.smmlv) : 1750905.0;
      const employerSickLeaveRatePct = settings
        ? Number(settings.employerSickLeaveRatePct)
        : 66.67;
      const epsSickLeaveRateDays3To90Pct = settings
        ? Number(settings.epsSickLeaveRateDays3To90Pct)
        : 66.67;
      const epsSickLeaveRateDays91To180Pct = settings
        ? Number(settings.epsSickLeaveRateDays91To180Pct)
        : 50.0;

      return IncapacityAndLeaveEngine.calculate({
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        baseSalaryMonthly: baseSalary,
        smmlv,
        employerSickLeaveRatePct,
        epsSickLeaveRateDays3To90Pct,
        epsSickLeaveRateDays91To180Pct,
        isExtension: dto.isExtension,
        accumulatedPriorDays: dto.accumulatedPriorDays,
      });
    } catch (error) {
      this.logger.error(
        `Error al previsualizar incapacidad: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(error.message);
    }
  }

  async listLeaves(
    tenantId: string,
    filters?: {
      employeeId?: string;
      leaveType?: LeaveAndAbsenceType;
      claimStatus?: EpsClaimStatus;
      startDate?: string;
      endDate?: string;
    },
  ) {
    try {
      const where: any = { tenantId };

      if (filters?.employeeId) {
        where.employeeId = filters.employeeId;
      }
      if (filters?.leaveType) {
        where.leaveType = filters.leaveType;
      }
      if (filters?.claimStatus) {
        where.claimStatus = filters.claimStatus;
      }
      if (filters?.startDate && filters?.endDate) {
        where.startDate = { lte: new Date(filters.endDate) };
        where.endDate = { gte: new Date(filters.startDate) };
      }

      return this.prisma.payrollLeaveAndAbsence.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              document: true,
              phone: true,
            },
          },
          cie10: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          entity: {
            select: {
              id: true,
              code: true,
              name: true,
              entityType: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al listar incapacidades/licencias: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createLeave(
    tenantId: string,
    userId: string,
    dto: CreateLeaveAndAbsenceDto,
  ) {
    try {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
        select: {
          id: true,
          payrollProfile: {
            select: {
              customBaseSalary: true,
              epsEntityId: true,
            },
          },
        },
      });

      if (!employee) {
        throw new NotFoundException('Empleado no encontrado.');
      }

      const empBaseSalary = employee.payrollProfile?.customBaseSalary
        ? Number(employee.payrollProfile.customBaseSalary)
        : 1750905.0;

      const calculation = await this.previewLeave(tenantId, {
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        baseSalaryMonthly: empBaseSalary,
        isExtension: dto.isExtension,
        accumulatedPriorDays: dto.accumulatedPriorDays,
      });

      // Resolve concept ID
      let conceptId = dto.conceptId;
      if (!conceptId) {
        const defaultConcept = await this.prisma.payrollConcept.findFirst({
          where: { tenantId, isActive: true },
        });
        if (!defaultConcept) {
          throw new BadRequestException(
            'No se encontró un concepto de nómina configurado en el sistema.',
          );
        }
        conceptId = defaultConcept.id;
      }

      // Default entity ID if not supplied (EPS)
      let entityId = dto.entityId;
      if (!entityId && employee.payrollProfile?.epsEntityId) {
        entityId = employee.payrollProfile.epsEntityId;
      }

      const leave = await this.prisma.payrollLeaveAndAbsence.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          conceptId,
          leaveType: dto.leaveType,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          cie10Id: dto.cie10Id,
          entityId,
          isExtension: Boolean(dto.isExtension),
          accumulatedPriorDays: dto.accumulatedPriorDays || 0,
          totalDays: calculation.totalDays,
          employerDays: calculation.employerDays,
          entityDays: calculation.entityDays,
          baseSalaryMonthly: calculation.baseSalaryMonthly,
          ibcDailyValue: calculation.ibcDailyValue,
          employerRecognizedAmount: calculation.employerRecognizedAmount,
          entityRecognizedAmount: calculation.entityRecognizedAmount,
          totalLiquidatedAmount: calculation.totalLiquidatedAmount,
          affectsSeventhDay: calculation.affectsSeventhDay,
          claimStatus: calculation.claimStatus,
          certificateNumber: dto.certificateNumber,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });

      // Sincronizar y bloquear en PayrollShiftRecord los días afectados
      const shiftCode = ShiftSequenceEngine.mapLeaveTypeToShiftCode(
        dto.leaveType,
      );
      const start = new Date(dto.startDate);
      for (let i = 0; i < calculation.totalDays; i++) {
        const currentDate = new Date(start.getTime() + i * 86400000);

        // Check if there is an existing shift record for that date
        const existingRecord = await this.prisma.payrollShiftRecord.findFirst({
          where: {
            tenantId,
            employeeId: dto.employeeId,
            shiftDate: currentDate,
            isReinforcement: false,
          },
        });

        if (existingRecord) {
          await this.prisma.payrollShiftRecord.update({
            where: { id: existingRecord.id },
            data: {
              shiftCode,
              leaveId: leave.id,
              ordinaryDayHours: 0,
              nightSurchargeHours: 0,
              sundayHolidayHours: 0,
              overtimeDayHours: 0,
              overtimeNightHours: 0,
              overtimeHolidayDayHours: 0,
              overtimeHolidayNightHours: 0,
              notes: `Novedad de tiempo: ${dto.leaveType}`,
              updatedById: userId,
            },
          });
        }
      }

      return leave;
    } catch (error) {
      this.logger.error(
        `Error al registrar incapacidad/licencia: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateClaim(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateClaimStatusDto,
  ) {
    try {
      const leave = await this.prisma.payrollLeaveAndAbsence.findFirst({
        where: { id, tenantId },
      });
      if (!leave) {
        throw new NotFoundException('Registro de incapacidad no encontrado.');
      }

      let updatedNotes = leave.notes;
      if (dto.rejectionReason) {
        updatedNotes = updatedNotes
          ? `${updatedNotes} | Rechazo: ${dto.rejectionReason}`
          : `Rechazo: ${dto.rejectionReason}`;
      }

      return this.prisma.payrollLeaveAndAbsence.update({
        where: { id },
        data: {
          claimStatus: dto.claimStatus,
          certificateNumber: dto.certificateNumber ?? leave.certificateNumber,
          filingDate: dto.filingDate
            ? new Date(dto.filingDate)
            : leave.filingDate,
          paymentDate: dto.paymentDate
            ? new Date(dto.paymentDate)
            : leave.paymentDate,
          reimbursedAmount:
            dto.reimbursedAmount !== undefined
              ? dto.reimbursedAmount
              : leave.reimbursedAmount,
          notes: updatedNotes,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar recobro EPS/ARL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteLeave(tenantId: string, id: string) {
    try {
      const leave = await this.prisma.payrollLeaveAndAbsence.findFirst({
        where: { id, tenantId },
      });
      if (!leave) {
        throw new NotFoundException('Registro de incapacidad no encontrado.');
      }

      // Desvincular de los registros de malla de turnos
      await this.prisma.payrollShiftRecord.updateMany({
        where: { tenantId, leaveId: id },
        data: {
          leaveId: null,
          shiftCode: 'X', // Regresa a descanso o requiere regeneración
          notes: 'Novedad eliminada',
        },
      });

      return this.prisma.payrollLeaveAndAbsence.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error al eliminar incapacidad: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // 3. PRÉSTAMOS, LIBRANZAS Y EMBARGOS
  // ==========================================
  async listLoans(
    tenantId: string,
    filters?: {
      employeeId?: string;
      status?: PayrollLoanStatus;
    },
  ) {
    try {
      const where: any = { tenantId };

      if (filters?.employeeId) {
        where.employeeId = filters.employeeId;
      }
      if (filters?.status) {
        where.status = filters.status;
      }

      return this.prisma.payrollLoan.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              document: true,
            },
          },
          concept: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al listar préstamos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createLoan(
    tenantId: string,
    userId: string,
    dto: CreatePayrollLoanDto,
  ) {
    try {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
      });
      if (!employee) {
        throw new NotFoundException('Empleado no encontrado.');
      }

      const concept = await this.prisma.payrollConcept.findFirst({
        where: { id: dto.conceptId, tenantId },
      });
      if (!concept) {
        throw new NotFoundException('Concepto de nómina no encontrado.');
      }

      const loanCode =
        dto.loanNumber || `LN-${Date.now().toString(36).toUpperCase()}`;
      const description = dto.notes || 'Préstamo a empleado';
      const startDeduction = dto.firstDeductionDate
        ? new Date(dto.firstDeductionDate)
        : new Date();

      return this.prisma.payrollLoan.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          conceptId: dto.conceptId,
          loanCode,
          description,
          disbursementDate: new Date(),
          startDeductionDate: startDeduction,
          principalAmount: dto.principalAmount,
          totalInstallments: dto.totalInstallments,
          paidInstallments: 0,
          installmentAmount: dto.installmentAmount,
          totalPaidAmount: 0,
          remainingBalance: dto.principalAmount,
          deductionRule: dto.periodicity || 'ALL_PERIODS',
          status: PayrollLoanStatus.ACTIVE,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear préstamo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateLoanStatus(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateLoanStatusDto,
  ) {
    try {
      const loan = await this.prisma.payrollLoan.findFirst({
        where: { id, tenantId },
      });
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado.');
      }

      return this.prisma.payrollLoan.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes ?? loan.notes,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar estado del préstamo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async recordLoanInstallment(
    tenantId: string,
    loanId: string,
    userId: string,
    dto: RecordLoanInstallmentDto,
  ) {
    try {
      const loan = await this.prisma.payrollLoan.findFirst({
        where: { id: loanId, tenantId },
        include: { installments: true },
      });
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado.');
      }

      const nextInstallmentNumber = loan.installments.length + 1;
      const currentRemaining = Number(loan.remainingBalance);
      const newRemaining = Math.max(
        0,
        Math.round((currentRemaining - dto.amount) * 100) / 100,
      );
      const newPaidInstallments = loan.paidInstallments + 1;
      const isPaidOff = newRemaining <= 0;

      const [installment, updatedLoan] = await this.prisma.$transaction([
        this.prisma.payrollLoanInstallment.create({
          data: {
            tenantId,
            loanId,
            periodId: dto.periodId,
            installmentNumber: nextInstallmentNumber,
            amount: dto.amount,
            balanceAfter: newRemaining,
            paymentDate: new Date(),
            notes: dto.notes,
            createdById: userId,
            updatedById: userId,
          },
        }),
        this.prisma.payrollLoan.update({
          where: { id: loanId },
          data: {
            paidInstallments: newPaidInstallments,
            totalPaidAmount:
              Math.round(
                (Number(loan.totalPaidAmount || 0) + dto.amount) * 100,
              ) / 100,
            remainingBalance: newRemaining,
            status: isPaidOff ? PayrollLoanStatus.PAID_OFF : loan.status,
            updatedById: userId,
          },
        }),
      ]);

      return {
        installment,
        loan: updatedLoan,
      };
    } catch (error) {
      this.logger.error(
        `Error al registrar cuota de préstamo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // 4. CONCEPTOS FIJOS / PERMANENTES
  // ==========================================
  async listPermanentConcepts(
    tenantId: string,
    filters?: {
      scope?: PermanentConceptScope;
      employeeId?: string;
      dependencyId?: string;
    },
  ) {
    try {
      const where: any = { tenantId, isActive: true };

      if (filters?.scope) {
        where.scope = filters.scope;
      }
      if (filters?.employeeId) {
        where.employeeId = filters.employeeId;
      }
      if (filters?.dependencyId) {
        where.dependencyId = filters.dependencyId;
      }

      return this.prisma.payrollPermanentConcept.findMany({
        where,
        include: {
          concept: {
            select: {
              id: true,
              code: true,
              name: true,
              nature: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              document: true,
            },
          },
          dependency: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al listar conceptos fijos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createPermanentConcept(
    tenantId: string,
    userId: string,
    dto: CreatePermanentConceptDto,
  ) {
    try {
      if (dto.scope === PermanentConceptScope.BY_EMPLOYEE && !dto.employeeId) {
        throw new BadRequestException(
          'Debe seleccionar un empleado para conceptos con alcance de empleado.',
        );
      }
      if (
        dto.scope === PermanentConceptScope.BY_DEPENDENCY &&
        !dto.dependencyId
      ) {
        throw new BadRequestException(
          'Debe seleccionar una dependencia para conceptos con alcance de dependencia.',
        );
      }

      return this.prisma.payrollPermanentConcept.create({
        data: {
          tenantId,
          scope: dto.scope,
          employeeId: dto.employeeId,
          dependencyId: dto.dependencyId,
          conceptId: dto.conceptId,
          amount: dto.amount,
          isProportionalToDays: dto.isProportionalToDays ?? true,
          applicationRule: dto.applicationRule,
          validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear concepto fijo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deletePermanentConcept(tenantId: string, id: string) {
    try {
      const item = await this.prisma.payrollPermanentConcept.findFirst({
        where: { id, tenantId },
      });
      if (!item) {
        throw new NotFoundException('Concepto fijo no encontrado.');
      }

      return this.prisma.payrollPermanentConcept.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.logger.error(
        `Error al inactivar concepto permanente: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // 5. NOVEDADES VARIABLES DEL PERIODO
  // ==========================================
  async listPeriodNovelties(
    tenantId: string,
    filters?: {
      periodId?: string;
      employeeId?: string;
      conceptId?: string;
    },
  ) {
    try {
      const where: any = { tenantId };

      if (filters?.periodId) {
        where.periodId = filters.periodId;
      }
      if (filters?.employeeId) {
        where.employeeId = filters.employeeId;
      }
      if (filters?.conceptId) {
        where.conceptId = filters.conceptId;
      }

      return this.prisma.payrollPeriodNovelty.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              document: true,
            },
          },
          concept: {
            select: {
              id: true,
              code: true,
              name: true,
              nature: true,
            },
          },
          dependency: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { noveltyDate: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al listar novedades del periodo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createPeriodNovelty(
    tenantId: string,
    userId: string,
    dto: CreatePeriodNoveltyDto,
  ) {
    try {
      return this.prisma.payrollPeriodNovelty.create({
        data: {
          tenantId,
          periodId: dto.periodId,
          employeeId: dto.employeeId,
          dependencyId: dto.dependencyId,
          conceptId: dto.conceptId,
          noveltyDate: new Date(dto.noveltyDate),
          quantity: dto.quantity,
          unitValue: dto.unitValue ?? 0,
          totalValue: dto.totalValue,
          origin: dto.origin,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear novedad del periodo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async bulkImportPeriodNovelties(
    tenantId: string,
    userId: string,
    dto: BulkImportPeriodNoveltiesDto,
  ) {
    try {
      const recordsToInsert = dto.novelties.map((item) => ({
        tenantId,
        periodId: item.periodId,
        employeeId: item.employeeId,
        dependencyId: item.dependencyId,
        conceptId: item.conceptId,
        noveltyDate: new Date(item.noveltyDate),
        quantity: item.quantity,
        unitValue: item.unitValue ?? 0,
        totalValue: item.totalValue,
        origin: item.origin,
        notes: item.notes,
        createdById: userId,
        updatedById: userId,
      }));

      const result = await this.prisma.payrollPeriodNovelty.createMany({
        data: recordsToInsert,
      });

      return {
        importedCount: result.count,
      };
    } catch (error) {
      this.logger.error(
        `Error en importación masiva de novedades: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deletePeriodNovelty(tenantId: string, id: string) {
    try {
      const item = await this.prisma.payrollPeriodNovelty.findFirst({
        where: { id, tenantId },
      });
      if (!item) {
        throw new NotFoundException('Novedad de periodo no encontrada.');
      }

      return this.prisma.payrollPeriodNovelty.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error al eliminar novedad de periodo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
