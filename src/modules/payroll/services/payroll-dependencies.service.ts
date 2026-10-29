import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePayrollDependencyDto,
  UpdatePayrollDependencyDto,
  CalculateBreakdownSimulationDto,
} from '../dtos/payroll-dependency.dto';
import {
  SyncServiceOrdersToDependenciesDto,
  SyncServiceOrdersResultDto,
} from '../dtos/sync-service-orders.dto';
import { ModalityBreakdownEngine } from '../engines/modality-breakdown.engine';
import { DependencySettlementType } from '@prisma/client';

@Injectable()
export class PayrollDependenciesService {
  private readonly logger = new Logger(PayrollDependenciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly breakdownEngine: ModalityBreakdownEngine,
  ) {}

  async listDependencies(
    tenantId: string,
    filters?: {
      branchId?: string;
      clientId?: string;
      isInternal?: boolean;
      isActive?: boolean;
      search?: string;
    },
  ) {
    try {
      const where: any = { tenantId };

      if (filters?.branchId) {
        where.branchId = filters.branchId;
      }
      if (filters?.clientId) {
        where.clientId = filters.clientId;
      }
      if (filters?.isInternal !== undefined) {
        where.isInternal = filters.isInternal;
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters?.search) {
        const query = filters.search.trim();
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { omegaCode: { contains: query, mode: 'insensitive' } },
          { accountingCostCenter: { contains: query, mode: 'insensitive' } },
        ];
        const num = parseInt(query, 10);
        if (!isNaN(num)) {
          where.OR.push({ code: num });
        }
      }

      return await this.prisma.payrollDependency.findMany({
        where,
        include: {
          branch: true,
          client: {
            select: {
              id: true,
              name: true,
              internalCode: true,
              nit: true,
            },
          },
          modality: {
            include: {
              items: {
                include: { concept: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          serviceOrderPosition: {
            include: {
              serviceOrder: {
                select: {
                  id: true,
                  orderFolioCode: true,
                  omegaCode: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing payroll dependencies for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDependencyById(tenantId: string, id: string) {
    try {
      const dep = await this.prisma.payrollDependency.findFirst({
        where: { id, tenantId },
        include: {
          branch: true,
          client: true,
          modality: {
            include: {
              items: {
                include: { concept: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          serviceOrderPosition: {
            include: {
              serviceOrder: true,
            },
          },
        },
      });

      if (!dep) {
        throw new NotFoundException(
          `Dependencia / Puesto de nómina no encontrado (ID: ${id})`,
        );
      }

      return dep;
    } catch (error) {
      this.logger.error(
        `Error retrieving payroll dependency ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async createDependency(
    tenantId: string,
    dto: CreatePayrollDependencyDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollDependency.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe una dependencia con el código ${dto.code}`,
        );
      }

      const dailyValue =
        dto.dailyValue !== undefined
          ? dto.dailyValue
          : Math.round((Number(dto.monthlyPaidValue) / 30.0) * 100) / 100;

      const prestacionalAmount =
        dto.prestacionalAmount !== undefined
          ? dto.prestacionalAmount
          : dto.monthlyPaidValue;

      return await this.prisma.payrollDependency.create({
        data: {
          ...dto,
          dailyValue,
          prestacionalAmount,
          tenantId,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          branch: true,
          client: true,
          modality: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating payroll dependency for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateDependency(
    tenantId: string,
    id: string,
    dto: UpdatePayrollDependencyDto,
    userId?: string,
  ) {
    try {
      await this.getDependencyById(tenantId, id);

      if (dto.code) {
        const conflict = await this.prisma.payrollDependency.findFirst({
          where: { tenantId, code: dto.code, NOT: { id } },
        });
        if (conflict) {
          throw new BadRequestException(
            `El código ${dto.code} ya está en uso por otra dependencia`,
          );
        }
      }

      const dailyValue =
        dto.dailyValue !== undefined
          ? dto.dailyValue
          : dto.monthlyPaidValue !== undefined
            ? Math.round((Number(dto.monthlyPaidValue) / 30.0) * 100) / 100
            : undefined;

      return await this.prisma.payrollDependency.update({
        where: { id },
        data: {
          ...dto,
          dailyValue,
          updatedById: userId,
        },
        include: {
          branch: true,
          client: true,
          modality: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error updating payroll dependency ${id}`, error.stack);
      throw error;
    }
  }

  async deleteDependency(tenantId: string, id: string) {
    try {
      await this.getDependencyById(tenantId, id);
      return await this.prisma.payrollDependency.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.logger.error(
        `Error deactivating payroll dependency ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Sync active Commercial Service Orders positions into Payroll Dependencies (1-click sync)
   */
  async syncFromServiceOrders(
    tenantId: string,
    dto: SyncServiceOrdersToDependenciesDto,
    userId?: string,
  ): Promise<SyncServiceOrdersResultDto> {
    try {
      const orderWhere: any = {
        tenantId,
        status: { in: ['ACTIVE', 'DISPATCHED', 'IN_OPERATION'] },
      };
      if (dto.clientId) {
        orderWhere.clientId = dto.clientId;
      }

      const positions = await this.prisma.serviceOrderPosition.findMany({
        where: {
          tenantId,
          serviceOrder: orderWhere,
        },
        include: {
          serviceOrder: {
            include: {
              client: true,
            },
          },
          payrollDependency: true,
        },
      });

      // Find max code currently used in tenant to assign incremental numbers
      const maxCodeRecord = await this.prisma.payrollDependency.findFirst({
        where: { tenantId },
        orderBy: { code: 'desc' },
        select: { code: true },
      });
      let nextCode = (maxCodeRecord?.code || 200) + 1;

      let createdCount = 0;
      let updatedCount = 0;
      const syncedItems: string[] = [];

      // Default shift modality if available
      const defaultModality = await this.prisma.payrollShiftModality.findFirst({
        where: { tenantId, isActive: true },
      });

      for (const pos of positions) {
        const clientName = pos.serviceOrder.client.name;
        const omega = pos.serviceOrder.omegaCode;
        const depName = `${clientName} - ${pos.positionTitle} (${omega})`;

        if (pos.payrollDependency) {
          // Update existing dependency
          await this.prisma.payrollDependency.update({
            where: { id: pos.payrollDependency.id },
            data: {
              name: depName,
              monthlyPaidValue: pos.netMonthlySalaryToPay,
              prestacionalAmount: pos.netMonthlySalaryToPay,
              dailyValue:
                Math.round((Number(pos.netMonthlySalaryToPay) / 30.0) * 100) /
                100,
              omegaCode: omega,
              clientId: pos.serviceOrder.clientId,
              updatedById: userId,
            },
          });
          updatedCount++;
          syncedItems.push(`${depName} [Actualizado]`);
        } else {
          // Create new dependency
          await this.prisma.payrollDependency.create({
            data: {
              tenantId,
              code: nextCode++,
              name: depName,
              branchId: dto.defaultBranchId,
              clientId: pos.serviceOrder.clientId,
              serviceOrderPositionId: pos.id,
              omegaCode: omega,
              monthlyPaidValue: pos.netMonthlySalaryToPay,
              prestacionalAmount: pos.netMonthlySalaryToPay,
              dailyValue:
                Math.round((Number(pos.netMonthlySalaryToPay) / 30.0) * 100) /
                100,
              settlementType: DependencySettlementType.BY_AVERAGE_GUARANTEED,
              modalityId: defaultModality?.id || null,
              createdById: userId,
              updatedById: userId,
            },
          });
          createdCount++;
          syncedItems.push(`${depName} [Creado Cód. ${nextCode - 1}]`);
        }
      }

      return {
        syncedCount: positions.length,
        createdCount,
        updatedCount,
        syncedItems,
      };
    } catch (error) {
      this.logger.error(
        `Error syncing service orders to payroll dependencies for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Simulates breakdown in real time for front-end calculator / drawer
   */
  async simulateBreakdown(
    tenantId: string,
    dto: CalculateBreakdownSimulationDto,
  ) {
    try {
      const settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });
      const smmlv = settings ? Number(settings.smmlv) : 1750905.0;

      const modality = await this.prisma.payrollShiftModality.findFirst({
        where: { id: dto.modalityId, tenantId },
        include: {
          items: {
            include: { concept: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!modality) {
        throw new NotFoundException(
          `Modalidad no encontrada (ID: ${dto.modalityId})`,
        );
      }

      const items = modality.items.map((i) => ({
        conceptId: i.conceptId,
        conceptCode: i.concept.code,
        conceptName: i.concept.name,
        percentage: Number(i.percentage),
      }));

      return this.breakdownEngine.calculateBreakdown({
        monthlyPaidValue: Number(dto.monthlyPaidValue),
        smmlv,
        daysWorked: dto.daysWorked !== undefined ? dto.daysWorked : 30,
        items,
      });
    } catch (error) {
      this.logger.error(
        `Error simulating modality breakdown for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDependenciesKpis(tenantId: string) {
    try {
      const dependencies = await this.prisma.payrollDependency.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          isInternal: true,
          monthlyPaidValue: true,
        },
      });

      const totalPosts = dependencies.length;
      const internalPosts = dependencies.filter((d) => d.isInternal).length;
      const operativePosts = totalPosts - internalPosts;
      const totalGuaranteedMonthlyPayroll = dependencies.reduce(
        (sum, d) => sum + Number(d.monthlyPaidValue),
        0,
      );

      return {
        totalPosts,
        operativePosts,
        internalPosts,
        totalGuaranteedMonthlyPayroll,
      };
    } catch (error) {
      this.logger.error(
        `Error calculating dependencies KPIs for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }
}
