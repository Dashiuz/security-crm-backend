import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateShiftSequenceDto,
  CreateDependencyAssignmentDto,
  UpdateDependencyAssignmentDto,
  GenerateMonthShiftsDto,
  BulkUpdateShiftRecordsDto,
  CreateReinforcementShiftDto,
} from '../dtos/payroll-shifts.dto';
import { ShiftSequenceEngine } from '../engines/shift-sequence.engine';
import { ColombianHolidayEngine } from '../engines/colombian-holiday.engine';
import { DependencyAssignmentRole, ShiftDayCode, Prisma } from '@prisma/client';

@Injectable()
export class PayrollShiftsService {
  private readonly logger = new Logger(PayrollShiftsService.name);
  private readonly holidayEngine = new ColombianHolidayEngine();

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. CATÁLOGO DE SECUENCIAS DE TURNO
  // ==========================================
  async listSequences(tenantId: string) {
    try {
      return this.prisma.payrollShiftSequence.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al listar secuencias para tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createSequence(
    tenantId: string,
    userId: string,
    dto: CreateShiftSequenceDto,
  ) {
    try {
      return this.prisma.payrollShiftSequence.create({
        data: {
          tenantId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          patternJson: dto.patternJson,
          cycleDaysLength: dto.cycleDaysLength || dto.patternJson.length,
          dayShiftHours: dto.dayShiftHours || 12,
          nightShiftHours: dto.nightShiftHours || 12,
          defaultDayStartTime: dto.defaultDayStartTime || '06:00',
          defaultNightStartTime: dto.defaultNightStartTime || '18:00',
          isActive: dto.isActive ?? true,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear secuencia: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // 2. ASIGNACIÓN Y ROTACIÓN DE PUESTOS
  // ==========================================
  async listAssignments(
    tenantId: string,
    filters?: {
      dependencyId?: string;
      employeeId?: string;
      isActive?: boolean;
    },
  ) {
    try {
      const where: any = { tenantId };

      if (filters?.dependencyId) {
        where.dependencyId = filters.dependencyId;
      }
      if (filters?.employeeId) {
        where.employeeId = filters.employeeId;
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      return this.prisma.employeeDependencyAssignment.findMany({
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
          dependency: {
            select: {
              id: true,
              code: true,
              name: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ dependencyId: 'asc' }, { assignmentRole: 'asc' }],
      });
    } catch (error) {
      this.logger.error(
        `Error al listar asignaciones: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createAssignment(
    tenantId: string,
    userId: string,
    dto: CreateDependencyAssignmentDto,
  ) {
    try {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
      });
      if (!employee) {
        throw new NotFoundException('Empleado no encontrado.');
      }

      const dependency = await this.prisma.payrollDependency.findFirst({
        where: { id: dto.dependencyId, tenantId },
      });
      if (!dependency) {
        throw new NotFoundException('Puesto o dependencia no encontrado.');
      }

      return this.prisma.employeeDependencyAssignment.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          dependencyId: dto.dependencyId,
          branchId: dependency.branchId,
          assignmentRole:
            dto.assignmentRole ?? DependencyAssignmentRole.TITULAR,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          isPrimary: dto.isPrimary ?? true,
          isActive: true,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear asignación de empleado: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAssignment(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateDependencyAssignmentDto,
  ) {
    try {
      const item = await this.prisma.employeeDependencyAssignment.findFirst({
        where: { id, tenantId },
      });
      if (!item) {
        throw new NotFoundException('Asignación de empleado no encontrada.');
      }

      return this.prisma.employeeDependencyAssignment.update({
        where: { id },
        data: {
          assignmentRole: dto.assignmentRole ?? item.assignmentRole,
          endDate: dto.endDate ? new Date(dto.endDate) : item.endDate,
          isPrimary:
            dto.isPrimary !== undefined ? dto.isPrimary : item.isPrimary,
          isActive: dto.isActive !== undefined ? dto.isActive : item.isActive,
          notes: dto.notes ?? item.notes,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar asignación: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // 3. MALLA MENSUAL DE TURNOS (GRID & GENERATION)
  // ==========================================
  async getGrid(
    tenantId: string,
    filters: {
      year: number;
      month: number;
      dependencyId?: string;
      branchId?: string;
    },
  ) {
    try {
      const { year, month, dependencyId } = filters;
      const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const holidays = this.holidayEngine.getHolidaysForYear(year);

      const daysHeader: any[] = [];
      for (let d = 1; d <= totalDays; d++) {
        const date = new Date(Date.UTC(year, month - 1, d));
        const dateStr = date.toISOString().split('T')[0];
        const isSun = date.getUTCDay() === 0;
        const holiday = holidays.find((h) => h.dateStr === dateStr);
        daysHeader.push({
          day: d,
          dateStr,
          dayOfWeek: date.getUTCDay(),
          isSunday: isSun,
          isHoliday: Boolean(holiday),
          holidayName: holiday?.name,
        });
      }

      // Where clause for dependencies
      const depWhere: any = { tenantId, isActive: true };
      if (dependencyId) {
        depWhere.id = dependencyId;
      }
      if (filters.branchId) {
        depWhere.branchId = filters.branchId;
      }

      const dependencies = await this.prisma.payrollDependency.findMany({
        where: depWhere,
        include: {
          branch: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          assignments: {
            where: { isActive: true },
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  document: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Shift records for the period
      const shiftRecords = await this.prisma.payrollShiftRecord.findMany({
        where: {
          tenantId,
          year,
          month,
          ...(dependencyId ? { dependencyId } : {}),
        },
        include: {
          leave: {
            select: {
              id: true,
              leaveType: true,
            },
          },
        },
      });

      // Map employees and their shift records
      const gridRows = dependencies.flatMap((dep) => {
        return dep.assignments.map((assignment) => {
          const empRecords = shiftRecords.filter(
            (r) =>
              r.employeeId === assignment.employeeId &&
              r.dependencyId === dep.id,
          );

          const daysMap: Record<number, any> = {};
          let totalDayHours = 0;
          let totalNightHours = 0;
          let totalHolidayHours = 0;
          let totalOvertimeHours = 0;

          empRecords.forEach((rec) => {
            daysMap[rec.dayOfMonth] = {
              id: rec.id,
              shiftCode: rec.shiftCode,
              isReinforcement: rec.isReinforcement,
              isHolidayOrSunday: rec.isHolidayOrSunday,
              ordinaryDayHours: Number(rec.ordinaryDayHours),
              nightSurchargeHours: Number(rec.nightSurchargeHours),
              sundayHolidayHours: Number(rec.sundayHolidayHours),
              overtimeDayHours: Number(rec.overtimeDayHours),
              overtimeNightHours: Number(rec.overtimeNightHours),
              overtimeHolidayDayHours: Number(rec.overtimeHolidayDayHours),
              overtimeHolidayNightHours: Number(rec.overtimeHolidayNightHours),
              leaveType: rec.leave?.leaveType,
            };

            totalDayHours += Number(rec.ordinaryDayHours);
            totalNightHours += Number(rec.nightSurchargeHours);
            totalHolidayHours += Number(rec.sundayHolidayHours);
            totalOvertimeHours +=
              Number(rec.overtimeDayHours) +
              Number(rec.overtimeNightHours) +
              Number(rec.overtimeHolidayDayHours) +
              Number(rec.overtimeHolidayNightHours);
          });

          return {
            dependencyId: dep.id,
            dependencyName: dep.name,
            dependencyCode: dep.code,
            branchName: dep.branch?.name,
            clientName: dep.client?.name,
            assignmentId: assignment.id,
            role: assignment.assignmentRole,
            employee: assignment.employee,
            days: daysMap,
            totals: {
              totalDayHours,
              totalNightHours,
              totalHolidayHours,
              totalOvertimeHours,
              totalGrossHours:
                totalDayHours + totalHolidayHours + totalOvertimeHours,
            },
          };
        });
      });

      return {
        year,
        month,
        totalDays,
        daysHeader,
        rows: gridRows,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener malla de turnos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateMonth(
    tenantId: string,
    userId: string,
    dto: GenerateMonthShiftsDto,
  ) {
    try {
      const { year, month, dependencyId, branchId } = dto;
      const holidays = this.holidayEngine.getHolidaysForYear(year);

      const depWhere: any = { tenantId, isActive: true };
      if (dependencyId) depWhere.id = dependencyId;
      if (branchId) depWhere.branchId = branchId;

      const assignments =
        await this.prisma.employeeDependencyAssignment.findMany({
          where: {
            tenantId,
            isActive: true,
            dependency: depWhere,
          },
        });

      if (assignments.length === 0) {
        throw new BadRequestException(
          'No se encontraron asignaciones activas de empleados para generar turnos.',
        );
      }

      // Pattern: use sequenceCode if specified or check sequence table or fallback to 2x2x2
      let pattern = ['D', 'D', 'N', 'N', 'X', 'X'];
      if (dto.sequenceCode) {
        const foundSequence = await this.prisma.payrollShiftSequence.findFirst({
          where: { tenantId, code: dto.sequenceCode.toUpperCase() },
        });
        if (
          foundSequence &&
          Array.isArray(foundSequence.patternJson) &&
          foundSequence.patternJson.length > 0
        ) {
          pattern = foundSequence.patternJson as string[];
        }
      }

      let generatedCount = 0;

      for (const assignment of assignments) {
        // Active leaves for this employee in this month
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

        const activeLeaves = await this.prisma.payrollLeaveAndAbsence.findMany({
          where: {
            tenantId,
            employeeId: assignment.employeeId,
            startDate: { lte: monthEnd },
            endDate: { gte: monthStart },
          },
        });

        const activeLeavesInput = activeLeaves.map((l) => ({
          id: l.id,
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
        }));

        const projection = ShiftSequenceEngine.projectMonth({
          year,
          month,
          pattern,
          startStepOffset: dto.startStepOffset || 0,
          holidays,
          activeLeaves: activeLeavesInput,
        });

        // Write or upsert records into DB
        for (const dayItem of projection.days) {
          const shiftDate = new Date(
            Date.UTC(year, month - 1, dayItem.dayOfMonth),
          );

          await this.prisma.payrollShiftRecord.upsert({
            where: {
              tenantId_employeeId_shiftDate_isReinforcement: {
                tenantId,
                employeeId: assignment.employeeId,
                shiftDate,
                isReinforcement: false,
              },
            },
            create: {
              tenantId,
              employeeId: assignment.employeeId,
              dependencyId: assignment.dependencyId,
              shiftDate,
              year,
              month,
              dayOfMonth: dayItem.dayOfMonth,
              shiftCode: dayItem.shiftCode,
              isReinforcement: false,
              isHolidayOrSunday: dayItem.isHolidayOrSunday,
              ordinaryDayHours: dayItem.ordinaryDayHours,
              nightSurchargeHours: dayItem.nightSurchargeHours,
              sundayHolidayHours: dayItem.sundayHolidayHours,
              overtimeDayHours: dayItem.overtimeDayHours,
              overtimeNightHours: dayItem.overtimeNightHours,
              overtimeHolidayDayHours: dayItem.overtimeHolidayDayHours,
              overtimeHolidayNightHours: dayItem.overtimeHolidayNightHours,
              leaveId: dayItem.leaveId,
              createdById: userId,
              updatedById: userId,
            },
            update: {
              dependencyId: assignment.dependencyId,
              shiftCode: dayItem.shiftCode,
              isHolidayOrSunday: dayItem.isHolidayOrSunday,
              ordinaryDayHours: dayItem.ordinaryDayHours,
              nightSurchargeHours: dayItem.nightSurchargeHours,
              sundayHolidayHours: dayItem.sundayHolidayHours,
              overtimeDayHours: dayItem.overtimeDayHours,
              overtimeNightHours: dayItem.overtimeNightHours,
              overtimeHolidayDayHours: dayItem.overtimeHolidayDayHours,
              overtimeHolidayNightHours: dayItem.overtimeHolidayNightHours,
              leaveId: dayItem.leaveId,
              updatedById: userId,
            },
          });

          generatedCount++;
        }
      }

      return {
        message: 'Malla de turnos generada exitosamente.',
        assignmentsProcessed: assignments.length,
        recordsUpserted: generatedCount,
      };
    } catch (error) {
      this.logger.error(
        `Error al proyectar turnos del mes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async bulkUpdateRecords(
    tenantId: string,
    userId: string,
    dto: BulkUpdateShiftRecordsDto,
  ) {
    try {
      let updatedCount = 0;

      for (const rec of dto.records) {
        const date = new Date(rec.shiftDate);
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate();
        const dateStr = date.toISOString().split('T')[0];

        const isSun = date.getUTCDay() === 0;
        const isHol = this.holidayEngine.isHoliday(dateStr);
        const isHolidayOrSunday = isSun || isHol;

        const hours = ShiftSequenceEngine.calculateShiftHours(
          rec.shiftCode,
          isHolidayOrSunday,
        );

        await this.prisma.payrollShiftRecord.upsert({
          where: {
            tenantId_employeeId_shiftDate_isReinforcement: {
              tenantId,
              employeeId: rec.employeeId,
              shiftDate: date,
              isReinforcement: rec.isReinforcement ?? false,
            },
          },
          create: {
            tenantId,
            employeeId: rec.employeeId,
            dependencyId: rec.dependencyId,
            shiftDate: date,
            year: y,
            month: m,
            dayOfMonth: d,
            shiftCode: rec.shiftCode,
            isReinforcement: rec.isReinforcement ?? false,
            isHolidayOrSunday,
            ordinaryDayHours: hours.ordinaryDayHours,
            nightSurchargeHours: hours.nightSurchargeHours,
            sundayHolidayHours: hours.sundayHolidayHours,
            overtimeDayHours: hours.overtimeDayHours,
            overtimeNightHours: hours.overtimeNightHours,
            overtimeHolidayDayHours: hours.overtimeHolidayDayHours,
            overtimeHolidayNightHours: hours.overtimeHolidayNightHours,
            notes: rec.notes,
            createdById: userId,
            updatedById: userId,
          },
          update: {
            dependencyId: rec.dependencyId,
            shiftCode: rec.shiftCode,
            isHolidayOrSunday,
            ordinaryDayHours: hours.ordinaryDayHours,
            nightSurchargeHours: hours.nightSurchargeHours,
            sundayHolidayHours: hours.sundayHolidayHours,
            overtimeDayHours: hours.overtimeDayHours,
            overtimeNightHours: hours.overtimeNightHours,
            overtimeHolidayDayHours: hours.overtimeHolidayDayHours,
            overtimeHolidayNightHours: hours.overtimeHolidayNightHours,
            notes: rec.notes,
            updatedById: userId,
          },
        });

        updatedCount++;
      }

      return {
        message: 'Registros de turno actualizados exitosamente.',
        updatedCount,
      };
    } catch (error) {
      this.logger.error(
        `Error al actualizar registros de turno: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createReinforcement(
    tenantId: string,
    userId: string,
    dto: CreateReinforcementShiftDto,
  ) {
    try {
      const date = new Date(dto.shiftDate);
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth() + 1;
      const d = date.getUTCDate();
      const dateStr = date.toISOString().split('T')[0];

      const isSun = date.getUTCDay() === 0;
      const isHol = this.holidayEngine.isHoliday(dateStr);
      const isHolidayOrSunday = isSun || isHol;

      const totalHours = dto.hours || 12;

      return this.prisma.payrollShiftRecord.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          dependencyId: dto.dependencyId,
          shiftDate: date,
          year: y,
          month: m,
          dayOfMonth: d,
          shiftCode: dto.shiftCode ?? ShiftDayCode.R,
          isReinforcement: true,
          isHolidayOrSunday,
          overtimeDayHours: !isHolidayOrSunday ? totalHours : 0,
          overtimeHolidayDayHours: isHolidayOrSunday ? totalHours : 0,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear turno de refuerzo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
