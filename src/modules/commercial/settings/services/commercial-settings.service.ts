import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserContext } from '../../../../common/interfaces/user-context.interface';
import {
  TariffCalculationEngine,
  TariffCalculationBreakdown,
} from './tariff-calculation.service';
import {
  GuardSalaryCalculationEngine,
  GuardPayrollSimulationResult,
} from './guard-salary-calculation.service';
import {
  CreateTariffPeriodDto,
  UpdateTariffPeriodDto,
  SimulateTariffDto,
  SimulateSalaryDto,
  CreateServiceCatalogDto,
  UpdateServiceCatalogDto,
  UpsertSalaryMatrixDto,
  CreateValueAddedDto,
  UpdateValueAddedDto,
  UpdateDocumentSkinDto,
  UpdateDistributionMatrixDto,
  CreateTextSnippetDto,
  UpdateTextSnippetDto,
  UpdateCommercialSettingsDto,
} from '../dtos';
import {
  ShiftScheduleType,
  InternalDepartment,
  PositionSalaryMatrix,
  ServiceOrderDistributionRecipient,
  TariffPeriodConfig,
  Prisma,
} from '@prisma/client';
import { CommercialSettingsRepository } from '../../repositories/commercial-settings.repository';

@Injectable()
export class CommercialSettingsService {
  private readonly logger = new Logger(CommercialSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commercialRepo: CommercialSettingsRepository,
  ) {}

