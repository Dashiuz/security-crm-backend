import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  VacationSettlementType,
  SocialBenefitType,
  PayrollSettlementStatus,
  PayrollPeriodStatus,
  NoveltyOriginType,
  LeaveAndAbsenceType,
  EmploymentContractType,
} from '@prisma/client';
import {
  SimulateVacationDto,
  CreateVacationSettlementDto,
  GenerateSocialBenefitBatchDto,
  UpdateSocialBenefitItemDto,
  InjectBenefitToPayrollDto,
  SimulateFinalLiquidationDto,
  CreateFinalContractSettlementDto,
} from '../dtos/payroll-benefits.dto';
import { SocialBenefitsAndVacationsEngine } from '../engines/social-benefits-and-vacations.engine';
import { ContractTerminationEngine } from '../engines/contract-termination.engine';
import { PayrollBenefitsPdfService } from './payroll-benefits-pdf.service';

@Injectable()
export class PayrollBenefitsService {
  private readonly logger = new Logger(PayrollBenefitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PayrollBenefitsPdfService,
  ) {}

  // ============================================================================
  // 1. KPIS & DASHBOARD OVERVIEW
  // ============================================================================

  async getBenefitsKpis(tenantId: string) {
    try {
      const activeEmployees = await this.prisma.employee.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          entryDate: true,
          payrollProfile: { select: { customBaseSalary: true } },
          vacationSettlements: {
            where: {
              status: {
                in: [
                  PayrollSettlementStatus.APPROVED,
                  PayrollSettlementStatus.PAID,
                ],
              },
            },
            select: { businessDays: true },
          },
        },
      });

      let employeesWithHighVacations = 0;
      const today = new Date();

      for (const emp of activeEmployees) {
        if (!emp.entryDate) continue;
        const daysWorked = SocialBenefitsAndVacationsEngine.calculateDays360(
          emp.entryDate,
          today,
        );
        const accruedVacation =
          Math.round(((daysWorked * 15) / 360) * 100) / 100;
        const enjoyedVacation = emp.vacationSettlements.reduce(
          (acc, v) => acc + Number(v.businessDays),
          0,
        );
        const pending = Math.max(0, accruedVacation - enjoyedVacation);
        if (pending >= 15) {
          employeesWithHighVacations++;
        }
      }

      // Latest Prima Batch
      const currentYear = today.getFullYear();
      const latestPrimaBatch =
        await this.prisma.payrollSocialBenefitBatch.findFirst({
          where: {
            tenantId,
            year: currentYear,
            benefitType: {
              in: [
                SocialBenefitType.PRIMA_FIRST_SEMESTER,
                SocialBenefitType.PRIMA_SECOND_SEMESTER,
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
        });

      // Latest Severance Batch
      const latestSeveranceBatch =
        await this.prisma.payrollSocialBenefitBatch.findFirst({
          where: {
            tenantId,
            year: currentYear,
            benefitType: {
              in: [
                SocialBenefitType.SEVERANCE_ANNUAL,
                SocialBenefitType.SEVERANCE_INTERESTS,
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
        });

      // Final liquidations this year
      const finalSettlementsCount =
        await this.prisma.payrollFinalContractSettlement.count({
          where: {
            tenantId,
            retirementDate: {
              gte: new Date(Date.UTC(currentYear, 0, 1)),
              lte: new Date(Date.UTC(currentYear, 11, 31)),
            },
          },
        });

      return {
        totalActiveEmployees: activeEmployees.length,
        employeesWithOver15VacationDays: employeesWithHighVacations,
        latestPrimaBatch: latestPrimaBatch
          ? {
              label: latestPrimaBatch.label,
              status: latestPrimaBatch.status,
              totalBenefitAmount: Number(latestPrimaBatch.totalBenefitAmount),
              totalEmployees: latestPrimaBatch.totalEmployees,
            }
          : null,
        latestSeveranceBatch: latestSeveranceBatch
          ? {
              label: latestSeveranceBatch.label,
              status: latestSeveranceBatch.status,
              totalBenefitAmount: Number(
                latestSeveranceBatch.totalBenefitAmount,
              ),
              totalInterestAmount: Number(
                latestSeveranceBatch.totalInterestAmount,
              ),
            }
          : null,
        finalSettlementsCountThisYear: finalSettlementsCount,
      };
    } catch (error) {
      this.logger.error(
        `Error getting benefits KPIs for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 2. VACATION LEDGER (LIBRO DE VACACIONES) & SIMULATION
  // ============================================================================

  async getVacationBook(tenantId: string) {
    try {
      const employees = await this.prisma.employee.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          document: true,
          firstName: true,
          lastName: true,
          entryDate: true,
          payrollProfile: {
            select: {
              customBaseSalary: true,
              primaryDependency: { select: { code: true, name: true } },
            },
          },
          vacationSettlements: {
            where: {
              status: {
                in: [
                  PayrollSettlementStatus.APPROVED,
                  PayrollSettlementStatus.PAID,
                ],
              },
            },
            select: {
              id: true,
              vacationType: true,
              businessDays: true,
              calendarDaysPaid: true,
              enjoymentStartDate: true,
              enjoymentEndDate: true,
              status: true,
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      const today = new Date();

      return employees.map((emp) => {
        const hire = emp.entryDate || today;
        const totalServiceDays =
          SocialBenefitsAndVacationsEngine.calculateDays360(hire, today);
        const totalAccruedBusinessDays =
          Math.round(((totalServiceDays * 15) / 360) * 100) / 100;

        const totalEnjoyedBusinessDays = emp.vacationSettlements.reduce(
          (acc, v) => acc + Number(v.businessDays),
          0,
        );

        const pendingBusinessDays = Math.max(
          0,
          Math.round(
            (totalAccruedBusinessDays - totalEnjoyedBusinessDays) * 100,
          ) / 100,
        );

        let alertLevel: 'NORMAL' | 'ALERT_MED' | 'ALERT_HIGH' = 'NORMAL';
        if (pendingBusinessDays >= 30) {
          alertLevel = 'ALERT_HIGH';
        } else if (pendingBusinessDays >= 15) {
          alertLevel = 'ALERT_MED';
        }

        return {
          employeeId: emp.id,
          document: emp.document,
          fullName: `${emp.firstName} ${emp.lastName}`.trim(),
          hireDate: hire.toISOString().split('T')[0],
          dependencyName:
            emp.payrollProfile?.primaryDependency?.name || 'GENERAL',
          currentBasicSalary: Number(emp.payrollProfile?.customBaseSalary || 0),
          totalServiceDays,
          totalAccruedBusinessDays,
          totalEnjoyedBusinessDays,
          pendingBusinessDays,
          alertLevel,
          settlementsCount: emp.vacationSettlements.length,
        };
      });
    } catch (error) {
      this.logger.error(
        `Error retrieving vacation book for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async simulateVacation(tenantId: string, dto: SimulateVacationDto) {
    try {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
        include: { payrollProfile: true },
      });

      if (!employee) {
        throw new NotFoundException(
          `Empleado no encontrado (ID: ${dto.employeeId})`,
        );
      }

      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const holidays = await this.prisma.payrollHoliday.findMany({
        where: { tenantId },
        select: { date: true },
      });
      const holidayDates = holidays.map((h) => h.date);

      // Average variable earnings with inVac = true over the last 12 months
      const enjoymentDate = new Date(dto.enjoymentStartDate);
      const twelveMonthsAgo = new Date(enjoymentDate.getTime());
      twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);

      const variableLines = await this.prisma.payrollSettlementLine.findMany({
        where: {
          tenantId,
          employeeId: dto.employeeId,
          inVac: true,
          settlement: {
            period: {
              startDate: { gte: twelveMonthsAgo },
            },
          },
        },
        select: { totalValue: true },
      });

      const sumVariable = variableLines.reduce(
        (acc, l) => acc + Number(l.totalValue),
        0,
      );
      const averageVariableVacBase =
        variableLines.length > 0
          ? Math.round((sumVariable / 12) * 100) / 100
          : 0;
      const currentBasicSalary = Number(
        employee.payrollProfile?.customBaseSalary || 0,
      );

      const saturdayIsWorkingDay = settings
        ? settings.saturdayIsWorkingDay
        : true;

      const result =
        SocialBenefitsAndVacationsEngine.calculateVacationScheduleAndAmount({
          enjoymentStartDate: dto.enjoymentStartDate,
          businessDays: dto.businessDays,
          saturdayIsWorkingDay,
          holidayDates,
          currentBasicSalary,
          averageVariableVacBase,
          vacationType: dto.vacationType,
          loansToDeduct: dto.loansToDeduct || 0,
        });

      return {
        ...result,
        employee: {
          id: employee.id,
          document: employee.document,
          fullName: `${employee.firstName} ${employee.lastName}`.trim(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error simulating vacation for employee ${dto.employeeId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createVacationSettlement(
    tenantId: string,
    dto: CreateVacationSettlementDto,
    userId?: string,
  ) {
    try {
      const sim = await this.simulateVacation(tenantId, dto);

      return await this.prisma.payrollVacationSettlement.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          vacationType: dto.vacationType,
          status: PayrollSettlementStatus.DRAFT,
          accrualStartDate: new Date(dto.accrualStartDate),
          accrualEndDate: new Date(dto.accrualEndDate),
          enjoymentStartDate: new Date(sim.enjoymentStartDate),
          enjoymentEndDate: new Date(sim.enjoymentEndDate),
          returnDate: new Date(sim.returnDate),
          businessDays: sim.businessDays,
          nonWorkingDaysIncluded: sim.nonWorkingDaysIncluded,
          calendarDaysPaid: sim.calendarDaysPaid,
          saturdayWasWorkingDay: sim.saturdayWasWorkingDay,
          currentBasicSalary: sim.currentBasicSalary,
          averageVariableVacBase: sim.averageVariableVacBase,
          totalVacationBase: sim.totalVacationBase,
          dailyVacationRate: sim.dailyVacationRate,
          grossVacationAmount: sim.grossVacationAmount,
          healthDeductionAmount: sim.healthDeductionAmount,
          pensionDeductionAmount: sim.pensionDeductionAmount,
          loansDeductionAmount: sim.loansDeductionAmount,
          netPayAmount: sim.netPayAmount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
        include: { employee: true },
      });
    } catch (error) {
      this.logger.error(
        `Error creating vacation settlement for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async approveVacationSettlement(
    tenantId: string,
    settlementId: string,
    userId?: string,
  ) {
    try {
      const settlement = await this.prisma.payrollVacationSettlement.findFirst({
        where: { id: settlementId, tenantId },
        include: { employee: { include: { payrollProfile: true } } },
      });

      if (!settlement) {
        throw new NotFoundException(
          `Liquidación de vacaciones no encontrada (ID: ${settlementId})`,
        );
      }

      if (settlement.status === PayrollSettlementStatus.APPROVED) {
        return settlement;
      }

      let createdLeaveId: string | null = null;

      // 3-in-1 Sincronización Automática when Enjoyed in Time
      if (settlement.vacationType === VacationSettlementType.ENJOYED_IN_TIME) {
        // Find vacation concept
        const vacConcept = await this.prisma.payrollConcept.findFirst({
          where: {
            tenantId,
            OR: [{ code: 105 }, { inVac: true }, { nature: 'INCAPACIDAD' }],
          },
        });
        const anyConcept =
          vacConcept ||
          (await this.prisma.payrollConcept.findFirst({ where: { tenantId } }));

        if (!anyConcept) {
          throw new BadRequestException(
            'Se requiere al menos un concepto de nómina registrado para sincronizar la vacación.',
          );
        }

        // 1. Create Leave in PayrollLeaveAndAbsence
        const leave = await this.prisma.payrollLeaveAndAbsence.create({
          data: {
            tenantId,
            employeeId: settlement.employeeId,
            leaveType: LeaveAndAbsenceType.VACATION_TIME_VAC,
            conceptId: anyConcept.id,
            startDate: settlement.enjoymentStartDate,
            endDate: settlement.enjoymentEndDate,
            totalDays: settlement.calendarDaysPaid,
            employerDays: settlement.calendarDaysPaid,
            employerRecognizedAmount: Number(settlement.grossVacationAmount),
            totalLiquidatedAmount: Number(settlement.grossVacationAmount),
            notes: `Vacaciones sincronizadas 3-en-1 REF: ${settlement.id}`,
            createdById: userId,
            updatedById: userId,
          },
        });
        createdLeaveId = leave.id;

        // 2. Mark VAC on shift mesh (PayrollShiftRecord) for range [enjoymentStartDate, enjoymentEndDate]
        const depId = settlement.employee.payrollProfile?.primaryDependencyId;
        const anyDep = depId
          ? null
          : await this.prisma.payrollDependency.findFirst({
              where: { tenantId },
            });
        const targetDepId = depId || anyDep?.id;

        if (targetDepId) {
          const curDate = new Date(settlement.enjoymentStartDate);
          const endDate = new Date(settlement.enjoymentEndDate);

          while (curDate <= endDate) {
            const shiftDate = new Date(curDate);
            await this.prisma.payrollShiftRecord.upsert({
              where: {
                tenantId_employeeId_shiftDate_isReinforcement: {
                  tenantId,
                  employeeId: settlement.employeeId,
                  shiftDate,
                  isReinforcement: false,
                },
              },
              update: {
                shiftCode: 'VAC' as any,
                leaveId: createdLeaveId,
                updatedById: userId,
              },
              create: {
                tenantId,
                employeeId: settlement.employeeId,
                dependencyId: targetDepId,
                shiftDate,
                year: shiftDate.getUTCFullYear(),
                month: shiftDate.getUTCMonth() + 1,
                dayOfMonth: shiftDate.getUTCDate(),
                shiftCode: 'VAC' as any,
                leaveId: createdLeaveId,
                createdById: userId,
                updatedById: userId,
              },
            });
            curDate.setUTCDate(curDate.getUTCDate() + 1);
          }
        }
      }

      return await this.prisma.payrollVacationSettlement.update({
        where: { id: settlementId },
        data: {
          status: PayrollSettlementStatus.APPROVED,
          linkedLeaveId: createdLeaveId,
          updatedById: userId,
        },
        include: { employee: true, linkedLeave: true },
      });
    } catch (error) {
      this.logger.error(
        `Error approving vacation settlement ${settlementId}`,
        error.stack,
      );
      throw error;
    }
  }

  async listVacationSettlements(tenantId: string, employeeId?: string) {
    try {
      const where: any = { tenantId };
      if (employeeId) where.employeeId = employeeId;

      return await this.prisma.payrollVacationSettlement.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              document: true,
              firstName: true,
              lastName: true,
              payrollProfile: {
                select: {
                  primaryDependency: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing vacation settlements for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getVacationSlipPdf(tenantId: string, settlementId: string) {
    try {
      const settlement = await this.prisma.payrollVacationSettlement.findFirst({
        where: { id: settlementId, tenantId },
        include: {
          employee: {
            include: {
              payrollProfile: {
                include: {
                  primaryDependency: true,
                  bank: true,
                },
              },
            },
          },
          tenant: {
            include: { profile: true },
          },
        },
      });

      if (!settlement) {
        throw new NotFoundException(
          `Liquidación de vacaciones no encontrada (ID: ${settlementId})`,
        );
      }

      const emp = settlement.employee;
      const prof = emp.payrollProfile;

      return await this.pdfService.generateVacationSlipPdf({
        settlementId: settlement.id,
        vacationType: settlement.vacationType,
        status: settlement.status,
        accrualStartDate: settlement.accrualStartDate
          .toISOString()
          .split('T')[0],
        accrualEndDate: settlement.accrualEndDate.toISOString().split('T')[0],
        enjoymentStartDate: settlement.enjoymentStartDate
          .toISOString()
          .split('T')[0],
        enjoymentEndDate: settlement.enjoymentEndDate
          .toISOString()
          .split('T')[0],
        returnDate: settlement.returnDate.toISOString().split('T')[0],
        businessDays: Number(settlement.businessDays),
        calendarDaysPaid: settlement.calendarDaysPaid,
        currentBasicSalary: Number(settlement.currentBasicSalary),
        averageVariableVacBase: Number(settlement.averageVariableVacBase),
        totalVacationBase: Number(settlement.totalVacationBase),
        grossVacationAmount: Number(settlement.grossVacationAmount),
        healthDeductionAmount: Number(settlement.healthDeductionAmount),
        pensionDeductionAmount: Number(settlement.pensionDeductionAmount),
        loansDeductionAmount: Number(settlement.loansDeductionAmount),
        netPayAmount: Number(settlement.netPayAmount),
        paymentDate: settlement.paymentDate
          ? settlement.paymentDate.toISOString().split('T')[0]
          : null,
        company: {
          legalName:
            settlement.tenant.profile?.legalName ||
            settlement.tenant.name ||
            'Seguridad Privada',
          nit: settlement.tenant.profile?.taxId || '900123456',
          city: settlement.tenant.profile?.city || 'Colombia',
        },
        employee: {
          documentType: emp.documentType || 'CC',
          document: emp.document,
          fullName: `${emp.firstName} ${emp.lastName}`.trim(),
          dependencyName: prof?.primaryDependency?.name,
          bankName: prof?.bank?.name,
          accountNumber: prof?.bankAccountNumber || undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error generating vacation slip PDF for settlement ${settlementId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 3. SOCIAL BENEFIT BATCHES (PRIMA, CESANTÍAS E INTERESES)
  // ============================================================================

  async generateSocialBenefitBatch(
    tenantId: string,
    dto: GenerateSocialBenefitBatchDto,
    userId?: string,
  ) {
    try {
      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const smmlv = settings ? Number(settings.smmlv) : 1423500;
      const transportAllowance = settings
        ? Number(settings.transportAllowance)
        : 200000;

      const isFirstSemester =
        dto.benefitType === SocialBenefitType.PRIMA_FIRST_SEMESTER;
      const isSecondSemester =
        dto.benefitType === SocialBenefitType.PRIMA_SECOND_SEMESTER;
      const isPrima = isFirstSemester || isSecondSemester;

      let periodStartStr: string;
      if (isFirstSemester) {
        periodStartStr = `${dto.year}-01-01`;
      } else if (isSecondSemester) {
        periodStartStr = `${dto.year}-07-01`;
      } else {
        periodStartStr = `${dto.year}-01-01`;
      }

      const activeEmployees = await this.prisma.employee.findMany({
        where: {
          tenantId,
          isActive: true,
          entryDate: { lte: new Date(dto.projectionEndDate) },
        },
        include: {
          payrollProfile: {
            include: {
              bank: true,
              cesantiasEntity: true,
              primaryDependency: true,
            },
          },
        },
      });

      let totalBenefitAmount = 0;
      let totalInterestAmount = 0;
      const itemsToUpsert: any[] = [];

      const cutoff = new Date(dto.cutoffDate);
      const periodStart = new Date(periodStartStr);

      for (const emp of activeEmployees) {
        const hire = emp.entryDate || periodStart;
        const basicSalaryMonthly = Number(
          emp.payrollProfile?.customBaseSalary || smmlv,
        );

        // Fetch variable earnings from settlement lines
        const variableLines = await this.prisma.payrollSettlementLine.findMany({
          where: {
            tenantId,
            employeeId: emp.id,
            ...(isPrima ? { inPri: true } : { inCes: true }),
            settlement: {
              period: {
                startDate: { gte: periodStart, lte: cutoff },
              },
            },
          },
          select: { totalValue: true },
        });

        const variableSum = variableLines.reduce(
          (acc, l) => acc + Number(l.totalValue),
          0,
        );
        const monthsCount = isPrima ? 6 : 12;
        const averageVariableEarnings =
          variableLines.length > 0
            ? Math.round((variableSum / monthsCount) * 100) / 100
            : 0;

        // Ausencias no remuneradas en el periodo
        const unpaidLeaves = await this.prisma.payrollLeaveAndAbsence.findMany({
          where: {
            tenantId,
            employeeId: emp.id,
            leaveType: LeaveAndAbsenceType.UNPAID_LEAVE_LNR,
            startDate: {
              gte: periodStart,
              lte: new Date(dto.projectionEndDate),
            },
          },
          select: { totalDays: true },
        });
        const unpaidDays = unpaidLeaves.reduce(
          (acc, l) => acc + l.totalDays,
          0,
        );

        const calc =
          SocialBenefitsAndVacationsEngine.calculateSocialBenefitItem({
            benefitType: dto.benefitType,
            employeeEntryDate: hire,
            periodStartDate: periodStartStr,
            cutoffDate: dto.cutoffDate,
            projectionEndDate: dto.projectionEndDate,
            basicSalaryMonthly,
            averageVariableEarnings,
            unpaidLeaveDaysDeducted: unpaidDays,
            smmlv,
            transportAllowanceAmount: transportAllowance,
          });

        totalBenefitAmount += calc.approvedBenefitAmount;
        totalInterestAmount += calc.approvedInterestAmount;

        const hasBankWarning = !emp.payrollProfile?.bankAccountNumber;

        itemsToUpsert.push({
          employeeId: emp.id,
          dependencyId: emp.payrollProfile?.primaryDependencyId || null,
          cesantiasEntityId: emp.payrollProfile?.cesantiasEntityId || null,
          hireDateSnapshot: hire,
          grossDaysInPeriod: calc.grossDaysInPeriod,
          unpaidLeaveDaysDeducted: calc.unpaidLeaveDaysDeducted,
          projectedDaysAdded: calc.projectedDaysAdded,
          netDaysWorked: calc.netDaysWorked,
          basicSalaryMonthly: calc.basicSalaryMonthly,
          averageVariableEarnings: calc.averageVariableEarnings,
          transportAllowanceBase: calc.transportAllowanceBase,
          totalComputationBase: calc.totalComputationBase,
          calculatedBenefitAmount: calc.calculatedBenefitAmount,
          approvedBenefitAmount: calc.approvedBenefitAmount,
          interestRatePct: calc.interestRatePct,
          calculatedInterestAmount: calc.calculatedInterestAmount,
          approvedInterestAmount: calc.approvedInterestAmount,
          bankId: emp.payrollProfile?.bankId || null,
          bankAccountType: emp.payrollProfile?.bankAccountType || 'SAVINGS',
          bankAccountNumber: emp.payrollProfile?.bankAccountNumber || null,
          hasBankWarning,
        });
      }

      // Upsert batch header
      const batchLabel =
        dto.notes ||
        (isFirstSemester
          ? `Prima de Servicios 1er Semestre ${dto.year}`
          : isSecondSemester
            ? `Prima de Servicios 2do Semestre ${dto.year}`
            : `Cesantías Anuales e Intereses 12% ${dto.year}`);

      const batch = await this.prisma.payrollSocialBenefitBatch.upsert({
        where: {
          tenantId_benefitType_year: {
            tenantId,
            benefitType: dto.benefitType,
            year: dto.year,
          },
        },
        update: {
          label: batchLabel,
          periodStartDate: periodStart,
          cutoffDate: cutoff,
          projectionEndDate: new Date(dto.projectionEndDate),
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
          totalEmployees: activeEmployees.length,
          totalBenefitAmount: Math.round(totalBenefitAmount * 100) / 100,
          totalInterestAmount: Math.round(totalInterestAmount * 100) / 100,
          notes: dto.notes,
          updatedById: userId,
        },
        create: {
          tenantId,
          benefitType: dto.benefitType,
          year: dto.year,
          label: batchLabel,
          periodStartDate: periodStart,
          cutoffDate: cutoff,
          projectionEndDate: new Date(dto.projectionEndDate),
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
          status: PayrollSettlementStatus.DRAFT,
          totalEmployees: activeEmployees.length,
          totalBenefitAmount: Math.round(totalBenefitAmount * 100) / 100,
          totalInterestAmount: Math.round(totalInterestAmount * 100) / 100,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });

      // Clear existing items and insert fresh
      await this.prisma.payrollSocialBenefitItem.deleteMany({
        where: { batchId: batch.id },
      });

      await this.prisma.payrollSocialBenefitItem.createMany({
        data: itemsToUpsert.map((item: any) => ({
          ...item,
          tenantId,
          batchId: batch.id,
          createdById: userId,
          updatedById: userId,
        })),
      });

      return await this.prisma.payrollSocialBenefitBatch.findUnique({
        where: { id: batch.id },
        include: {
          items: {
            include: {
              employee: {
                select: {
                  id: true,
                  document: true,
                  firstName: true,
                  lastName: true,
                },
              },
              cesantiasEntity: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error generating social benefit batch for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async listSocialBenefitBatches(tenantId: string, year?: number) {
    try {
      const where: any = { tenantId };
      if (year) where.year = year;

      return await this.prisma.payrollSocialBenefitBatch.findMany({
        where,
        include: {
          _count: { select: { items: true } },
        },
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      this.logger.error(
        `Error listing social benefit batches for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getSocialBenefitBatch(tenantId: string, batchId: string) {
    try {
      const batch = await this.prisma.payrollSocialBenefitBatch.findFirst({
        where: { id: batchId, tenantId },
        include: {
          items: {
            include: {
              employee: {
                select: {
                  id: true,
                  document: true,
                  firstName: true,
                  lastName: true,
                },
              },
              cesantiasEntity: { select: { id: true, name: true, code: true } },
              bank: { select: { id: true, name: true } },
            },
            orderBy: [{ employee: { lastName: 'asc' } }],
          },
        },
      });

      if (!batch) {
        throw new NotFoundException(
          `Lote de prestaciones no encontrado (ID: ${batchId})`,
        );
      }

      // Group totals by Cesantías Fund for Severance batches
      const fundsSummary: Record<
        string,
        { entityName: string; totalAmount: number; count: number }
      > = {};

      if (batch.benefitType === SocialBenefitType.SEVERANCE_ANNUAL) {
        for (const item of batch.items) {
          const fundName = item.cesantiasEntity?.name || 'SIN FONDO ASIGNADO';
          if (!fundsSummary[fundName]) {
            fundsSummary[fundName] = {
              entityName: fundName,
              totalAmount: 0,
              count: 0,
            };
          }
          fundsSummary[fundName].totalAmount += Number(
            item.approvedBenefitAmount,
          );
          fundsSummary[fundName].count += 1;
        }
      }

      return {
        ...batch,
        fundsSummary: Object.values(fundsSummary),
      };
    } catch (error) {
      this.logger.error(
        `Error getting social benefit batch ${batchId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateSocialBenefitItem(
    tenantId: string,
    itemId: string,
    dto: UpdateSocialBenefitItemDto,
    userId?: string,
  ) {
    try {
      const item = await this.prisma.payrollSocialBenefitItem.findFirst({
        where: { id: itemId, tenantId },
      });

      if (!item) {
        throw new NotFoundException(
          `Ítem de prestación no encontrado (ID: ${itemId})`,
        );
      }

      const updated = await this.prisma.payrollSocialBenefitItem.update({
        where: { id: itemId },
        data: {
          approvedBenefitAmount:
            dto.approvedBenefitAmount !== undefined
              ? dto.approvedBenefitAmount
              : item.approvedBenefitAmount,
          approvedInterestAmount:
            dto.approvedInterestAmount !== undefined
              ? dto.approvedInterestAmount
              : item.approvedInterestAmount,
          notes: dto.notes !== undefined ? dto.notes : item.notes,
          isManuallyEdited: true,
          updatedById: userId,
        },
      });

      // Recalculate batch totals
      const allItems = await this.prisma.payrollSocialBenefitItem.findMany({
        where: { batchId: item.batchId },
        select: { approvedBenefitAmount: true, approvedInterestAmount: true },
      });

      const totalBenefitAmount = allItems.reduce(
        (acc, i) => acc + Number(i.approvedBenefitAmount),
        0,
      );
      const totalInterestAmount = allItems.reduce(
        (acc, i) => acc + Number(i.approvedInterestAmount),
        0,
      );

      await this.prisma.payrollSocialBenefitBatch.update({
        where: { id: item.batchId },
        data: {
          totalBenefitAmount: Math.round(totalBenefitAmount * 100) / 100,
          totalInterestAmount: Math.round(totalInterestAmount * 100) / 100,
          updatedById: userId,
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Error updating social benefit item ${itemId}`,
        error.stack,
      );
      throw error;
    }
  }

  async approveSocialBenefitBatch(
    tenantId: string,
    batchId: string,
    userId?: string,
  ) {
    try {
      const batch = await this.prisma.payrollSocialBenefitBatch.findFirst({
        where: { id: batchId, tenantId },
      });

      if (!batch) {
        throw new NotFoundException(
          `Lote de prestaciones no encontrado (ID: ${batchId})`,
        );
      }

      return await this.prisma.payrollSocialBenefitBatch.update({
        where: { id: batchId },
        data: {
          status: PayrollSettlementStatus.APPROVED,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error approving social benefit batch ${batchId}`,
        error.stack,
      );
      throw error;
    }
  }

  async injectBenefitToPayroll(
    tenantId: string,
    batchId: string,
    dto: InjectBenefitToPayrollDto,
    userId?: string,
  ) {
    try {
      const batch = await this.prisma.payrollSocialBenefitBatch.findFirst({
        where: { id: batchId, tenantId },
        include: { items: true },
      });

      if (!batch) {
        throw new NotFoundException(
          `Lote de prestaciones no encontrado (ID: ${batchId})`,
        );
      }

      const targetPeriod = await this.prisma.payrollPeriod.findFirst({
        where: { id: dto.targetPeriodId, tenantId },
      });

      if (!targetPeriod) {
        throw new NotFoundException(
          `Periodo de nómina destino no encontrado (ID: ${dto.targetPeriodId})`,
        );
      }

      if (targetPeriod.status !== PayrollPeriodStatus.OPEN) {
        throw new BadRequestException(
          'El periodo destino debe estar en estado ABIERTO (OPEN) para inyectar novedades.',
        );
      }

      // Find concept for Prima or Interests
      let concept: any = null;
      if (dto.conceptId) {
        concept = await this.prisma.payrollConcept.findFirst({
          where: { id: dto.conceptId, tenantId },
        });
      }

      if (!concept) {
        const isPrima =
          batch.benefitType === SocialBenefitType.PRIMA_FIRST_SEMESTER ||
          batch.benefitType === SocialBenefitType.PRIMA_SECOND_SEMESTER;

        concept = await this.prisma.payrollConcept.findFirst({
          where: {
            tenantId,
            code: isPrima ? 101 : 102,
          },
        });
      }

      if (!concept) {
        concept = await this.prisma.payrollConcept.findFirst({
          where: { tenantId, nature: 'DEVENGO' },
        });
      }

      if (!concept) {
        throw new BadRequestException(
          'No se encontró un concepto de nómina adecuado para registrar la prestación.',
        );
      }

      let injectedCount = 0;

      for (const item of batch.items) {
        if (item.isInjectedToPayroll) continue;

        const amountToInject =
          batch.benefitType === SocialBenefitType.SEVERANCE_ANNUAL ||
          batch.benefitType === SocialBenefitType.SEVERANCE_INTERESTS
            ? Number(item.approvedInterestAmount)
            : Number(item.approvedBenefitAmount);

        if (amountToInject <= 0) continue;

        await this.prisma.payrollPeriodNovelty.create({
          data: {
            tenantId,
            periodId: targetPeriod.id,
            employeeId: item.employeeId,
            conceptId: concept.id,
            origin: NoveltyOriginType.BENEFITS_ENGINE,
            noveltyDate: new Date(),
            quantity: 1,
            unitValue: amountToInject,
            totalValue: amountToInject,
            notes: `Inyección automática desde lote ${batch.label}`,
            createdById: userId,
            updatedById: userId,
          },
        });

        await this.prisma.payrollSocialBenefitItem.update({
          where: { id: item.id },
          data: {
            isInjectedToPayroll: true,
            injectedPeriodId: targetPeriod.id,
            updatedById: userId,
          },
        });

        injectedCount++;
      }

      return {
        batchId: batch.id,
        targetPeriodId: targetPeriod.id,
        injectedCount,
        message: `Se inyectaron exitosamente ${injectedCount} novedades al periodo ${targetPeriod.label}.`,
      };
    } catch (error) {
      this.logger.error(
        `Error injecting benefit batch ${batchId} to payroll`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 4. FINAL CONTRACT SETTLEMENT ("LIQUIDACIÓN TOTAL")
  // ============================================================================

  async simulateFinalLiquidation(
    tenantId: string,
    dto: SimulateFinalLiquidationDto,
  ) {
    try {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
        include: {
          payrollProfile: {
            include: {
              primaryDependency: true,
              bank: true,
            },
          },
        },
      });

      if (!employee) {
        throw new NotFoundException(
          `Empleado no encontrado (ID: ${dto.employeeId})`,
        );
      }

      const exitReason = await this.prisma.payrollExitReason.findFirst({
        where: { id: dto.exitReasonId, tenantId },
      });

      if (!exitReason) {
        throw new NotFoundException(
          `Motivo de retiro no encontrado (ID: ${dto.exitReasonId})`,
        );
      }

      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      const smmlv = settings ? Number(settings.smmlv) : 1423500;
      const transportAllowance = settings
        ? Number(settings.transportAllowance)
        : 200000;

      // 1. Cruce de Préstamos Activos
      const activeLoans = await this.prisma.payrollLoan.findMany({
        where: {
          tenantId,
          employeeId: dto.employeeId,
          status: 'ACTIVE',
        },
      });
      const loansDeductedAmount = activeLoans.reduce(
        (acc, l) => acc + Number(l.remainingBalance),
        0,
      );

      // 2. Bases Promedio Históricas (Último Año)
      const retDate = new Date(dto.retirementDate);
      const oneYearAgo = new Date(retDate.getTime());
      oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);

      const lines = await this.prisma.payrollSettlementLine.findMany({
        where: {
          tenantId,
          employeeId: dto.employeeId,
          settlement: {
            period: {
              startDate: { gte: oneYearAgo, lte: retDate },
            },
          },
        },
        select: {
          totalValue: true,
          inCes: true,
          inPri: true,
          inVac: true,
        },
      });

      const basicSalary = Number(
        employee.payrollProfile?.customBaseSalary || smmlv,
      );
      const transport = basicSalary <= 2 * smmlv ? transportAllowance : 0;

      const cesVariable = lines
        .filter((l) => l.inCes)
        .reduce((acc, l) => acc + Number(l.totalValue), 0);
      const priVariable = lines
        .filter((l) => l.inPri)
        .reduce((acc, l) => acc + Number(l.totalValue), 0);
      const vacVariable = lines
        .filter((l) => l.inVac)
        .reduce((acc, l) => acc + Number(l.totalValue), 0);

      const cesantiasAverageBase =
        Math.round(
          (basicSalary +
            transport +
            (lines.length > 0 ? cesVariable / 12 : 0)) *
            100,
        ) / 100;
      const primaAverageBase =
        Math.round(
          (basicSalary + transport + (lines.length > 0 ? priVariable / 6 : 0)) *
            100,
        ) / 100;
      const vacationAverageBase =
        Math.round(
          (basicSalary + (lines.length > 0 ? vacVariable / 12 : 0)) * 100,
        ) / 100;

      // 3. Vacaciones ya disfrutadas en libro
      const vacationsEnjoyed =
        await this.prisma.payrollVacationSettlement.findMany({
          where: {
            tenantId,
            employeeId: dto.employeeId,
            status: {
              in: [
                PayrollSettlementStatus.APPROVED,
                PayrollSettlementStatus.PAID,
              ],
            },
          },
          select: { businessDays: true },
        });
      const vacationEnjoyedDaysTotal = vacationsEnjoyed.reduce(
        (acc, v) => acc + Number(v.businessDays),
        0,
      );

      // 4. Pending Days in Month of Retirement
      const pendingPayrollDays =
        dto.includePendingPayroll !== false ? retDate.getUTCDate() : 0;

      const contractType =
        employee.payrollProfile?.contractType ||
        EmploymentContractType.FIXED_TERM;

      const calc = ContractTerminationEngine.calculateFinalLiquidation({
        hireDate: employee.entryDate || retDate,
        retirementDate: dto.retirementDate,
        contractType,
        contractEndDate: employee.payrollProfile?.contractEndDate,
        isJustCause: exitReason.isJustCause,
        applyIndemnification: dto.applyIndemnification,
        lastBasicSalary: basicSalary,
        cesantiasAverageBase,
        primaAverageBase,
        vacationAverageBase,
        vacationEnjoyedDaysTotal,
        smmlv,
        transportAllowanceAmount: transportAllowance,
        includePendingPayroll: dto.includePendingPayroll !== false,
        pendingPayrollDays,
        loansDeductedAmount,
        otherEarningsAmount: dto.otherEarningsAmount || 0,
        otherDeductionsAmount: dto.otherDeductionsAmount || 0,
      });

      return {
        ...calc,
        employee: {
          id: employee.id,
          document: employee.document,
          fullName: `${employee.firstName} ${employee.lastName}`.trim(),
          dependencyName: employee.payrollProfile?.primaryDependency?.name,
          contractType,
        },
        exitReason: {
          id: exitReason.id,
          code: exitReason.code,
          name: exitReason.name,
          isJustCause: exitReason.isJustCause,
        },
        activeLoansCount: activeLoans.length,
      };
    } catch (error) {
      this.logger.error(
        `Error simulating final contract settlement for employee ${dto.employeeId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createFinalContractSettlement(
    tenantId: string,
    dto: CreateFinalContractSettlementDto,
    userId?: string,
  ) {
    try {
      const sim = await this.simulateFinalLiquidation(tenantId, dto);

      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
        include: { payrollProfile: true },
      });

      return await this.prisma.payrollFinalContractSettlement.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          exitReasonId: dto.exitReasonId,
          primaryDependencyId:
            employee?.payrollProfile?.primaryDependencyId || null,
          status: PayrollSettlementStatus.DRAFT,
          contractTypeSnapshot: sim.employee.contractType,
          hireDate: new Date(employee?.entryDate || dto.retirementDate),
          retirementDate: new Date(dto.retirementDate),
          contractEndDateSnapshot: employee?.payrollProfile?.contractEndDate
            ? new Date(employee.payrollProfile.contractEndDate)
            : null,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
          totalContractDays360: sim.totalContractDays360,
          unpaidLeaveDaysTotal: sim.unpaidLeaveDaysTotal,
          netServiceDaysTotal: sim.netServiceDaysTotal,
          lastBasicSalary: sim.lastBasicSalary,
          transportAllowanceApplicable: sim.transportAllowanceApplicable,
          cesantiasAverageBase: sim.cesantiasAverageBase,
          primaAverageBase: sim.primaAverageBase,
          vacationAverageBase: sim.vacationAverageBase,
          cesantiasPendingDays: sim.cesantiasPendingDays,
          cesantiasAmount: sim.cesantiasAmount,
          interestsCesantiasAmount: sim.interestsCesantiasAmount,
          primaPendingDays: sim.primaPendingDays,
          primaAmount: sim.primaAmount,
          vacationTotalAccruedDays: sim.vacationTotalAccruedDays,
          vacationEnjoyedDays: sim.vacationEnjoyedDays,
          vacationPendingBusinessDays: sim.vacationPendingBusinessDays,
          vacationAmount: sim.vacationAmount,
          includePendingPayroll: sim.includePendingPayroll,
          pendingPayrollDays: sim.pendingPayrollDays,
          pendingBasicSalaryAmount: sim.pendingBasicSalaryAmount,
          pendingTransportAmount: sim.pendingTransportAmount,
          pendingOvertimeAmount: sim.pendingOvertimeAmount,
          pendingHealthDeduction: sim.pendingHealthDeduction,
          pendingPensionDeduction: sim.pendingPensionDeduction,
          applyIndemnification: sim.applyIndemnification,
          indemnificationDays: sim.indemnificationDays,
          indemnificationAmount: sim.indemnificationAmount,
          otherEarningsAmount: sim.otherEarningsAmount,
          otherEarningsConcept: dto.otherEarningsConcept,
          loansDeductedAmount: sim.loansDeductedAmount,
          otherDeductionsAmount: sim.otherDeductionsAmount,
          otherDeductionsConcept: dto.otherDeductionsConcept,
          totalBenefitsAndEarnings: sim.totalBenefitsAndEarnings,
          totalDeductions: sim.totalDeductions,
          netPayAmount: sim.netPayAmount,
          blockForRehireBdn: dto.blockForRehireBdn || false,
          bankId: employee?.payrollProfile?.bankId || null,
          bankAccountType:
            employee?.payrollProfile?.bankAccountType || 'SAVINGS',
          bankAccountNumber:
            employee?.payrollProfile?.bankAccountNumber || null,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          employee: true,
          exitReason: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating final contract settlement for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async approveFinalContractSettlement(
    tenantId: string,
    settlementId: string,
    userId?: string,
  ) {
    try {
      const settlement =
        await this.prisma.payrollFinalContractSettlement.findFirst({
          where: { id: settlementId, tenantId },
          include: { employee: true },
        });

      if (!settlement) {
        throw new NotFoundException(
          `Liquidación definitiva no encontrada (ID: ${settlementId})`,
        );
      }

      if (settlement.status === PayrollSettlementStatus.APPROVED) {
        return settlement;
      }

      // 1. Inactivate & Retire Employee
      await this.prisma.employee.update({
        where: { id: settlement.employeeId },
        data: {
          isActive: false,
          isRetired: true,
          retiredAt: settlement.retirementDate,
          updatedBy: userId,
        },
      });

      if (settlement.blockForRehireBdn) {
        await this.prisma.employeePayrollProfile.update({
          where: { employeeId: settlement.employeeId },
          data: { isBlockedForRehire: true, updatedById: userId },
        });
      }

      // 2. Close active dependency assignments
      await this.prisma.employeeDependencyAssignment.updateMany({
        where: {
          tenantId,
          employeeId: settlement.employeeId,
          isActive: true,
        },
        data: {
          isActive: false,
          endDate: settlement.retirementDate,
          updatedById: userId,
        },
      });

      // 3. Pay off active loans that were deducted
      if (Number(settlement.loansDeductedAmount) > 0) {
        await this.prisma.payrollLoan.updateMany({
          where: {
            tenantId,
            employeeId: settlement.employeeId,
            status: 'ACTIVE',
          },
          data: {
            status: 'PAID_OFF',
            remainingBalance: 0,
            updatedById: userId,
          },
        });
      }

      return await this.prisma.payrollFinalContractSettlement.update({
        where: { id: settlementId },
        data: {
          status: PayrollSettlementStatus.APPROVED,
          updatedById: userId,
        },
        include: { employee: true, exitReason: true },
      });
    } catch (error) {
      this.logger.error(
        `Error approving final contract settlement ${settlementId}`,
        error.stack,
      );
      throw error;
    }
  }

  async listFinalContractSettlements(tenantId: string) {
    try {
      return await this.prisma.payrollFinalContractSettlement.findMany({
        where: { tenantId },
        include: {
          employee: {
            select: {
              id: true,
              document: true,
              firstName: true,
              lastName: true,
              payrollProfile: {
                select: {
                  primaryDependency: { select: { name: true } },
                },
              },
            },
          },
          exitReason: {
            select: { id: true, code: true, name: true, isJustCause: true },
          },
        },
        orderBy: { retirementDate: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing final contract settlements for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFinalLiquidationPdf(tenantId: string, settlementId: string) {
    try {
      const settlement =
        await this.prisma.payrollFinalContractSettlement.findFirst({
          where: { id: settlementId, tenantId },
          include: {
            employee: {
              include: {
                payrollProfile: {
                  include: {
                    primaryDependency: true,
                    bank: true,
                  },
                },
              },
            },
            exitReason: true,
            tenant: {
              include: { profile: true },
            },
          },
        });

      if (!settlement) {
        throw new NotFoundException(
          `Liquidación definitiva no encontrada (ID: ${settlementId})`,
        );
      }

      const emp = settlement.employee;
      const prof = emp.payrollProfile;

      return await this.pdfService.generateFinalLiquidationPdf({
        settlementId: settlement.id,
        contractType: settlement.contractTypeSnapshot,
        exitReasonName: settlement.exitReason.name,
        isJustCause: settlement.exitReason.isJustCause,
        hireDate: settlement.hireDate.toISOString().split('T')[0],
        retirementDate: settlement.retirementDate.toISOString().split('T')[0],
        contractDays360: settlement.totalContractDays360,
        netServiceDays: settlement.netServiceDaysTotal,
        unpaidLeaveDays: settlement.unpaidLeaveDaysTotal,
        lastBasicSalary: Number(settlement.lastBasicSalary),
        transportAllowanceApplicable: Number(
          settlement.transportAllowanceApplicable,
        ),
        cesantiasAverageBase: Number(settlement.cesantiasAverageBase),
        primaAverageBase: Number(settlement.primaAverageBase),
        vacationAverageBase: Number(settlement.vacationAverageBase),
        cesantiasPendingDays: settlement.cesantiasPendingDays,
        cesantiasAmount: Number(settlement.cesantiasAmount),
        interestsCesantiasAmount: Number(settlement.interestsCesantiasAmount),
        primaPendingDays: settlement.primaPendingDays,
        primaAmount: Number(settlement.primaAmount),
        vacationAccruedDays: Number(settlement.vacationTotalAccruedDays),
        vacationEnjoyedDays: Number(settlement.vacationEnjoyedDays),
        vacationPendingDays: Number(settlement.vacationPendingBusinessDays),
        vacationAmount: Number(settlement.vacationAmount),
        includePendingPayroll: settlement.includePendingPayroll,
        pendingPayrollDays: settlement.pendingPayrollDays,
        pendingBasicSalaryAmount: Number(settlement.pendingBasicSalaryAmount),
        pendingTransportAmount: Number(settlement.pendingTransportAmount),
        pendingOvertimeAmount: Number(settlement.pendingOvertimeAmount),
        pendingHealthDeduction: Number(settlement.pendingHealthDeduction),
        pendingPensionDeduction: Number(settlement.pendingPensionDeduction),
        applyIndemnification: settlement.applyIndemnification,
        indemnificationDays: Number(settlement.indemnificationDays),
        indemnificationAmount: Number(settlement.indemnificationAmount),
        otherEarningsAmount: Number(settlement.otherEarningsAmount),
        otherEarningsConcept: settlement.otherEarningsConcept,
        loansDeductedAmount: Number(settlement.loansDeductedAmount),
        otherDeductionsAmount: Number(settlement.otherDeductionsAmount),
        otherDeductionsConcept: settlement.otherDeductionsConcept,
        totalBenefitsAndEarnings: Number(settlement.totalBenefitsAndEarnings),
        totalDeductions: Number(settlement.totalDeductions),
        netPayAmount: Number(settlement.netPayAmount),
        paymentDate: settlement.paymentDate
          ? settlement.paymentDate.toISOString().split('T')[0]
          : null,
        notes: settlement.notes,
        company: {
          legalName:
            settlement.tenant.profile?.legalName ||
            settlement.tenant.name ||
            'Seguridad Privada',
          nit: settlement.tenant.profile?.taxId || '900123456',
          city: settlement.tenant.profile?.city || 'Colombia',
        },
        employee: {
          documentType: emp.documentType || 'CC',
          document: emp.document,
          fullName: `${emp.firstName} ${emp.lastName}`.trim(),
          dependencyName: prof?.primaryDependency?.name,
          bankName: prof?.bank?.name,
          accountNumber: prof?.bankAccountNumber || undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error generating final liquidation PDF for settlement ${settlementId}`,
        error.stack,
      );
      throw error;
    }
  }
}
