import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../../common/mail/mail.service';
import {
  LiquidatePeriodDto,
  SettlementLineEditDto,
  ManualEditSettlementDto,
  GenerateAdvanceDto,
  UpdateAdvanceItemDto,
  GenerateAchFileDto,
  SendPayslipsEmailDto,
  QuerySettlementsDto,
} from '../dtos/payroll-settlement.dto';
import {
  PayrollLiquidationEngine,
  LiquidationEngineInput,
  ConceptMini,
  DependencyWithModality,
} from '../engines/payroll-liquidation.engine';
import {
  BankAchGeneratorEngine,
  AchBatchGeneratorInput,
  AchBeneficiaryItem,
} from '../engines/bank-ach-generator.engine';
import {
  PayrollPayslipPdfService,
  PayslipRenderItem,
} from './payroll-payslip-pdf.service';
import {
  PayrollSettlementStatus,
  PayrollPeriodStatus,
  PayrollDisbursementType,
  PayslipDeliveryStatus,
  PayrollConceptNature,
  PayrollLineOrigin,
  PayrollLoanStatus,
  EmployeeSalaryMode,
  ShiftDayCode,
  LeaveAndAbsenceType,
  PermanentConceptScope,
  NoveltyPeriodicityRule,
  NoveltyOriginType,
  ArlRiskClass,
  DependencySettlementType,
} from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class PayrollSettlementService {
  private readonly logger = new Logger(PayrollSettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly liquidationEngine: PayrollLiquidationEngine,
    private readonly achGeneratorEngine: BankAchGeneratorEngine,
    private readonly payslipPdfService: PayrollPayslipPdfService,
  ) {}

  // ============================================================================
  // 1. KPIS RESUMEN EJECUTIVO PRE-NÓMINA (Numerales 3.8 y 3.9 Pronos)
  // ============================================================================
  async getKpis(tenantId: string, periodId: string) {
    try {
      const settlements = await this.prisma.payrollPeriodSettlement.findMany({
        where: { tenantId, periodId },
        select: {
          status: true,
          totalEarnings: true,
          totalDeductions: true,
          netPayAmount: true,
          totalEmployerCost: true,
          hasBankWarning: true,
          bankAccountNumber: true,
          payslipEmailStatus: true,
        },
      });

      const totalEmployees = settlements.length;
      let totalEarnings = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;
      let totalEmployerCost = 0;
      let draftCount = 0;
      let approvedCount = 0;
      let paidCount = 0;
      let bankWarningsCount = 0;
      let payslipsSentCount = 0;

      for (const s of settlements) {
        totalEarnings += Number(s.totalEarnings);
        totalDeductions += Number(s.totalDeductions);
        totalNetPay += Number(s.netPayAmount);
        totalEmployerCost += Number(s.totalEmployerCost);

        if (s.status === PayrollSettlementStatus.DRAFT) draftCount++;
        else if (s.status === PayrollSettlementStatus.APPROVED) approvedCount++;
        else if (s.status === PayrollSettlementStatus.PAID) paidCount++;

        if (s.hasBankWarning || !s.bankAccountNumber) {
          bankWarningsCount++;
        }

        if (s.payslipEmailStatus === PayslipDeliveryStatus.SENT) {
          payslipsSentCount++;
        }
      }

      return {
        totalEmployees,
        totalEarnings: Math.round(totalEarnings),
        totalDeductions: Math.round(totalDeductions),
        totalNetPay: Math.round(totalNetPay),
        totalEmployerCost: Math.round(totalEmployerCost),
        draftCount,
        approvedCount,
        paidCount,
        bankWarningsCount,
        payslipsSentCount,
      };
    } catch (error) {
      this.logger.error(
        `Error getting settlement KPIs for period ${periodId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 2. LIQUIDACIÓN MASIVA O FILTRADA DE PERIODO (Pre-Nómina)
  // ============================================================================
  async liquidatePeriod(
    tenantId: string,
    periodId: string,
    dto: LiquidatePeriodDto,
    userId?: string,
  ) {
    try {
      const period = await this.prisma.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });

      if (!period) {
        throw new NotFoundException('Periodo de nómina no encontrado.');
      }

      if (period.status === PayrollPeriodStatus.CLOSED) {
        throw new BadRequestException(
          'No se puede reliquidar un periodo cerrado. Debe reabrirlo primero.',
        );
      }

      // Parámetros legales
      let settings = await this.prisma.payrollSettings.findFirst({
        where: { tenantId },
      });
      if (!settings) {
        settings = await this.prisma.payrollSettings.create({
          data: {
            tenantId,
            smmlv: 1750905.0,
            transportAllowance: 249095.0,
            uvtValue: 49799.0,
            weeklyWorkingHours: 44.0,
            monthlyDivisorHours: 230,
            createdById: userId,
          },
        });
      }

      // Catálogo de Conceptos Activos
      const allConcepts = await this.prisma.payrollConcept.findMany({
        where: { tenantId, isActive: true },
      });

      const findConcept = (
        code: number,
        fallbackName: string,
        fallbackNature: PayrollConceptNature,
      ): ConceptMini => {
        const found = allConcepts.find((c) => c.code === code);
        if (found) {
          return {
            id: found.id,
            code: found.code,
            name: found.name,
            nature: found.nature,
            inUgpp40Pct: found.inUgpp40Pct,
            inIbcEpsAfp: found.inIbcEpsAfp,
            inIbcArl: found.inIbcArl,
            inIbcCcf: found.inIbcCcf,
            isConstitutiveOfSalary: found.isConstitutiveOfSalary,
          };
        }
        return {
          id: `fallback-concept-${code}`,
          code,
          name: fallbackName,
          nature: fallbackNature,
          inUgpp40Pct: false,
          inIbcEpsAfp: false,
          inIbcArl: false,
          inIbcCcf: false,
          isConstitutiveOfSalary:
            fallbackNature === PayrollConceptNature.DEVENGO,
        };
      };

      const systemConcepts = {
        basicSalaryConcept: findConcept(
          1,
          'SUELDO BASICO',
          PayrollConceptNature.DEVENGO,
        ),
        transportConcept: findConcept(
          10,
          'AUXILIO DE TRANSPORTE LEGAL',
          PayrollConceptNature.DEVENGO,
        ),
        healthConcept: findConcept(
          601,
          'APORTE SALUD EMPLEADO (4%)',
          PayrollConceptNature.SEG_SOCIAL,
        ),
        pensionConcept: findConcept(
          602,
          'APORTE PENSION EMPLEADO (4%)',
          PayrollConceptNature.SEG_SOCIAL,
        ),
        fspConcept: findConcept(
          603,
          'FONDO SOLIDARIDAD PENSIONAL (1%)',
          PayrollConceptNature.SEG_SOCIAL,
        ),
        retefuenteConcept: findConcept(
          505,
          'RETENCION EN LA FUENTE SALARIOS',
          PayrollConceptNature.DEDUCCION,
        ),
        advanceConcept: findConcept(
          509,
          'ANTICIPO DE QUINCENA / NOMINA',
          PayrollConceptNature.DEDUCCION,
        ),
        nightSurchargeConcept: findConcept(
          2,
          'RECARGO NOCTURNO (35%)',
          PayrollConceptNature.DEVENGO,
        ),
        extraDayConcept: findConcept(
          3,
          'HORAS EXTRAS DIURNAS (125%)',
          PayrollConceptNature.DEVENGO,
        ),
        extraNightConcept: findConcept(
          4,
          'HORAS EXTRAS NOCTURNAS (175%)',
          PayrollConceptNature.DEVENGO,
        ),
        holidaySurchargeConcept: findConcept(
          5,
          'RECARGO FESTIVO (80%)',
          PayrollConceptNature.DEVENGO,
        ),
        sundayCompensatedConcept: findConcept(
          6,
          'DOMINICAL CON DESCANSO (80%)',
          PayrollConceptNature.DEVENGO,
        ),
        extraHolidayDayConcept: findConcept(
          9,
          'H. EXTRAS FESTIVAS DIURNAS (205%)',
          PayrollConceptNature.DEVENGO,
        ),
        extraHolidayNightConcept: findConcept(
          8,
          'H. EXTRAS FESTIVAS NOCTURNAS (255%)',
          PayrollConceptNature.DEVENGO,
        ),
      };

      // Filtro de empleados a liquidar
      const employeeWhere: any = {
        tenantId,
        OR: [
          { isActive: true, isRetired: false },
          { isRetired: true, retiredAt: { gte: period.startDate } },
        ],
      };

      if (dto.employeeIds && dto.employeeIds.length > 0) {
        employeeWhere.id = { in: dto.employeeIds };
      }
      if (dto.branchId) {
        employeeWhere.payrollProfile = {
          ...employeeWhere.payrollProfile,
          branchId: dto.branchId,
        };
      }
      if (dto.dependencyId) {
        employeeWhere.payrollProfile = {
          ...employeeWhere.payrollProfile,
          primaryDependencyId: dto.dependencyId,
        };
      }

      const employees = await this.prisma.employee.findMany({
        where: employeeWhere,
        include: {
          payrollProfile: {
            include: {
              primaryDependency: {
                include: {
                  modality: {
                    include: {
                      items: {
                        include: { concept: true },
                      },
                    },
                  },
                },
              },
              bank: true,
            },
          },
        },
      });

      const empIds = employees.map((e) => e.id);

      // Cargar Novedades, Dependencias, Turnos y Préstamos masivos para los empleados
      const [
        allAssignments,
        allShifts,
        allLeaves,
        allPermanent,
        allNovelties,
        allLoans,
        allAdvances,
      ] = await Promise.all([
        this.prisma.employeeDependencyAssignment.findMany({
          where: {
            tenantId,
            employeeId: { in: empIds },
            startDate: { lte: period.endDate },
            OR: [{ endDate: null }, { endDate: { gte: period.startDate } }],
          },
          include: {
            dependency: {
              include: {
                modality: {
                  include: {
                    items: {
                      include: { concept: true },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.payrollShiftRecord.findMany({
          where: {
            tenantId,
            employeeId: { in: empIds },
            shiftDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
        }),
        this.prisma.payrollLeaveAndAbsence.findMany({
          where: {
            tenantId,
            employeeId: { in: empIds },
            startDate: { lte: period.endDate },
            endDate: { gte: period.startDate },
          },
          include: {
            concept: true,
          },
        }),
        this.prisma.payrollPermanentConcept.findMany({
          where: {
            tenantId,
            isActive: true,
            employeeId: { in: empIds },
          },
          include: { concept: true },
        }),
        this.prisma.payrollPeriodNovelty.findMany({
          where: {
            tenantId,
            periodId: period.id,
            employeeId: { in: empIds },
          },
          include: { concept: true },
        }),
        this.prisma.payrollLoan.findMany({
          where: {
            tenantId,
            employeeId: { in: empIds },
            status: PayrollLoanStatus.ACTIVE,
          },
          include: { concept: true },
        }),
        this.prisma.payrollAdvanceItem.findMany({
          where: {
            tenantId,
            employeeId: { in: empIds },
            advanceSettlement: {
              year: period.year,
              month: period.month,
            },
            isDeductedInPayroll: false,
          },
        }),
      ]);

      let settledCount = 0;
      let totalNetPayCalculated = 0;

      for (const emp of employees) {
        const empAssignments = allAssignments.filter(
          (a) => a.employeeId === emp.id,
        );
        const empShifts = allShifts.filter((s) => s.employeeId === emp.id);
        const empLeaves = allLeaves.filter((l) => l.employeeId === emp.id);
        const empPermanent = allPermanent.filter(
          (p) => p.employeeId === emp.id,
        );
        const empNovelties = allNovelties.filter(
          (n) => n.employeeId === emp.id,
        );
        const empLoans = allLoans.filter((ln) => ln.employeeId === emp.id);
        const empAdvance = allAdvances.find((adv) => adv.employeeId === emp.id);

        const profile = emp.payrollProfile;
        const mappedPrimaryDep: DependencyWithModality | null =
          profile?.primaryDependency
            ? {
                id: profile.primaryDependency.id,
                code: profile.primaryDependency.code,
                name: profile.primaryDependency.name,
                monthlyPaidValue: Number(
                  profile.primaryDependency.monthlyPaidValue,
                ),
                settlementType: profile.primaryDependency.settlementType,
                arlRiskClass: profile.primaryDependency.arlRiskClass,
                modality: profile.primaryDependency.modality
                  ? {
                      items: profile.primaryDependency.modality.items.map(
                        (it) => ({
                          conceptId: it.conceptId,
                          concept: {
                            id: it.concept.id,
                            code: it.concept.code,
                            name: it.concept.name,
                            nature: it.concept.nature,
                            isConstitutiveOfSalary:
                              it.concept.isConstitutiveOfSalary,
                          },
                          percentage: Number(it.percentage),
                        }),
                      ),
                    }
                  : null,
              }
            : null;

        const liquidationInput: LiquidationEngineInput = {
          employee: {
            id: emp.id,
            document: emp.document,
            fullName: emp.fullName,
            entryDate: emp.entryDate,
            retiredAt: emp.retiredAt,
            payrollProfile: profile
              ? {
                  salaryMode: profile.salaryMode,
                  customBaseSalary: Number(profile.customBaseSalary),
                  hasTransportAllowance: profile.hasTransportAllowance,
                  customAdvanceValue: profile.customAdvanceValue
                    ? Number(profile.customAdvanceValue)
                    : null,
                  isPensioner: profile.isPensioner,
                  pilaContributorType: profile.pilaContributorType || undefined,
                  arlRiskClass: profile.arlRiskClass,
                  primaryDependencyId: profile.primaryDependencyId,
                  branchId: profile.branchId,
                  bankId: profile.bankId,
                  bankAccountType: profile.bankAccountType,
                  bankAccountNumber: profile.bankAccountNumber,
                }
              : null,
            primaryDependency: mappedPrimaryDep,
          },
          period: {
            id: period.id,
            year: period.year,
            month: period.month,
            periodNumber: period.periodNumber,
            startDate: period.startDate,
            endDate: period.endDate,
          },
          settings: {
            smmlv: Number(settings.smmlv),
            transportAllowance: Number(settings.transportAllowance),
            uvtValue: Number(settings.uvtValue),
            monthlyDivisorHours: Number(settings.monthlyDivisorHours),
            transportTopSmmlvMultiple: Number(
              settings.transportTopSmmlvMultiple,
            ),
            enforceUgpp40PctRule: settings.enforceUgpp40PctRule,
            applyExonerationLaw1607: settings.applyExonerationLaw1607,
            normalHourFactorPct: Number(settings.normalHourFactorPct),
            nightSurchargePct: Number(settings.nightSurchargePct),
            extraDayPct: Number(settings.extraDayPct),
            extraNightPct: Number(settings.extraNightPct),
            sundayCompensatedPct: Number(settings.sundayCompensatedPct),
            holidaySurchargePct: Number(settings.holidaySurchargePct),
            extraHolidayDayPct: Number(settings.extraHolidayDayPct),
            extraHolidayNightPct: Number(settings.extraHolidayNightPct),
            employeeHealthPct: Number(settings.employeeHealthPct),
            employeePensionPct: Number(settings.employeePensionPct),
            fspBasePct: Number(settings.fspBasePct),
            employerHealthPct: Number(settings.employerHealthPct),
            employerPensionPct: Number(settings.employerPensionPct),
            ccfPct: Number(settings.ccfPct),
            senaPct: Number(settings.senaPct),
            icbfPct: Number(settings.icbfPct),
          },
          dependencyAssignments: empAssignments.map((a) => ({
            id: a.id,
            dependencyId: a.dependencyId,
            startDate: a.startDate,
            endDate: a.endDate,
            isPrimary: a.isPrimary,
            dependency: {
              id: a.dependency.id,
              code: a.dependency.code,
              name: a.dependency.name,
              monthlyPaidValue: Number(a.dependency.monthlyPaidValue),
              settlementType: a.dependency.settlementType,
              arlRiskClass: a.dependency.arlRiskClass,
              modality: a.dependency.modality
                ? {
                    items: a.dependency.modality.items.map((it) => ({
                      conceptId: it.conceptId,
                      concept: {
                        id: it.concept.id,
                        code: it.concept.code,
                        name: it.concept.name,
                        nature: it.concept.nature,
                        isConstitutiveOfSalary:
                          it.concept.isConstitutiveOfSalary,
                      },
                      percentage: Number(it.percentage),
                    })),
                  }
                : null,
            },
          })),
          shiftRecords: empShifts.map((s) => ({
            shiftDate: s.shiftDate,
            shiftCode: s.shiftCode,
            isReinforcement: s.isReinforcement,
            dependencyId: s.dependencyId,
            ordinaryDayHours: Number(s.ordinaryDayHours),
            nightSurchargeHours: Number(s.nightSurchargeHours),
            sundayHolidayHours: Number(s.sundayHolidayHours),
            overtimeDayHours: Number(s.overtimeDayHours),
            overtimeNightHours: Number(s.overtimeNightHours),
            overtimeHolidayDayHours: Number(s.overtimeHolidayDayHours),
            overtimeHolidayNightHours: Number(s.overtimeHolidayNightHours),
            leaveId: s.leaveId,
          })),
          leaves: empLeaves.map((l) => ({
            id: l.id,
            leaveType: l.leaveType,
            conceptId: l.conceptId,
            concept: {
              id: l.concept.id,
              code: l.concept.code,
              name: l.concept.name,
              nature: l.concept.nature,
            },
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays,
            employerDays: l.employerDays,
            entityDays: l.entityDays,
            employerRecognizedAmount: Number(l.employerRecognizedAmount),
            entityRecognizedAmount: Number(l.entityRecognizedAmount),
            totalLiquidatedAmount: Number(l.totalLiquidatedAmount),
            affectsSeventhDay: l.affectsSeventhDay,
          })),
          permanentConcepts: empPermanent.map((p) => ({
            id: p.id,
            conceptId: p.conceptId,
            concept: {
              id: p.concept.id,
              code: p.concept.code,
              name: p.concept.name,
              nature: p.concept.nature,
              inUgpp40Pct: p.concept.inUgpp40Pct,
              inIbcEpsAfp: p.concept.inIbcEpsAfp,
              inIbcArl: p.concept.inIbcArl,
              inIbcCcf: p.concept.inIbcCcf,
              isConstitutiveOfSalary: p.concept.isConstitutiveOfSalary,
            },
            scope: p.scope,
            dependencyId: p.dependencyId,
            amount: Number(p.amount),
            isProportionalToDays: p.isProportionalToDays,
            applicationRule: p.applicationRule,
          })),
          periodNovelties: empNovelties.map((n) => ({
            id: n.id,
            conceptId: n.conceptId,
            concept: {
              id: n.concept.id,
              code: n.concept.code,
              name: n.concept.name,
              nature: n.concept.nature,
              inUgpp40Pct: n.concept.inUgpp40Pct,
              inIbcEpsAfp: n.concept.inIbcEpsAfp,
              inIbcArl: n.concept.inIbcArl,
              inIbcCcf: n.concept.inIbcCcf,
              isConstitutiveOfSalary: n.concept.isConstitutiveOfSalary,
            },
            dependencyId: n.dependencyId,
            quantity: Number(n.quantity),
            unitValue: Number(n.unitValue),
            totalValue: Number(n.totalValue),
            origin: n.origin,
          })),
          activeLoans: empLoans.map((ln) => ({
            id: ln.id,
            loanCode: ln.loanCode,
            conceptId: ln.conceptId,
            concept: {
              id: ln.concept.id,
              code: ln.concept.code,
              name: ln.concept.name,
              nature: ln.concept.nature,
            },
            installmentAmount: Number(ln.installmentAmount),
            remainingBalance: Number(ln.remainingBalance),
            deductionRule: ln.deductionRule,
          })),
          pendingAdvanceItem: empAdvance
            ? {
                id: empAdvance.id,
                approvedAmount: Number(empAdvance.approvedAmount),
                isDeductedInPayroll: empAdvance.isDeductedInPayroll,
              }
            : null,
          systemConcepts,
        };

        const calc = this.liquidationEngine.calculate(liquidationInput);

        // Validar si existe registro previo para verificar líneas editadas manualmente
        const existingSettlement =
          await this.prisma.payrollPeriodSettlement.findUnique({
            where: {
              tenantId_periodId_employeeId: {
                tenantId,
                periodId: period.id,
                employeeId: emp.id,
              },
            },
            include: {
              lines: true,
            },
          });

        let finalLines = calc.lines;
        let isManuallyEdited = false;

        if (existingSettlement && dto.preserveManualEdits) {
          const manualLines = existingSettlement.lines.filter(
            (l) => l.isManualOverride,
          );
          if (manualLines.length > 0) {
            isManuallyEdited = true;
            // Preservar renglones manuales reemplazando los generados del mismo concepto
            const manualConceptIds = new Set(
              manualLines.map((m) => m.conceptId),
            );
            finalLines = [
              ...finalLines.filter((gl) => !manualConceptIds.has(gl.conceptId)),
              ...manualLines.map((ml) => ({
                conceptId: ml.conceptId,
                conceptCode: 0,
                conceptName: 'Ajuste manual',
                dependencyId: ml.dependencyId,
                nature: ml.nature,
                origin: ml.origin,
                quantity: Number(ml.quantity),
                unitValue: Number(ml.unitValue),
                totalValue: Number(ml.totalValue),
                isConstitutiveOfSalary: ml.isConstitutiveOfSalary,
                isDeletable: ml.isDeletable,
                inIbcEpsAfp: ml.inIbcEpsAfp,
                inIbcArl: ml.inIbcArl,
                inIbcCcf: ml.inIbcCcf,
                inUgpp40Pct: ml.inUgpp40Pct,
                loanId: ml.loanId,
                leaveId: ml.leaveId,
                notes: ml.notes || undefined,
              })),
            ];
          }
        }

        const hasBankWarning = !profile?.bankId || !profile?.bankAccountNumber;

        // Upsert de la cabecera del settlement
        const settlementRecord =
          await this.prisma.payrollPeriodSettlement.upsert({
            where: {
              tenantId_periodId_employeeId: {
                tenantId,
                periodId: period.id,
                employeeId: emp.id,
              },
            },
            update: {
              primaryDependencyId: profile?.primaryDependencyId || null,
              branchId: profile?.branchId || null,
              salaryModeSnapshot: calc.salaryModeSnapshot,
              baseSalaryMonthly: calc.baseSalaryMonthly,
              workedDays: calc.workedDays,
              paidLeaveDays: calc.paidLeaveDays,
              incapacityDays: calc.incapacityDays,
              vacationDays: calc.vacationDays,
              unpaidAbsenceDays: calc.unpaidAbsenceDays,
              seventhDaysLost: calc.seventhDaysLost,
              basicSalaryEarned: calc.basicSalaryEarned,
              transportAllowanceAmount: calc.transportAllowanceAmount,
              overtimeAndSurchargesAmount: calc.overtimeAndSurchargesAmount,
              leavesAndIncapacitiesAmount: calc.leavesAndIncapacitiesAmount,
              bonusesNonSalarialAmount: calc.bonusesNonSalarialAmount,
              otherEarningsAmount: calc.otherEarningsAmount,
              totalEarnings: calc.totalEarnings,
              ugppTotalRemuneration: calc.ugppTotalRemuneration,
              ugppLimit40Pct: calc.ugppLimit40Pct,
              ugppNonSalarialTotal: calc.ugppNonSalarialTotal,
              ugppExcessAmount: calc.ugppExcessAmount,
              ibcEps: calc.ibcEps,
              ibcAfp: calc.ibcAfp,
              ibcArl: calc.ibcArl,
              ibcCcf: calc.ibcCcf,
              healthEmployeeAmount: calc.healthEmployeeAmount,
              pensionEmployeeAmount: calc.pensionEmployeeAmount,
              fspAmount: calc.fspAmount,
              withholdingTaxAmount: calc.withholdingTaxAmount,
              loansDeductionAmount: calc.loansDeductionAmount,
              advanceDeductionAmount: calc.advanceDeductionAmount,
              otherDeductionsAmount: calc.otherDeductionsAmount,
              totalDeductions: calc.totalDeductions,
              netPayAmount: calc.netPayAmount,
              isExoneratedLaw1607: calc.isExoneratedLaw1607,
              employerHealthAmount: calc.employerHealthAmount,
              employerPensionAmount: calc.employerPensionAmount,
              employerArlAmount: calc.employerArlAmount,
              employerCcfAmount: calc.employerCcfAmount,
              employerSenaAmount: calc.employerSenaAmount,
              employerIcbfAmount: calc.employerIcbfAmount,
              totalEmployerCost: calc.totalEmployerCost,
              bankId: profile?.bankId || null,
              bankAccountType: profile?.bankAccountType || 'SAVINGS',
              bankAccountNumber: profile?.bankAccountNumber || null,
              hasBankWarning,
              isManuallyEdited,
              updatedById: userId,
            },
            create: {
              tenantId,
              periodId: period.id,
              employeeId: emp.id,
              primaryDependencyId: profile?.primaryDependencyId || null,
              branchId: profile?.branchId || null,
              status: PayrollSettlementStatus.DRAFT,
              salaryModeSnapshot: calc.salaryModeSnapshot,
              baseSalaryMonthly: calc.baseSalaryMonthly,
              workedDays: calc.workedDays,
              paidLeaveDays: calc.paidLeaveDays,
              incapacityDays: calc.incapacityDays,
              vacationDays: calc.vacationDays,
              unpaidAbsenceDays: calc.unpaidAbsenceDays,
              seventhDaysLost: calc.seventhDaysLost,
              basicSalaryEarned: calc.basicSalaryEarned,
              transportAllowanceAmount: calc.transportAllowanceAmount,
              overtimeAndSurchargesAmount: calc.overtimeAndSurchargesAmount,
              leavesAndIncapacitiesAmount: calc.leavesAndIncapacitiesAmount,
              bonusesNonSalarialAmount: calc.bonusesNonSalarialAmount,
              otherEarningsAmount: calc.otherEarningsAmount,
              totalEarnings: calc.totalEarnings,
              ugppTotalRemuneration: calc.ugppTotalRemuneration,
              ugppLimit40Pct: calc.ugppLimit40Pct,
              ugppNonSalarialTotal: calc.ugppNonSalarialTotal,
              ugppExcessAmount: calc.ugppExcessAmount,
              ibcEps: calc.ibcEps,
              ibcAfp: calc.ibcAfp,
              ibcArl: calc.ibcArl,
              ibcCcf: calc.ibcCcf,
              healthEmployeeAmount: calc.healthEmployeeAmount,
              pensionEmployeeAmount: calc.pensionEmployeeAmount,
              fspAmount: calc.fspAmount,
              withholdingTaxAmount: calc.withholdingTaxAmount,
              loansDeductionAmount: calc.loansDeductionAmount,
              advanceDeductionAmount: calc.advanceDeductionAmount,
              otherDeductionsAmount: calc.otherDeductionsAmount,
              totalDeductions: calc.totalDeductions,
              netPayAmount: calc.netPayAmount,
              isExoneratedLaw1607: calc.isExoneratedLaw1607,
              employerHealthAmount: calc.employerHealthAmount,
              employerPensionAmount: calc.employerPensionAmount,
              employerArlAmount: calc.employerArlAmount,
              employerCcfAmount: calc.employerCcfAmount,
              employerSenaAmount: calc.employerSenaAmount,
              employerIcbfAmount: calc.employerIcbfAmount,
              totalEmployerCost: calc.totalEmployerCost,
              bankId: profile?.bankId || null,
              bankAccountType: profile?.bankAccountType || 'SAVINGS',
              bankAccountNumber: profile?.bankAccountNumber || null,
              hasBankWarning,
              isManuallyEdited: false,
              createdById: userId,
            },
          });

        // Recrear líneas de liquidación
        await this.prisma.payrollSettlementLine.deleteMany({
          where: { tenantId, settlementId: settlementRecord.id },
        });

        const linesToCreate = finalLines
          .filter(
            (fl) =>
              fl.conceptId && !fl.conceptId.startsWith('fallback-concept'),
          )
          .map((fl) => ({
            tenantId,
            settlementId: settlementRecord.id,
            periodId: period.id,
            employeeId: emp.id,
            conceptId: fl.conceptId,
            dependencyId: fl.dependencyId || null,
            nature: fl.nature,
            origin: fl.origin,
            quantity: fl.quantity,
            unitValue: fl.unitValue,
            totalValue: fl.totalValue,
            isConstitutiveOfSalary: fl.isConstitutiveOfSalary,
            isDeletable: fl.isDeletable,
            inIbcEpsAfp: fl.inIbcEpsAfp,
            inIbcArl: fl.inIbcArl,
            inIbcCcf: fl.inIbcCcf,
            inUgpp40Pct: fl.inUgpp40Pct,
            loanId: fl.loanId || null,
            leaveId: fl.leaveId || null,
            isManualOverride: fl.origin === PayrollLineOrigin.MANUAL_OVERRIDE,
            notes: fl.notes || null,
            createdById: userId,
          }));

        if (linesToCreate.length > 0) {
          await this.prisma.payrollSettlementLine.createMany({
            data: linesToCreate,
          });
        }

        settledCount++;
        totalNetPayCalculated += calc.netPayAmount;
      }

      return {
        success: true,
        periodId: period.id,
        settledEmployeesCount: settledCount,
        totalNetPay: Math.round(totalNetPayCalculated),
      };
    } catch (error) {
      this.logger.error(
        `Error liquidating payroll period ${periodId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 3. CONSULTA DE PRE-NÓMINA CON FILTROS Y BÚSQUEDA
  // ============================================================================
  async findSettlements(
    tenantId: string,
    periodId: string,
    query: QuerySettlementsDto,
  ) {
    try {
      const where: any = { tenantId, periodId };

      if (query.status) {
        where.status = query.status as PayrollSettlementStatus;
      }
      if (query.branchId) {
        where.branchId = query.branchId;
      }
      if (query.dependencyId) {
        where.primaryDependencyId = query.dependencyId;
      }
      if (query.search) {
        const s = query.search.trim();
        where.employee = {
          OR: [
            { fullName: { contains: s, mode: 'insensitive' } },
            { document: { contains: s, mode: 'insensitive' } },
          ],
        };
      }

      return await this.prisma.payrollPeriodSettlement.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              documentType: true,
              document: true,
              fullName: true,
              email: true,
              phone: true,
              positionRef: { select: { id: true, name: true } },
            },
          },
          primaryDependency: {
            select: { id: true, code: true, name: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          bank: {
            select: { id: true, code: true, name: true, achCode: true },
          },
          lines: {
            include: {
              concept: {
                select: { id: true, code: true, name: true, nature: true },
              },
              dependency: { select: { id: true, code: true, name: true } },
            },
            orderBy: [{ nature: 'asc' }, { concept: { code: 'asc' } }],
          },
        },
        orderBy: [{ employee: { fullName: 'asc' } }],
      });
    } catch (error) {
      this.logger.error(
        `Error querying settlements for period ${periodId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 4. DETALLE INDIVIDUAL DE LIQUIDACIÓN POR ID
  // ============================================================================
  async getSettlementById(tenantId: string, settlementId: string) {
    try {
      const settlement = await this.prisma.payrollPeriodSettlement.findFirst({
        where: { id: settlementId, tenantId },
        include: {
          period: true,
          employee: {
            select: {
              id: true,
              documentType: true,
              document: true,
              fullName: true,
              email: true,
              phone: true,
              entryDate: true,
              positionRef: { select: { id: true, name: true } },
              payrollProfile: {
                include: {
                  epsEntity: true,
                  afpEntity: true,
                  ccfEntity: true,
                },
              },
            },
          },
          primaryDependency: true,
          branch: true,
          bank: true,
          lines: {
            include: {
              concept: true,
              dependency: true,
              loan: true,
              leave: true,
            },
            orderBy: [{ nature: 'asc' }, { concept: { code: 'asc' } }],
          },
        },
      });

      if (!settlement) {
        throw new NotFoundException('Liquidación no encontrada.');
      }

      return settlement;
    } catch (error) {
      this.logger.error(
        `Error getting settlement ${settlementId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 5. EDICIÓN MANUAL DE RENGLONES EN PRE-NÓMINA (Ajuste por Analista)
  // ============================================================================
  async manualEditSettlement(
    tenantId: string,
    settlementId: string,
    dto: ManualEditSettlementDto,
    userId?: string,
  ) {
    try {
      const settlement = await this.prisma.payrollPeriodSettlement.findFirst({
        where: { id: settlementId, tenantId },
        include: { period: true },
      });

      if (!settlement) {
        throw new NotFoundException('Liquidación no encontrada.');
      }

      if (settlement.period.status === PayrollPeriodStatus.CLOSED) {
        throw new BadRequestException('No se puede editar un periodo cerrado.');
      }

      // Reemplazar renglones
      await this.prisma.payrollSettlementLine.deleteMany({
        where: { tenantId, settlementId },
      });

      let totalEarnings = 0;
      let totalDeductions = 0;
      const basicSalaryEarned = 0;
      const transportAllowanceAmount = 0;

      const createdLines: any[] = [];
      for (const line of dto.lines) {
        const total = Math.round(Number(line.totalValue) * 100) / 100;
        if (line.nature === PayrollConceptNature.DEVENGO) {
          totalEarnings += total;
        } else {
          totalDeductions += total;
        }

        createdLines.push({
          tenantId,
          settlementId,
          periodId: settlement.periodId,
          employeeId: settlement.employeeId,
          conceptId: line.conceptId,
          dependencyId: line.dependencyId || null,
          nature: line.nature,
          origin: PayrollLineOrigin.MANUAL_OVERRIDE,
          quantity: line.quantity,
          unitValue: line.unitValue,
          totalValue: total,
          isConstitutiveOfSalary: line.isConstitutiveOfSalary ?? true,
          isDeletable: line.isDeletable ?? true,
          isManualOverride: true,
          notes: line.notes || dto.notes || 'Edición manual de pre-nómina',
          createdById: userId,
        });
      }

      if (createdLines.length > 0) {
        await this.prisma.payrollSettlementLine.createMany({
          data: createdLines,
        });
      }

      const netPayAmount = Math.max(0, totalEarnings - totalDeductions);

      return await this.prisma.payrollPeriodSettlement.update({
        where: { id: settlementId },
        data: {
          totalEarnings,
          totalDeductions,
          netPayAmount,
          isManuallyEdited: true,
          notes: dto.notes || settlement.notes,
          updatedById: userId,
        },
        include: {
          lines: {
            include: { concept: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error manually editing settlement ${settlementId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 6. CIERRE DEFINITIVO DE PERIODO (Congelación, Préstamos y Anticipos)
  // ============================================================================
  async closePeriod(tenantId: string, periodId: string, userId?: string) {
    try {
      const period = await this.prisma.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });

      if (!period) {
        throw new NotFoundException('Periodo no encontrado.');
      }

      if (period.status === PayrollPeriodStatus.CLOSED) {
        throw new BadRequestException('El periodo ya se encuentra cerrado.');
      }

      // 1. Obtener todas las líneas de deducción de préstamos del periodo
      const loanLines = await this.prisma.payrollSettlementLine.findMany({
        where: {
          tenantId,
          periodId,
          loanId: { not: null },
        },
        include: { loan: true },
      });

      // Crear las cuotas y amortizar saldos
      for (const line of loanLines) {
        if (!line.loanId || !line.loan) continue;

        const loan = line.loan;
        const currentBalance = Number(loan.remainingBalance);
        const amountDeducted = Number(line.totalValue);
        const newBalance = Math.max(0, currentBalance - amountDeducted);

        const lastInstallment =
          await this.prisma.payrollLoanInstallment.findFirst({
            where: { tenantId, loanId: loan.id },
            orderBy: { installmentNumber: 'desc' },
          });

        const nextNumber = (lastInstallment?.installmentNumber || 0) + 1;

        await this.prisma.payrollLoanInstallment.create({
          data: {
            tenantId,
            loanId: loan.id,
            periodId,
            installmentNumber: nextNumber,
            amount: amountDeducted,
            balanceAfter: newBalance,
            paymentDate: new Date(),
            notes: `Descontado en cierre periodo ${period.label}`,
            createdById: userId,
          },
        });

        await this.prisma.payrollLoan.update({
          where: { id: loan.id },
          data: {
            remainingBalance: newBalance,
            status:
              newBalance <= 0
                ? PayrollLoanStatus.PAID_OFF
                : PayrollLoanStatus.ACTIVE,
            updatedById: userId,
          },
        });
      }

      // 2. Marcar anticipos quincenales como descontados
      await this.prisma.payrollAdvanceItem.updateMany({
        where: {
          tenantId,
          advanceSettlement: {
            year: period.year,
            month: period.month,
          },
        },
        data: {
          isDeductedInPayroll: true,
          updatedById: userId,
        },
      });

      // 3. Marcar todas las liquidaciones del periodo como APROBADAS
      await this.prisma.payrollPeriodSettlement.updateMany({
        where: { tenantId, periodId },
        data: {
          status: PayrollSettlementStatus.APPROVED,
          updatedById: userId,
        },
      });

      // 4. Marcar periodo como CLOSED
      const updatedPeriod = await this.prisma.payrollPeriod.update({
        where: { id: periodId },
        data: {
          status: PayrollPeriodStatus.CLOSED,
          updatedById: userId,
        },
      });

      return {
        success: true,
        message:
          'Periodo cerrado exitosamente. Préstamos y anticipos amortizados.',
        period: updatedPeriod,
      };
    } catch (error) {
      this.logger.error(`Error closing period ${periodId}`, error.stack);
      throw error;
    }
  }

  // ============================================================================
  // 7. REAPERTURA DE PERIODO (Reversión Controlada)
  // ============================================================================
  async reopenPeriod(tenantId: string, periodId: string, userId?: string) {
    try {
      const period = await this.prisma.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });

      if (!period) {
        throw new NotFoundException('Periodo no encontrado.');
      }

      if (period.status !== PayrollPeriodStatus.CLOSED) {
        throw new BadRequestException(
          'Solo periodos cerrados pueden ser reabiertos.',
        );
      }

      // 1. Revertir cuotas de préstamos generadas para este periodo
      const installments = await this.prisma.payrollLoanInstallment.findMany({
        where: { tenantId, periodId },
      });

      for (const inst of installments) {
        const loan = await this.prisma.payrollLoan.findUnique({
          where: { id: inst.loanId },
        });
        if (loan) {
          const restoredBalance =
            Number(loan.remainingBalance) + Number(inst.amount);
          await this.prisma.payrollLoan.update({
            where: { id: loan.id },
            data: {
              remainingBalance: restoredBalance,
              status: PayrollLoanStatus.ACTIVE,
              updatedById: userId,
            },
          });
        }
      }

      await this.prisma.payrollLoanInstallment.deleteMany({
        where: { tenantId, periodId },
      });

      // 2. Desmarcar flag de anticipos
      await this.prisma.payrollAdvanceItem.updateMany({
        where: {
          tenantId,
          advanceSettlement: {
            year: period.year,
            month: period.month,
          },
        },
        data: {
          isDeductedInPayroll: false,
          updatedById: userId,
        },
      });

      // 3. Devolver settlements a DRAFT
      await this.prisma.payrollPeriodSettlement.updateMany({
        where: { tenantId, periodId },
        data: {
          status: PayrollSettlementStatus.DRAFT,
          updatedById: userId,
        },
      });

      // 4. Cambiar estado del periodo a OPEN
      const updatedPeriod = await this.prisma.payrollPeriod.update({
        where: { id: periodId },
        data: {
          status: PayrollPeriodStatus.OPEN,
          updatedById: userId,
        },
      });

      return {
        success: true,
        message: 'Periodo reabierto correctamente en modo borrador.',
        period: updatedPeriod,
      };
    } catch (error) {
      this.logger.error(`Error reopening period ${periodId}`, error.stack);
      throw error;
    }
  }

  // ============================================================================
  // 8. EXPORTACIÓN EXCEL AUDITORÍA MULTIPESTAÑA (.xlsx con ExcelJS)
  // ============================================================================
  async exportExcelWorkbook(
    tenantId: string,
    periodId: string,
  ): Promise<Buffer> {
    try {
      const period = await this.prisma.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Periodo no encontrado.');

      const settlements = await this.prisma.payrollPeriodSettlement.findMany({
        where: { tenantId, periodId },
        include: {
          employee: true,
          primaryDependency: true,
          branch: true,
          bank: true,
          lines: {
            include: { concept: true, dependency: true },
          },
        },
        orderBy: [{ employee: { fullName: 'asc' } }],
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'NOXIA ERP';
      workbook.created = new Date();

      // Pestaña 1: Resumen General
      const ws1 = workbook.addWorksheet('Resumen de Nómina');
      ws1.columns = [
        { header: 'Métrica', key: 'metric', width: 35 },
        { header: 'Valor', key: 'value', width: 25 },
      ];
      ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws1.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' },
      };

      let totalEarn = 0;
      let totalDed = 0;
      let totalNet = 0;
      let totalEmpCost = 0;

      for (const s of settlements) {
        totalEarn += Number(s.totalEarnings);
        totalDed += Number(s.totalDeductions);
        totalNet += Number(s.netPayAmount);
        totalEmpCost += Number(s.totalEmployerCost);
      }

      ws1.addRow({ metric: 'Periodo', value: period.label });
      ws1.addRow({
        metric: 'Total Empleados Liquidados',
        value: settlements.length,
      });
      ws1.addRow({ metric: 'Total Devengado (COP)', value: totalEarn });
      ws1.addRow({ metric: 'Total Deducido (COP)', value: totalDed });
      ws1.addRow({ metric: 'Neto Total a Dispersar (COP)', value: totalNet });
      ws1.addRow({
        metric: 'Costo Patronal Seguridad y Parafiscales',
        value: totalEmpCost,
      });

      // Pestaña 2: Detalle por Empleado
      const ws2 = workbook.addWorksheet('Detalle de Empleados');
      ws2.columns = [
        { header: 'Documento', key: 'doc', width: 15 },
        { header: 'Nombre Completo', key: 'name', width: 35 },
        { header: 'Puesto Principal', key: 'dep', width: 25 },
        { header: 'Días Lab.', key: 'days', width: 12 },
        { header: 'Básico Devengado', key: 'basic', width: 18 },
        { header: 'Aux. Transporte', key: 'trans', width: 16 },
        { header: 'Extras y Recargos', key: 'extra', width: 18 },
        { header: 'Incapacidades', key: 'leaves', width: 16 },
        { header: 'Otros Devengos', key: 'otherEarn', width: 16 },
        { header: 'Total Devengado', key: 'totalEarn', width: 18 },
        { header: 'Salud 4%', key: 'health', width: 15 },
        { header: 'Pensión 4%', key: 'pension', width: 15 },
        { header: 'FSP', key: 'fsp', width: 12 },
        { header: 'Préstamos', key: 'loans', width: 15 },
        { header: 'Anticipo Quincena', key: 'adv', width: 18 },
        { header: 'Total Deducciones', key: 'totalDed', width: 18 },
        { header: 'Neto a Pagar', key: 'net', width: 18 },
        { header: 'Banco', key: 'bank', width: 20 },
        { header: 'Número Cuenta', key: 'acc', width: 20 },
      ];
      ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws2.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E1B4B' },
      };

      for (const s of settlements) {
        ws2.addRow({
          doc: s.employee.document,
          name: s.employee.fullName,
          dep: s.primaryDependency?.name || 'SIN ASIGNAR',
          days: s.workedDays,
          basic: Number(s.basicSalaryEarned),
          trans: Number(s.transportAllowanceAmount),
          extra: Number(s.overtimeAndSurchargesAmount),
          leaves: Number(s.leavesAndIncapacitiesAmount),
          otherEarn:
            Number(s.bonusesNonSalarialAmount) + Number(s.otherEarningsAmount),
          totalEarn: Number(s.totalEarnings),
          health: Number(s.healthEmployeeAmount),
          pension: Number(s.pensionEmployeeAmount),
          fsp: Number(s.fspAmount),
          loans: Number(s.loansDeductionAmount),
          adv: Number(s.advanceDeductionAmount),
          totalDed: Number(s.totalDeductions),
          net: Number(s.netPayAmount),
          bank: s.bank?.name || 'POR VENTANILLA / EFECTIVO',
          acc: s.bankAccountNumber || 'N/A',
        });
      }

      // Pestaña 3: Renglones y Cuentas PUC
      const ws3 = workbook.addWorksheet('Imputación Contable PUC');
      ws3.columns = [
        { header: 'Documento', key: 'doc', width: 15 },
        { header: 'Empleado', key: 'name', width: 30 },
        { header: 'Cód. Concepto', key: 'cCode', width: 14 },
        { header: 'Concepto', key: 'cName', width: 30 },
        { header: 'Naturaleza', key: 'nat', width: 15 },
        { header: 'Cantidad', key: 'qty', width: 12 },
        { header: 'Valor Total', key: 'val', width: 16 },
        { header: 'Puesto Imputado', key: 'dep', width: 25 },
        { header: 'Cuenta Admin PUC', key: 'pucAdm', width: 18 },
        { header: 'Cuenta Oper PUC', key: 'pucOp', width: 18 },
      ];
      ws3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws3.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };

      for (const s of settlements) {
        for (const l of s.lines) {
          ws3.addRow({
            doc: s.employee.document,
            name: s.employee.fullName,
            cCode: l.concept.code,
            cName: l.concept.name,
            nat: l.nature,
            qty: Number(l.quantity),
            val: Number(l.totalValue),
            dep: l.dependency?.name || 'CENTRAL / ADMON',
            pucAdm: l.concept.adminPucAccount || '',
            pucOp: l.concept.operativePucAccount || '',
          });
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      this.logger.error(
        `Error exporting excel for period ${periodId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 9. GENERACIÓN DE ANTICIPOS QUINCENALES (Día 15 — Numeral 3.6 Pronos)
  // ============================================================================
  async generateAdvanceSettlement(
    tenantId: string,
    dto: GenerateAdvanceDto,
    userId?: string,
  ) {
    try {
      const defaultPct = dto.defaultAdvancePct || 0.4;
      const cutoffDate = dto.cutoffDate
        ? new Date(dto.cutoffDate)
        : new Date(Date.UTC(dto.year, dto.month - 1, 15));

      // Buscar o crear cabecera
      let advance = await this.prisma.payrollAdvanceSettlement.findUnique({
        where: {
          tenantId_year_month: {
            tenantId,
            year: dto.year,
            month: dto.month,
          },
        },
      });

      if (!advance) {
        advance = await this.prisma.payrollAdvanceSettlement.create({
          data: {
            tenantId,
            year: dto.year,
            month: dto.month,
            cutoffDate,
            status: PayrollSettlementStatus.DRAFT,
            createdById: userId,
          },
        });
      } else if (advance.status === PayrollSettlementStatus.APPROVED) {
        throw new BadRequestException(
          'El anticipo para este mes ya está aprobado.',
        );
      }

      // Empleados activos
      const employees = await this.prisma.employee.findMany({
        where: { tenantId, isActive: true, isRetired: false },
        include: {
          payrollProfile: {
            include: {
              primaryDependency: true,
              bank: true,
            },
          },
        },
      });

      let totalEmployees = 0;
      let totalAmount = 0;

      for (const emp of employees) {
        const profile = emp.payrollProfile;
        const baseSalary = profile?.customBaseSalary
          ? Number(profile.customBaseSalary)
          : Number(profile?.primaryDependency?.monthlyPaidValue || 1750905);

        let absenceDays = 0;
        if (dto.deductAbsences) {
          const firstFortnightLeaves =
            await this.prisma.payrollLeaveAndAbsence.findMany({
              where: {
                tenantId,
                employeeId: emp.id,
                startDate: { lte: cutoffDate },
                endDate: {
                  gte: new Date(Date.UTC(dto.year, dto.month - 1, 1)),
                },
                leaveType: {
                  in: [
                    LeaveAndAbsenceType.UNPAID_LEAVE_LNR,
                    LeaveAndAbsenceType.DISCIPLINARY_SUSPENSION_SAN,
                    LeaveAndAbsenceType.UNJUSTIFIED_ABSENCE_AUS,
                  ],
                },
              },
            });
          for (const lv of firstFortnightLeaves) {
            absenceDays += lv.totalDays;
          }
        }

        const workedDays = Math.max(0, 15 - absenceDays);

        let calculatedAmount = 0;
        if (
          profile?.customAdvanceValue &&
          Number(profile.customAdvanceValue) > 0
        ) {
          calculatedAmount = Number(profile.customAdvanceValue);
        } else {
          // Básico diario * 15 * defaultPct
          const dailyRate = baseSalary / 30;
          calculatedAmount = dailyRate * workedDays * defaultPct * 2; // e.g. 40% del salario completo
        }

        calculatedAmount = Math.round(calculatedAmount);

        // Check if item exists and was manually edited
        const existingItem = await this.prisma.payrollAdvanceItem.findUnique({
          where: {
            advanceSettlementId_employeeId: {
              advanceSettlementId: advance.id,
              employeeId: emp.id,
            },
          },
        });

        const approvedAmount = existingItem?.isManuallyEdited
          ? Number(existingItem.approvedAmount)
          : calculatedAmount;

        const hasBankWarning = !profile?.bankId || !profile?.bankAccountNumber;

        await this.prisma.payrollAdvanceItem.upsert({
          where: {
            advanceSettlementId_employeeId: {
              advanceSettlementId: advance.id,
              employeeId: emp.id,
            },
          },
          update: {
            dependencyId: profile?.primaryDependencyId || null,
            baseSalary,
            advancePctApplied: defaultPct,
            workedDaysFirstFortnight: workedDays,
            absenceDaysDeducted: absenceDays,
            calculatedAmount,
            approvedAmount,
            bankId: profile?.bankId || null,
            bankAccountType: profile?.bankAccountType || 'SAVINGS',
            bankAccountNumber: profile?.bankAccountNumber || null,
            hasBankWarning,
            updatedById: userId,
          },
          create: {
            tenantId,
            advanceSettlementId: advance.id,
            employeeId: emp.id,
            dependencyId: profile?.primaryDependencyId || null,
            baseSalary,
            advancePctApplied: defaultPct,
            workedDaysFirstFortnight: workedDays,
            absenceDaysDeducted: absenceDays,
            calculatedAmount,
            approvedAmount,
            bankId: profile?.bankId || null,
            bankAccountType: profile?.bankAccountType || 'SAVINGS',
            bankAccountNumber: profile?.bankAccountNumber || null,
            hasBankWarning,
            createdById: userId,
          },
        });

        totalEmployees++;
        totalAmount += approvedAmount;
      }

      const updatedAdvance = await this.prisma.payrollAdvanceSettlement.update({
        where: { id: advance.id },
        data: {
          totalEmployees,
          totalAmount,
          updatedById: userId,
        },
        include: {
          items: {
            include: {
              employee: true,
              bank: true,
              dependency: true,
            },
          },
        },
      });

      return updatedAdvance;
    } catch (error) {
      this.logger.error(
        `Error generating advance settlement for ${dto.year}-${dto.month}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 10. CONSULTA DE ANTICIPO POR AÑO Y MES
  // ============================================================================
  async findAdvanceSettlement(tenantId: string, year: number, month: number) {
    try {
      return await this.prisma.payrollAdvanceSettlement.findUnique({
        where: {
          tenantId_year_month: {
            tenantId,
            year,
            month,
          },
        },
        include: {
          items: {
            include: {
              employee: {
                select: {
                  id: true,
                  document: true,
                  fullName: true,
                  positionRef: { select: { name: true } },
                },
              },
              bank: true,
              dependency: { select: { id: true, code: true, name: true } },
            },
            orderBy: [{ employee: { fullName: 'asc' } }],
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error finding advance settlement ${year}-${month}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // 11. EDICIÓN MANUAL DE MONTO APROBADO EN ANTICIPO
  // ============================================================================
  async updateAdvanceItem(
    tenantId: string,
    itemId: string,
    dto: UpdateAdvanceItemDto,
    userId?: string,
  ) {
    try {
      const item = await this.prisma.payrollAdvanceItem.findFirst({
        where: { id: itemId, tenantId },
        include: { advanceSettlement: true },
      });

      if (!item) {
        throw new NotFoundException('Item de anticipo no encontrado.');
      }

      if (item.advanceSettlement.status === PayrollSettlementStatus.APPROVED) {
        throw new BadRequestException(
          'No se puede modificar un anticipo aprobado.',
        );
      }

      const updatedItem = await this.prisma.payrollAdvanceItem.update({
        where: { id: itemId },
        data: {
          approvedAmount: dto.approvedAmount,
          notes: dto.notes,
          isManuallyEdited: true,
          updatedById: userId,
        },
      });

      // Recalcular total en cabecera
      const allItems = await this.prisma.payrollAdvanceItem.findMany({
        where: { advanceSettlementId: item.advanceSettlementId },
        select: { approvedAmount: true },
      });

      const newTotal = allItems.reduce(
        (acc, it) => acc + Number(it.approvedAmount),
        0,
      );

      await this.prisma.payrollAdvanceSettlement.update({
        where: { id: item.advanceSettlementId },
        data: { totalAmount: newTotal, updatedById: userId },
      });

      return updatedItem;
    } catch (error) {
      this.logger.error(`Error updating advance item ${itemId}`, error.stack);
      throw error;
    }
  }

  // ============================================================================
  // 12. APROBACIÓN DE LOTE DE ANTICIPOS (Listo para Dispersión ACH)
  // ============================================================================
  async approveAdvanceSettlement(
    tenantId: string,
    advanceId: string,
    userId?: string,
  ) {
    try {
      const advance = await this.prisma.payrollAdvanceSettlement.findFirst({
        where: { id: advanceId, tenantId },
      });

      if (!advance) {
        throw new NotFoundException('Anticipo no encontrado.');
      }

      return await this.prisma.payrollAdvanceSettlement.update({
        where: { id: advanceId },
        data: {
          status: PayrollSettlementStatus.APPROVED,
          paymentDate: new Date(),
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(`Error approving advance ${advanceId}`, error.stack);
      throw error;
    }
  }

  // ============================================================================
  // 13. GENERACIÓN DE ARCHIVOS PLANOS BANCARIOS ACH (Numeral 7.1 Pronos)
  // ============================================================================
  async generateAchFile(
    tenantId: string,
    dto: GenerateAchFileDto,
    userId?: string,
  ) {
    try {
      const companyProfile = await this.prisma.tenantProfile.findFirst({
        where: { tenantId },
      });

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      const companyData = {
        nit: companyProfile?.taxId || '901234567',
        legalName:
          companyProfile?.legalName || tenant?.name || 'EMPRESA DE SEGURIDAD',
        mainAccount: '00123456789',
      };

      const beneficiaryItems: AchBeneficiaryItem[] = [];
      let year = new Date().getFullYear();
      let month = new Date().getMonth() + 1;

      if (dto.disbursementType === PayrollDisbursementType.PAYROLL_PERIOD) {
        if (!dto.periodId) {
          throw new BadRequestException(
            'periodId es requerido para dispersión de nómina.',
          );
        }

        const period = await this.prisma.payrollPeriod.findFirst({
          where: { id: dto.periodId, tenantId },
        });
        if (!period) throw new NotFoundException('Periodo no encontrado.');
        year = period.year;
        month = period.month;

        const settlementWhere: any = {
          tenantId,
          periodId: dto.periodId,
        };
        if (dto.bankId) {
          settlementWhere.bankId = dto.bankId;
        }

        const settlements = await this.prisma.payrollPeriodSettlement.findMany({
          where: settlementWhere,
          include: {
            employee: true,
            bank: true,
          },
        });

        for (const s of settlements) {
          beneficiaryItems.push({
            employeeId: s.employeeId,
            documentType: s.employee.documentType,
            document: s.employee.document,
            fullName: s.employee.fullName,
            bankCode: s.bank?.code || null,
            bankName: s.bank?.name || null,
            achCode: s.bank?.achCode || null,
            accountType: s.bankAccountType,
            accountNumber: s.bankAccountNumber,
            netAmount: Number(s.netPayAmount),
          });
        }
      } else {
        // Dispersión de Anticipos
        if (!dto.advanceSettlementId) {
          throw new BadRequestException(
            'advanceSettlementId es requerido para dispersión de anticipos.',
          );
        }

        const advance = await this.prisma.payrollAdvanceSettlement.findFirst({
          where: { id: dto.advanceSettlementId, tenantId },
        });
        if (!advance) throw new NotFoundException('Anticipo no encontrado.');
        year = advance.year;
        month = advance.month;

        const itemWhere: any = {
          advanceSettlementId: dto.advanceSettlementId,
          tenantId,
        };
        if (dto.bankId) {
          itemWhere.bankId = dto.bankId;
        }

        const items = await this.prisma.payrollAdvanceItem.findMany({
          where: itemWhere,
          include: {
            employee: true,
            bank: true,
          },
        });

        for (const it of items) {
          beneficiaryItems.push({
            employeeId: it.employeeId,
            documentType: it.employee.documentType,
            document: it.employee.document,
            fullName: it.employee.fullName,
            bankCode: it.bank?.code || null,
            bankName: it.bank?.name || null,
            achCode: it.bank?.achCode || null,
            accountType: it.bankAccountType,
            accountNumber: it.bankAccountNumber,
            netAmount: Number(it.approvedAmount),
          });
        }
      }

      const input: AchBatchGeneratorInput = {
        company: companyData,
        disbursementType: dto.disbursementType,
        year,
        month,
        exportFormat: dto.exportFormat || 'STANDARD_ACH',
        items: beneficiaryItems,
      };

      const result = this.achGeneratorEngine.generate(input);

      // Guardar registro de lote generado
      const batch = await this.prisma.payrollBankDisbursementBatch.create({
        data: {
          tenantId,
          disbursementType: dto.disbursementType,
          periodId: dto.periodId || null,
          advanceSettlementId: dto.advanceSettlementId || null,
          bankId: dto.bankId || null,
          exportFormat: dto.exportFormat || 'STANDARD_ACH',
          fileName: result.fileName,
          totalRecords: result.totalRecords,
          totalAmount: result.totalAmount,
          skippedMissingAccountCount: result.skippedMissingAccountCount,
          notes: `Generado por usuario ${userId || 'SISTEMA'}`,
          createdById: userId,
        },
      });

      return {
        batch,
        fileContent: result.fileContent,
        fileName: result.fileName,
        mimeType: result.mimeType,
        totalRecords: result.totalRecords,
        totalAmount: result.totalAmount,
        warnings: result.warnings,
      };
    } catch (error) {
      this.logger.error(`Error generating ACH file`, error.stack);
      throw error;
    }
  }

  // ============================================================================
  // 14. GENERACIÓN DE DESPRENDIBLES PDF (Individual o Consolidado Masivo)
  // ============================================================================
  async getPayslipsPdf(
    tenantId: string,
    periodId: string,
    employeeId?: string,
    groupOvertime?: boolean,
  ): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const period = await this.prisma.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Periodo no encontrado.');

      const companyProfile = await this.prisma.tenantProfile.findFirst({
        where: { tenantId },
      });
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      const where: any = { tenantId, periodId };
      if (employeeId) {
        where.employeeId = employeeId;
      }

      const settlements: any[] =
        await this.prisma.payrollPeriodSettlement.findMany({
          where,
          include: {
            employee: {
              include: {
                positionRef: true,
                payrollProfile: {
                  include: {
                    epsEntity: true,
                    afpEntity: true,
                  },
                },
              },
            },
            primaryDependency: true,
            branch: true,
            bank: true,
            lines: {
              include: { concept: true },
              orderBy: [{ nature: 'asc' }, { concept: { code: 'asc' } }],
            },
          },
          orderBy: [{ employee: { fullName: 'asc' } }],
        });

      if (settlements.length === 0) {
        throw new NotFoundException(
          'No se encontraron liquidaciones para exportar.',
        );
      }

      const renderItems: PayslipRenderItem[] = settlements.map((s) => ({
        settlementId: s.id,
        periodLabel: period.label,
        startDate: period.startDate.toISOString().split('T')[0],
        endDate: period.endDate.toISOString().split('T')[0],
        paymentDate: period.paymentDate
          ? period.paymentDate.toISOString().split('T')[0]
          : null,
        company: {
          legalName:
            companyProfile?.legalName ||
            tenant?.name ||
            'NOXIA SEGURIDAD PRIVADA LTDA',
          nit: companyProfile?.taxId || '901.234.567-8',
          city: companyProfile?.city || 'Bogotá D.C.',
          signatureName:
            companyProfile?.legalRepresentative || 'Gerencia General / Pagador',
          signatureRole: 'Representante Legal / Pagaduría',
        },
        employee: {
          documentType: s.employee.documentType,
          document: s.employee.document,
          fullName: s.employee.fullName,
          positionName: s.employee.positionRef?.name || 'Guarda de Seguridad',
          branchName: s.branch?.name || undefined,
          dependencyName: s.primaryDependency?.name || undefined,
          baseSalaryMonthly: Number(s.baseSalaryMonthly),
          bankName: s.bank?.name || 'PAGO EN EFECTIVO',
          accountNumber: s.bankAccountNumber || undefined,
          epsName: s.employee.payrollProfile?.epsEntity?.name || undefined,
          afpName: s.employee.payrollProfile?.afpEntity?.name || undefined,
        },
        workedDays: s.workedDays,
        totalEarnings: Number(s.totalEarnings),
        totalDeductions: Number(s.totalDeductions),
        netPayAmount: Number(s.netPayAmount),
        lines: s.lines.map((l) => ({
          conceptCode: l.concept.code,
          conceptName: l.concept.name,
          nature: l.nature,
          quantity: Number(l.quantity),
          totalValue: Number(l.totalValue),
        })),
        groupOvertime: groupOvertime ?? false,
      }));

      const buffer =
        await this.payslipPdfService.generatePayslipsPdf(renderItems);
      const filename =
        employeeId && settlements.length === 1
          ? `desprendible_${settlements[0].employee.document}_${period.year}_${period.month}.pdf`
          : `desprendibles_consolidados_${period.year}_${period.month}.pdf`;

      return { buffer, filename };
    } catch (error) {
      this.logger.error(`Error generating payslips PDF`, error.stack);
      throw error;
    }
  }

  // ============================================================================
  // 15. DESPACHO DE DESPRENDIBLES POR CORREO ELECTRÓNICO (MailService)
  // ============================================================================
  async sendPayslipsEmail(
    tenantId: string,
    periodId: string,
    dto: SendPayslipsEmailDto,
  ) {
    try {
      const period = await this.prisma.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
      });
      if (!period) throw new NotFoundException('Periodo no encontrado.');

      const where: any = { tenantId, periodId };
      if (dto.employeeIds && dto.employeeIds.length > 0) {
        where.employeeId = { in: dto.employeeIds };
      }

      const settlements = await this.prisma.payrollPeriodSettlement.findMany({
        where,
        include: {
          employee: true,
        },
      });

      let sentCount = 0;
      let failedCount = 0;

      for (const s of settlements) {
        const emp = s.employee;
        if (!emp.email || !emp.email.includes('@')) {
          await this.prisma.payrollPeriodSettlement.update({
            where: { id: s.id },
            data: { payslipEmailStatus: PayslipDeliveryStatus.FAILED },
          });
          failedCount++;
          continue;
        }

        try {
          const { buffer, filename } = await this.getPayslipsPdf(
            tenantId,
            periodId,
            emp.id,
            dto.groupOvertime,
          );

          const subject = `Comprobante de Pago de Nómina — ${period.label}`;
          const html = `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px;">
              <h2 style="color: #7c3aed;">Comprobante de Nómina</h2>
              <p>Estimado(a) <strong>${emp.fullName}</strong>,</p>
              <p>Adjunto a este correo encontrará su desprendible oficial de pago correspondiente al periodo: <strong>${period.label}</strong>.</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 12px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Neto Pagado:</strong> $${Number(s.netPayAmount).toLocaleString('es-CO')} COP</p>
                <p style="margin: 4px 0 0 0;"><strong>Días Liquidados:</strong> ${s.workedDays}</p>
              </div>
              <p style="font-size: 12px; color: #64748b;">Este correo y su archivo adjunto son confidenciales y para uso exclusivo del destinatario.</p>
            </div>
          `;

          await this.mailService.sendMail({
            to: emp.email,
            subject,
            html,
            attachments: [
              {
                filename,
                content: buffer,
                contentType: 'application/pdf',
              },
            ],
          });

          await this.prisma.payrollPeriodSettlement.update({
            where: { id: s.id },
            data: {
              payslipEmailStatus: PayslipDeliveryStatus.SENT,
              payslipSentAt: new Date(),
            },
          });
          sentCount++;
        } catch (err) {
          this.logger.error(
            `Error sending payslip email to ${emp.email}: ${err.message}`,
          );
          await this.prisma.payrollPeriodSettlement.update({
            where: { id: s.id },
            data: { payslipEmailStatus: PayslipDeliveryStatus.FAILED },
          });
          failedCount++;
        }
      }

      return {
        totalTargeted: settlements.length,
        sentCount,
        failedCount,
      };
    } catch (error) {
      this.logger.error(`Error in sendPayslipsEmail`, error.stack);
      throw error;
    }
  }
}