  /**
   * Obtiene o auto-inicializa la configuración comercial del tenant con todas sus relaciones
   */
  async getSettings(user: UserContext) {
    try {
      let settings = await this.commercialRepo.findByTenantId(user.tenantId);

      if (!settings) {
        settings = await this.initDefaultSettings(user.tenantId, user.sub);
      }

      if (!settings) {
        throw new NotFoundException(
          `No se pudo inicializar la configuración comercial para el tenant ${user.tenantId}`,
        );
      }

      return settings;
    } catch (error) {
      this.logger.error(
        `Error al obtener commercial settings para tenant ${user.tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza parámetros globales (AIU, IVA, ReteFuente, topes de reinversión)
   */
  async updateSettings(dto: UpdateCommercialSettingsDto, user: UserContext) {
    try {
      const current = await this.getSettings(user);

      const updated = await this.commercialRepo.updateSettings(current.id, {
        ...dto,
        qualityDocRevisionDate: dto.qualityDocRevisionDate
          ? new Date(dto.qualityDocRevisionDate)
          : undefined,
        updatedById: user.sub,
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Error al actualizar commercial settings para tenant ${user.tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Tramos Tarifarios (TariffPeriodConfig)
  // ==========================================

  async createTariffPeriod(dto: CreateTariffPeriodDto, user: UserContext) {
    try {
      const settings = await this.getSettings(user);

      // Si no se proporcionaron proporciones horarias, calcularlas con el motor
      const dayHours = dto.statutoryDayHours ?? 15;
      const nightHours = dto.statutoryNightHours ?? 9;
      const proportions = TariffCalculationEngine.calculateStatutoryProportions(
        dayHours,
        nightHours,
      );

      const weeklyHours = dto.statutoryWeeklyHours ?? 44;
      const monthlyHours = weeklyHours * 5;
      const calculatedBaseHour = Math.round(dto.smmlv / monthlyHours);

      const created = await this.prisma.tariffPeriodConfig.create({
        data: {
          tenantId: user.tenantId,
          commercialSettingsId: settings.id,
          year: dto.year,
          label: dto.label,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          smmlv: new Prisma.Decimal(dto.smmlv),
          monthlyTransportAux: new Prisma.Decimal(dto.monthlyTransportAux),
          dailyTransportAux: new Prisma.Decimal(dto.dailyTransportAux),
          statutoryWeeklyHours: weeklyHours,
          baseHourlyRate: new Prisma.Decimal(
            dto.baseHourlyRate ?? calculatedBaseHour,
          ),
          statutoryDayHours: dayHours,
          statutoryNightHours: nightHours,
          dayProportionFactor: new Prisma.Decimal(
            dto.dayProportionFactor ?? proportions.dayProportionFactor,
          ),
          nightProportionFactor: new Prisma.Decimal(
            dto.nightProportionFactor ?? proportions.nightProportionFactor,
          ),
          commercialMultiplier: new Prisma.Decimal(
            dto.commercialMultiplier ?? 8.8,
          ),
          strata46Multiplier: new Prisma.Decimal(
            dto.strata46Multiplier ?? 9.77,
          ),
          strata13Multiplier: new Prisma.Decimal(
            dto.strata13Multiplier ?? 7.66376105,
          ),
          createdById: user.sub,
        },
      });

      return created;
    } catch (error) {
      this.logger.error(
        `Error al crear tramo tarifario: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe una vigencia tarifaria con esa etiqueta para el año especificado`,
        );
      }
      throw error;
    }
  }

  async updateTariffPeriod(
    id: string,
    dto: UpdateTariffPeriodDto,
    user: UserContext,
  ) {
    try {
      const existing = await this.prisma.tariffPeriodConfig.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Tramo tarifario con id ${id} no encontrado`,
        );
      }

      const updateData: Prisma.TariffPeriodConfigUpdateInput = {
        updatedById: user.sub,
      };

      if (dto.year !== undefined) updateData.year = dto.year;
      if (dto.label !== undefined) updateData.label = dto.label;
      if (dto.startDate !== undefined)
        updateData.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
      if (dto.smmlv !== undefined)
        updateData.smmlv = new Prisma.Decimal(dto.smmlv);
      if (dto.monthlyTransportAux !== undefined)
        updateData.monthlyTransportAux = new Prisma.Decimal(
          dto.monthlyTransportAux,
        );
      if (dto.dailyTransportAux !== undefined)
        updateData.dailyTransportAux = new Prisma.Decimal(
          dto.dailyTransportAux,
        );
      if (dto.statutoryWeeklyHours !== undefined)
        updateData.statutoryWeeklyHours = dto.statutoryWeeklyHours;
      if (dto.baseHourlyRate !== undefined)
        updateData.baseHourlyRate = new Prisma.Decimal(dto.baseHourlyRate);
      if (dto.statutoryDayHours !== undefined)
        updateData.statutoryDayHours = dto.statutoryDayHours;
      if (dto.statutoryNightHours !== undefined)
        updateData.statutoryNightHours = dto.statutoryNightHours;
      if (dto.dayProportionFactor !== undefined)
        updateData.dayProportionFactor = new Prisma.Decimal(
          dto.dayProportionFactor,
        );
      if (dto.nightProportionFactor !== undefined)
        updateData.nightProportionFactor = new Prisma.Decimal(
          dto.nightProportionFactor,
        );
      if (dto.commercialMultiplier !== undefined)
        updateData.commercialMultiplier = new Prisma.Decimal(
          dto.commercialMultiplier,
        );
      if (dto.strata46Multiplier !== undefined)
        updateData.strata46Multiplier = new Prisma.Decimal(
          dto.strata46Multiplier,
        );
      if (dto.strata13Multiplier !== undefined)
        updateData.strata13Multiplier = new Prisma.Decimal(
          dto.strata13Multiplier,
        );

      const updated = await this.prisma.tariffPeriodConfig.update({
        where: { id },
        data: updateData,
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Error al actualizar tramo tarifario ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteTariffPeriod(id: string, user: UserContext) {
    try {
      const existing = await this.prisma.tariffPeriodConfig.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Tramo tarifario con id ${id} no encontrado`,
        );
      }

      await this.prisma.tariffPeriodConfig.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Tramo tarifario eliminado correctamente',
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar tramo tarifario ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Simuladores de Tarifas y Salarios
  // ==========================================

  async simulateTariff(
    dto: SimulateTariffDto,
    user: UserContext,
  ): Promise<TariffCalculationBreakdown> {
    try {
      // 1. Consultar configuración tributaria y comercial del tenant
      const settings = await this.getSettings(user);

      // 2. Consultar vigencia tarifaria (por ID específico o la activa por defecto)
      let period: TariffPeriodConfig | null = null;
      if (dto.tariffPeriodId) {
        period = await this.prisma.tariffPeriodConfig.findFirst({
          where: { id: dto.tariffPeriodId, tenantId: user.tenantId },
        });
        if (!period) {
          throw new NotFoundException(
            `Vigencia tarifaria con id [${dto.tariffPeriodId}] no encontrada`,
          );
        }
      } else {
        period = await this.prisma.tariffPeriodConfig.findFirst({
          where: { tenantId: user.tenantId, isActive: true },
          orderBy: { startDate: 'desc' },
        });
        if (!period) {
          period = await this.prisma.tariffPeriodConfig.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { startDate: 'desc' },
          });
        }
      }

      if (!period) {
        throw new NotFoundException(
          'No se encontró ninguna vigencia tarifaria configurada en la base de datos para esta empresa.',
        );
      }

      // 3. Extraer variables directamente desde la base de datos
      const smmlv = Number(period.smmlv);
      const monthlyTransportAux = Number(period.monthlyTransportAux);
      const commercialMult = Number(period.commercialMultiplier);
      const strata46Mult = Number(period.strata46Multiplier);
      const strata13Mult = Number(period.strata13Multiplier);
      const dayFactor = Number(period.dayProportionFactor);
      const nightFactor = Number(period.nightProportionFactor);
      const statutoryDayHours = period.statutoryDayHours ?? 13;
      const statutoryNightHours = period.statutoryNightHours ?? 11;

      // Tasas tributarias desde CommercialSettings (con soporte a sobreescritura si vienen en DTO)
      const aiuRate = dto.aiuRate ?? Number(settings.defaultAiuRate);
      const ivaOnAiuRate =
        dto.ivaOnAiuRate ?? Number(settings.defaultIvaOnAiuRate);
      const discountPct =
        dto.discountPct ?? Number(settings.defaultPromptPaymentDisc);

      const simulationDto = {
        ...dto,
        discountPct,
        aiuRate,
        ivaOnAiuRate,
      };

      return TariffCalculationEngine.calculateRate(
        simulationDto,
        smmlv,
        commercialMult,
        strata46Mult,
        strata13Mult,
        dayFactor,
        nightFactor,
        statutoryDayHours,
        statutoryNightHours,
        monthlyTransportAux,
      );
    } catch (error) {
      this.logger.error(
        `Error al simular tarifa: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async simulateSalary(
    dto: SimulateSalaryDto,
    user: UserContext,
  ): Promise<GuardPayrollSimulationResult> {
    try {
      // 1. Consultar vigencia tarifaria en BD
      let period: TariffPeriodConfig | null = null;
      if (dto.tariffPeriodId) {
        period = await this.prisma.tariffPeriodConfig.findFirst({
          where: { id: dto.tariffPeriodId, tenantId: user.tenantId },
        });
        if (!period) {
          throw new NotFoundException(
            `Vigencia tarifaria con id [${dto.tariffPeriodId}] no encontrada`,
          );
        }
      } else {
        period = await this.prisma.tariffPeriodConfig.findFirst({
          where: { tenantId: user.tenantId, isActive: true },
          orderBy: { startDate: 'desc' },
        });
        if (!period) {
          period = await this.prisma.tariffPeriodConfig.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { startDate: 'desc' },
          });
        }
      }

      if (!period) {
        throw new NotFoundException(
          'No se encontró ninguna vigencia tarifaria configurada en la base de datos para simular nómina.',
        );
      }

      // 2. Extraer parámetros base de la BD (con soporte a sobreescritura voluntaria en DTO)
      const smmlv = dto.smmlv ?? Number(period.smmlv);
      const transportAllowance =
        dto.transportAllowance ?? Number(period.monthlyTransportAux);
      const statutoryWeeklyHours =
        dto.statutoryWeeklyHours ?? period.statutoryWeeklyHours;

      return GuardSalaryCalculationEngine.simulateGuardPayroll({
        ...dto,
        smmlv,
        transportAllowance,
        statutoryWeeklyHours,
      });
    } catch (error) {
      this.logger.error(
        `Error al simular nómina de guarda: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Catálogo de Servicios (SecurityServiceCatalog)
  // ==========================================

  async getServiceCatalog(user: UserContext) {
    try {
      return await this.prisma.securityServiceCatalog.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { serviceCode: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al consultar catálogo de servicios: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createServiceCatalog(dto: CreateServiceCatalogDto, user: UserContext) {
    try {
      const settings = await this.getSettings(user);

      return await this.prisma.securityServiceCatalog.create({
        data: {
          tenantId: user.tenantId,
          commercialSettingsId: settings.id,
          serviceCode: dto.serviceCode,
          name: dto.name,
          targetPosition: dto.targetPosition,
          sector: dto.sector,
          weaponModality: dto.weaponModality,
          scheduleType: dto.scheduleType ?? ShiftScheduleType.SCHEDULE_2X2X2,
          daysModality: dto.daysModality,
          dailyTotalHours: dto.dailyTotalHours,
          dayHours: dto.dayHours,
          nightHours: dto.nightHours,
          billableDaysPerMonth: dto.billableDaysPerMonth,
          adminSupervisionPct: new Prisma.Decimal(dto.adminSupervisionPct),
          isSystemStandard: dto.isSystemStandard ?? true,
          isActive: dto.isActive ?? true,
          createdById: user.sub,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear servicio en catálogo: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El código de servicio ${dto.serviceCode} ya existe`,
        );
      }
      throw error;
    }
  }

  async updateServiceCatalog(
    id: string,
    dto: UpdateServiceCatalogDto,
    user: UserContext,
  ) {
    try {
      const existing = await this.prisma.securityServiceCatalog.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Servicio de catálogo con id ${id} no encontrado`,
        );
      }

      const updateData: Prisma.SecurityServiceCatalogUpdateInput = {
        updatedById: user.sub,
      };

      if (dto.serviceCode !== undefined)
        updateData.serviceCode = dto.serviceCode;
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.targetPosition !== undefined)
        updateData.targetPosition = dto.targetPosition;
      if (dto.sector !== undefined) updateData.sector = dto.sector;
      if (dto.weaponModality !== undefined)
        updateData.weaponModality = dto.weaponModality;
      if (dto.scheduleType !== undefined)
        updateData.scheduleType = dto.scheduleType;
      if (dto.daysModality !== undefined)
        updateData.daysModality = dto.daysModality;
      if (dto.dailyTotalHours !== undefined)
        updateData.dailyTotalHours = dto.dailyTotalHours;
      if (dto.dayHours !== undefined) updateData.dayHours = dto.dayHours;
      if (dto.nightHours !== undefined) updateData.nightHours = dto.nightHours;
      if (dto.billableDaysPerMonth !== undefined)
        updateData.billableDaysPerMonth = dto.billableDaysPerMonth;
      if (dto.adminSupervisionPct !== undefined)
        updateData.adminSupervisionPct = new Prisma.Decimal(
          dto.adminSupervisionPct,
        );
      if (dto.isSystemStandard !== undefined)
        updateData.isSystemStandard = dto.isSystemStandard;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.prisma.securityServiceCatalog.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar servicio de catálogo ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteServiceCatalog(id: string, user: UserContext) {
    try {
      const existing = await this.prisma.securityServiceCatalog.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Servicio de catálogo con id ${id} no encontrado`,
        );
      }

      await this.prisma.securityServiceCatalog.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Servicio eliminado correctamente del catálogo',
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar servicio de catálogo ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Matriz Salarial (PositionSalaryMatrix)
  // ==========================================

  async getSalaryMatrix(user: UserContext) {
    try {
      return await this.prisma.positionSalaryMatrix.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { positionTitle: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al consultar matriz salarial: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async upsertSalaryMatrix(
    dto: UpsertSalaryMatrixDto,
    user: UserContext,
  ): Promise<PositionSalaryMatrix[]> {
    try {
      const settings = await this.getSettings(user);

      const results: PositionSalaryMatrix[] = [];
      for (const item of dto.items) {
        const scheduleType =
          item.scheduleType ?? ShiftScheduleType.SCHEDULE_2X2X2;

        const record = await this.prisma.positionSalaryMatrix.upsert({
          where: {
            tenantId_positionTitle_scheduleType: {
              tenantId: user.tenantId,
              positionTitle: item.positionTitle,
              scheduleType,
            },
          },
          create: {
            tenantId: user.tenantId,
            commercialSettingsId: settings.id,
            positionTitle: item.positionTitle,
            scheduleType,
            guardsRequiredPerPost: new Prisma.Decimal(
              item.guardsRequiredPerPost ?? 3.0,
            ),
            baseSalary: new Prisma.Decimal(item.baseSalary),
            transportAllowance: new Prisma.Decimal(item.transportAllowance),
            shiftOrdinaryHours: item.shiftOrdinaryHours ?? 8,
            shiftExtraHours: item.shiftExtraHours ?? 4,
            estimatedOvertimePay: new Prisma.Decimal(item.estimatedOvertimePay),
            grossSalary: new Prisma.Decimal(item.grossSalary),
            healthDeductionPct: new Prisma.Decimal(
              item.healthDeductionPct ?? 0.04,
            ),
            pensionDeductionPct: new Prisma.Decimal(
              item.pensionDeductionPct ?? 0.04,
            ),
            healthDeduction: new Prisma.Decimal(item.healthDeduction),
            pensionDeduction: new Prisma.Decimal(item.pensionDeduction),
            totalDeductions: new Prisma.Decimal(item.totalDeductions),
            fixedBonusNonSalary: new Prisma.Decimal(
              item.fixedBonusNonSalary ?? 0,
            ),
            vehicleAllowance: new Prisma.Decimal(item.vehicleAllowance ?? 0),
            netTakeHomePay: new Prisma.Decimal(item.netTakeHomePay),
            isActive: item.isActive ?? true,
            createdById: user.sub,
          },
          update: {
            guardsRequiredPerPost: item.guardsRequiredPerPost
              ? new Prisma.Decimal(item.guardsRequiredPerPost)
              : undefined,
            baseSalary: new Prisma.Decimal(item.baseSalary),
            transportAllowance: new Prisma.Decimal(item.transportAllowance),
            shiftOrdinaryHours: item.shiftOrdinaryHours,
            shiftExtraHours: item.shiftExtraHours,
            estimatedOvertimePay: new Prisma.Decimal(item.estimatedOvertimePay),
            grossSalary: new Prisma.Decimal(item.grossSalary),
            healthDeductionPct: item.healthDeductionPct
              ? new Prisma.Decimal(item.healthDeductionPct)
              : undefined,
            pensionDeductionPct: item.pensionDeductionPct
              ? new Prisma.Decimal(item.pensionDeductionPct)
              : undefined,
            healthDeduction: new Prisma.Decimal(item.healthDeduction),
            pensionDeduction: new Prisma.Decimal(item.pensionDeduction),
            totalDeductions: new Prisma.Decimal(item.totalDeductions),
            fixedBonusNonSalary:
              item.fixedBonusNonSalary !== undefined
                ? new Prisma.Decimal(item.fixedBonusNonSalary)
                : undefined,
            vehicleAllowance:
              item.vehicleAllowance !== undefined
                ? new Prisma.Decimal(item.vehicleAllowance)
                : undefined,
            netTakeHomePay: new Prisma.Decimal(item.netTakeHomePay),
            isActive: item.isActive !== undefined ? item.isActive : undefined,
            updatedById: user.sub,
          },
        });
        results.push(record);
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Error al actualizar matriz salarial: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteSalaryMatrix(id: string, user: UserContext) {
    try {
      const existing = await this.prisma.positionSalaryMatrix.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Registro de matriz salarial con id ${id} no encontrado`,
        );
      }

      await this.prisma.positionSalaryMatrix.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Registro de matriz salarial eliminado correctamente',
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar registro de matriz salarial ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Catálogo de Valores Agregados (ValueAddedCatalogItem)
  // ==========================================

  async getValueAddedCatalog(user: UserContext) {
    try {
      return await this.prisma.valueAddedCatalogItem.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al consultar catálogo de valores agregados: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createValueAdded(dto: CreateValueAddedDto, user: UserContext) {
    try {
      const settings = await this.getSettings(user);

      return await this.prisma.valueAddedCatalogItem.create({
        data: {
          tenantId: user.tenantId,
          commercialSettingsId: settings.id,
          name: dto.name,
          category: dto.category,
          description: dto.description,
          internalReferenceCost: new Prisma.Decimal(dto.internalReferenceCost),
          isStandardBenefit: dto.isStandardBenefit ?? false,
          defaultQuantity: dto.defaultQuantity ?? 1,
          isActive: dto.isActive ?? true,
          createdById: user.sub,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear valor agregado: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe un valor agregado con el nombre '${dto.name}'`,
        );
      }
      throw error;
    }
  }

  async updateValueAdded(
    id: string,
    dto: UpdateValueAddedDto,
    user: UserContext,
  ) {
    try {
      const existing = await this.prisma.valueAddedCatalogItem.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Valor agregado con id ${id} no encontrado`,
        );
      }

      const updateData: Prisma.ValueAddedCatalogItemUpdateInput = {
        updatedById: user.sub,
      };

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.internalReferenceCost !== undefined)
        updateData.internalReferenceCost = new Prisma.Decimal(
          dto.internalReferenceCost,
        );
      if (dto.isStandardBenefit !== undefined)
        updateData.isStandardBenefit = dto.isStandardBenefit;
      if (dto.defaultQuantity !== undefined)
        updateData.defaultQuantity = dto.defaultQuantity;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.prisma.valueAddedCatalogItem.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar valor agregado ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteValueAdded(id: string, user: UserContext) {
    try {
      const existing = await this.prisma.valueAddedCatalogItem.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Valor agregado con id ${id} no encontrado`,
        );
      }

      await this.prisma.valueAddedCatalogItem.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Valor agregado eliminado correctamente',
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar valor agregado ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Identidad Camaleón (TenantDocumentSkin)
  // ==========================================

  async updateDocumentSkin(dto: UpdateDocumentSkinDto, user: UserContext) {
    try {
      const settings = await this.getSettings(user);

      const skin = await this.prisma.tenantDocumentSkin.upsert({
        where: { tenantId: user.tenantId },
        create: {
          tenantId: user.tenantId,
          commercialSettingsId: settings.id,
          primaryBrandColorHex: dto.primaryBrandColorHex ?? '#1E1B4B',
          accentBrandColorHex: dto.accentBrandColorHex ?? '#7C3AED',
          logoS3Key: dto.logoS3Key,
          secondaryLogoS3Key: dto.secondaryLogoS3Key,
          companyLegalName:
            dto.companyLegalName ?? 'EMPRESA DE SEGURIDAD PRIVADA S.A.S.',
          companyNit: dto.companyNit ?? '900.000.000-1',
          commercialRegisterNum: dto.commercialRegisterNum,
          supervigilanciaLicense: dto.supervigilanciaLicense,
          supervigilanciaLicDate: dto.supervigilanciaLicDate
            ? new Date(dto.supervigilanciaLicDate)
            : undefined,
          supervigilanciaLicExpiry: dto.supervigilanciaLicExpiry
            ? new Date(dto.supervigilanciaLicExpiry)
            : undefined,
          minTicLicenseNum: dto.minTicLicenseNum,
          uniformsResolutionNum: dto.uniformsResolutionNum,
          overtimeResolutionNum: dto.overtimeResolutionNum,
          sstImplementationPct: dto.sstImplementationPct
            ? new Prisma.Decimal(dto.sstImplementationPct)
            : undefined,
          hasIso9001Certified: dto.hasIso9001Certified ?? true,
          hasBascCertified: dto.hasBascCertified ?? true,
          hasPoliceSupportNetwork: dto.hasPoliceSupportNetwork ?? true,
          hasDijinEnterpriseFront: dto.hasDijinEnterpriseFront ?? true,
          createdById: user.sub,
        },
        update: {
          primaryBrandColorHex: dto.primaryBrandColorHex,
          accentBrandColorHex: dto.accentBrandColorHex,
          logoS3Key: dto.logoS3Key,
          secondaryLogoS3Key: dto.secondaryLogoS3Key,
          companyLegalName: dto.companyLegalName,
          companyNit: dto.companyNit,
          commercialRegisterNum: dto.commercialRegisterNum,
          supervigilanciaLicense: dto.supervigilanciaLicense,
          supervigilanciaLicDate: dto.supervigilanciaLicDate
            ? new Date(dto.supervigilanciaLicDate)
            : undefined,
          supervigilanciaLicExpiry: dto.supervigilanciaLicExpiry
            ? new Date(dto.supervigilanciaLicExpiry)
            : undefined,
          minTicLicenseNum: dto.minTicLicenseNum,
          uniformsResolutionNum: dto.uniformsResolutionNum,
          overtimeResolutionNum: dto.overtimeResolutionNum,
          sstImplementationPct: dto.sstImplementationPct
            ? new Prisma.Decimal(dto.sstImplementationPct)
            : undefined,
          hasIso9001Certified: dto.hasIso9001Certified,
          hasBascCertified: dto.hasBascCertified,
          hasPoliceSupportNetwork: dto.hasPoliceSupportNetwork,
          hasDijinEnterpriseFront: dto.hasDijinEnterpriseFront,
          updatedById: user.sub,
        },
      });

      return skin;
    } catch (error) {
      this.logger.error(
        `Error al actualizar documento skin: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Matriz de Distribución (9 Dependencias)
  // ==========================================

  async updateDistributionRecipients(
    dto: UpdateDistributionMatrixDto,
    user: UserContext,
  ): Promise<ServiceOrderDistributionRecipient[]> {
    try {
      const settings = await this.getSettings(user);

      const results: ServiceOrderDistributionRecipient[] = [];
      for (const item of dto.recipients) {
        const record =
          await this.prisma.serviceOrderDistributionRecipient.upsert({
            where: {
              tenantId_department: {
                tenantId: user.tenantId,
                department: item.department,
              },
            },
            create: {
              tenantId: user.tenantId,
              commercialSettingsId: settings.id,
              department: item.department,
              recipientName: item.recipientName,
              recipientEmail: item.recipientEmail,
              isActive: item.isActive ?? true,
              createdById: user.sub,
            },
            update: {
              recipientName: item.recipientName,
              recipientEmail: item.recipientEmail,
              isActive: item.isActive !== undefined ? item.isActive : undefined,
              updatedById: user.sub,
            },
          });
        results.push(record);
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Error al sincronizar matriz de distribución: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Plantillas de Texto Dinámicas (DocumentTextSnippet)
  // ==========================================

  async getTextSnippets(user: UserContext) {
    try {
      return await this.prisma.documentTextSnippet.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { key: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error al consultar plantillas de texto: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createTextSnippet(dto: CreateTextSnippetDto, user: UserContext) {
    try {
      const settings = await this.getSettings(user);

      return await this.prisma.documentTextSnippet.create({
        data: {
          tenantId: user.tenantId,
          commercialSettingsId: settings.id,
          key: dto.key,
          title: dto.title,
          bodyTemplate: dto.bodyTemplate,
          category: dto.category,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          createdById: user.sub,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al crear plantilla de texto: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe una plantilla con la clave '${dto.key}'`,
        );
      }
      throw error;
    }
  }

  async updateTextSnippet(
    id: string,
    dto: UpdateTextSnippetDto,
    user: UserContext,
  ) {
    try {
      const existing = await this.prisma.documentTextSnippet.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Plantilla de texto con id ${id} no encontrada`,
        );
      }

      const updateData: Prisma.DocumentTextSnippetUpdateInput = {
        updatedById: user.sub,
      };

      if (dto.key !== undefined) updateData.key = dto.key;
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.bodyTemplate !== undefined)
        updateData.bodyTemplate = dto.bodyTemplate;
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return await this.prisma.documentTextSnippet.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar plantilla de texto ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteTextSnippet(id: string, user: UserContext) {
    try {
      const existing = await this.prisma.documentTextSnippet.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Plantilla de texto con id ${id} no encontrada`,
        );
      }

      await this.prisma.documentTextSnippet.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Plantilla de texto eliminada correctamente',
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar plantilla de texto ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Helper: Inicialización por Defecto
  // ==========================================

  private async initDefaultSettings(tenantId: string, userId?: string) {
    this.logger.log(
      `Inicializando configuración comercial por defecto para el tenant ${tenantId}`,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const tenantName = tenant?.name || 'EMPRESA DE SEGURIDAD PRIVADA S.A.S.';
    const tenantNit = '900.000.000-1';

    // 1. Crear CommercialSettings
    const settings = await this.prisma.commercialSettings.create({
      data: {
        tenantId,
        defaultAiuRate: new Prisma.Decimal(0.1),
        defaultIvaOnAiuRate: new Prisma.Decimal(0.19),
        defaultRetefuenteRate: new Prisma.Decimal(0.02),
        defaultReteIcaRate: new Prisma.Decimal(0.0138),
        maxReinvestmentPct1Yr: new Prisma.Decimal(0.8),
        maxReinvestmentPct2Yr: new Prisma.Decimal(1.6),
        defaultQuoteValidityDays: 15,
        enableGuardSalaryDisplay: true,
        defaultPromptPaymentDays: 10,
        defaultPromptPaymentDisc: new Prisma.Decimal(0.0),
        qualityDocCode: 'CM-F-001',
        qualityDocVersion: 'V.4',
        createdById: userId,
      },
    });

    // 2. Crear Vigencia Oficial SVSP 2026
    await this.prisma.tariffPeriodConfig.create({
      data: {
        tenantId,
        commercialSettingsId: settings.id,
        year: 2026,
        label: 'Tarifa Vigencia Oficial SVSP 2026 (44 Horas)',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        smmlv: new Prisma.Decimal(1750905.0),
        monthlyTransportAux: new Prisma.Decimal(249095.0),
        dailyTransportAux: new Prisma.Decimal(8303.17),
        statutoryWeeklyHours: 44,
        baseHourlyRate: new Prisma.Decimal(7959.0),
        statutoryDayHours: 13,
        statutoryNightHours: 11,
        dayProportionFactor: new Prisma.Decimal(0.4759),
        nightProportionFactor: new Prisma.Decimal(0.5241),
        commercialMultiplier: new Prisma.Decimal(8.8),
        strata46Multiplier: new Prisma.Decimal(9.77),
        strata13Multiplier: new Prisma.Decimal(7.66376105),
        createdById: userId,
      },
    });

    // 3. Crear Posición Salarial Referencia Guarda Portero 2x2x2
    const guardSim = GuardSalaryCalculationEngine.simulateGuardPayroll({
      smmlv: 1750905.0,
      transportAllowance: 249095.0,
      statutoryWeeklyHours: 44,
      overtimeHoursNight: 20,
    });

    await this.prisma.positionSalaryMatrix.create({
      data: {
        tenantId,
        commercialSettingsId: settings.id,
        positionTitle: 'Guarda Portero',
        scheduleType: ShiftScheduleType.SCHEDULE_2X2X2,
        guardsRequiredPerPost: new Prisma.Decimal(3.0),
        baseSalary: new Prisma.Decimal(guardSim.baseSalary),
        transportAllowance: new Prisma.Decimal(guardSim.transportAllowance),
        shiftOrdinaryHours: 8,
        shiftExtraHours: 4,
        estimatedOvertimePay: new Prisma.Decimal(
          guardSim.overtimePay + guardSim.nightSurcharges,
        ),
        grossSalary: new Prisma.Decimal(guardSim.grossSalaryTotal),
        healthDeductionPct: new Prisma.Decimal(0.04),
        pensionDeductionPct: new Prisma.Decimal(0.04),
        healthDeduction: new Prisma.Decimal(guardSim.healthDeduction),
        pensionDeduction: new Prisma.Decimal(guardSim.pensionDeduction),
        totalDeductions: new Prisma.Decimal(guardSim.totalDeductions),
        fixedBonusNonSalary: new Prisma.Decimal(0),
        vehicleAllowance: new Prisma.Decimal(0),
        netTakeHomePay: new Prisma.Decimal(guardSim.netTakeHomePay),
        isActive: true,
        createdById: userId,
      },
    });

    // 4. Crear TenantDocumentSkin
    await this.prisma.tenantDocumentSkin.create({
      data: {
        tenantId,
        commercialSettingsId: settings.id,
        companyLegalName: tenantName,
        companyNit: tenantNit,
        primaryBrandColorHex: '#1E1B4B',
        accentBrandColorHex: '#7C3AED',
        hasIso9001Certified: true,
        hasBascCertified: true,
        hasPoliceSupportNetwork: true,
        hasDijinEnterpriseFront: true,
        createdById: userId,
      },
    });

    // 5. Inicializar las 9 áreas en la matriz de distribución
    const departments: InternalDepartment[] = [
      InternalDepartment.CONTRACTS,
      InternalDepartment.OPERATIONS,
      InternalDepartment.WAREHOUSE,
      InternalDepartment.MONITORING_CENTER,
      InternalDepartment.CUSTOMER_SERVICE,
      InternalDepartment.HUMAN_RESOURCES,
      InternalDepartment.QUALITY_ASSURANCE,
      InternalDepartment.ACCOUNTING,
      InternalDepartment.TREASURY,
    ];

    for (const dep of departments) {
      await this.prisma.serviceOrderDistributionRecipient.create({
        data: {
          tenantId,
          commercialSettingsId: settings.id,
          department: dep,
          recipientName: `Responsable ${dep}`,
          recipientEmail: `${dep.toLowerCase()}@noxiaseguridad.com`,
          isActive: true,
          createdById: userId,
        },
      });
    }

    // Retornar la estructura completa
    return await this.prisma.commercialSettings.findUniqueOrThrow({
      where: { id: settings.id },
      include: {
        tariffPeriods: { orderBy: { startDate: 'desc' } },
        serviceCatalog: { orderBy: { serviceCode: 'asc' } },
        salaryMatrix: { orderBy: { positionTitle: 'asc' } },
        valueAddedCatalog: { orderBy: { name: 'asc' } },
        documentSkin: true,
        distributionRecipients: { orderBy: { department: 'asc' } },
        textSnippets: { orderBy: { key: 'asc' } },
      },
    });
  }

  async searchEmployees(query: string, user: UserContext, limit = 15) {
    const trimmed = (query || '').trim();
    const where: any = {
      tenantId: user.tenantId,
      isActive: true,
      isRetired: false,
      deletedAt: null,
    };
    if (trimmed) {
      where.OR = [
        { fullName: { contains: trimmed, mode: 'insensitive' } },
        { firstName: { contains: trimmed, mode: 'insensitive' } },
        { lastName: { contains: trimmed, mode: 'insensitive' } },
        { document: { contains: trimmed, mode: 'insensitive' } },
      ];
    }
    return this.prisma.employee.findMany({
      where,
      take: Math.min(limit, 50),
      select: {
        id: true,
        fullName: true,
        document: true,
        documentType: true,
        email: true,
        phone: true,
        signatureUrl: true,
        departmentRef: { select: { id: true, name: true } },
        positionRef: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });
  }
}
