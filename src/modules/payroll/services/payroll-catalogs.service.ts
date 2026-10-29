import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePayrollEntityDto,
  UpdatePayrollEntityDto,
  CreatePayrollBankDto,
  UpdatePayrollBankDto,
  CreatePayrollExitReasonDto,
  UpdatePayrollExitReasonDto,
  CreatePayrollSvspLevelDto,
  UpdatePayrollSvspLevelDto,
} from '../dtos/payroll-catalog.dto';
import { SocialSecurityEntityType, PayrollPeriodStatus } from '@prisma/client';

@Injectable()
export class PayrollCatalogsService {
  private readonly logger = new Logger(PayrollCatalogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Social Security Entities (EPS, AFP, CCF, ARL)
  async listEntities(tenantId: string, entityType?: SocialSecurityEntityType) {
    try {
      const where: any = { tenantId, isActive: true };
      if (entityType) {
        where.entityType = entityType;
      }
      return await this.prisma.payrollEntity.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing entities for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createEntity(
    tenantId: string,
    dto: CreatePayrollEntityDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollEntity.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe una entidad con el código ${dto.code}`,
        );
      }

      return await this.prisma.payrollEntity.create({
        data: {
          ...dto,
          tenantId,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating payroll entity for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateEntity(
    tenantId: string,
    id: string,
    dto: UpdatePayrollEntityDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollEntity.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new NotFoundException(`Entidad no encontrada (ID: ${id})`);
      }

      return await this.prisma.payrollEntity.update({
        where: { id },
        data: { ...dto, updatedById: userId },
      });
    } catch (error) {
      this.logger.error(`Error updating payroll entity ${id}`, error.stack);
      throw error;
    }
  }

  // 2. Banks
  async listBanks(tenantId: string) {
    try {
      return await this.prisma.payrollBank.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing banks for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createBank(
    tenantId: string,
    dto: CreatePayrollBankDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollBank.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe un banco con el código ${dto.code}`,
        );
      }

      return await this.prisma.payrollBank.create({
        data: { ...dto, tenantId, createdById: userId, updatedById: userId },
      });
    } catch (error) {
      this.logger.error(
        `Error creating payroll bank for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateBank(
    tenantId: string,
    id: string,
    dto: UpdatePayrollBankDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollBank.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new NotFoundException(`Banco no encontrado (ID: ${id})`);
      }

      return await this.prisma.payrollBank.update({
        where: { id },
        data: { ...dto, updatedById: userId },
      });
    } catch (error) {
      this.logger.error(`Error updating bank ${id}`, error.stack);
      throw error;
    }
  }

  // 3. Branches
  async listBranches(tenantId: string) {
    try {
      return await this.prisma.payrollBranch.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing branches for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  // 4. Exit Reasons (Pronos 1.14)
  async listExitReasons(tenantId: string) {
    try {
      return await this.prisma.payrollExitReason.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing exit reasons for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createExitReason(
    tenantId: string,
    dto: CreatePayrollExitReasonDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollExitReason.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe un motivo de retiro con el código ${dto.code}`,
        );
      }

      return await this.prisma.payrollExitReason.create({
        data: { ...dto, tenantId, createdById: userId, updatedById: userId },
      });
    } catch (error) {
      this.logger.error(
        `Error creating exit reason for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  // 5. Hiring Requirements (Pronos 1.5)
  async listHiringRequirements(tenantId: string) {
    try {
      return await this.prisma.payrollHiringRequirement.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing hiring requirements for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  // 6. SVSP Levels (Pronos 5.3)
  async listSvspLevels(tenantId: string) {
    try {
      return await this.prisma.payrollSvspLevel.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing SVSP levels for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createSvspLevel(
    tenantId: string,
    dto: CreatePayrollSvspLevelDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollSvspLevel.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe un nivel SVSP con el código ${dto.code}`,
        );
      }

      return await this.prisma.payrollSvspLevel.create({
        data: { ...dto, tenantId, createdById: userId, updatedById: userId },
      });
    } catch (error) {
      this.logger.error(
        `Error creating SVSP level for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  // 7. Payroll Periods (Pronos 1.13)
  async listPeriods(tenantId: string, year?: number) {
    try {
      const where: any = { tenantId };
      if (year) {
        where.year = year;
      }
      return await this.prisma.payrollPeriod.findMany({
        where,
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { periodNumber: 'desc' },
        ],
      });
    } catch (error) {
      this.logger.error(
        `Error listing payroll periods for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }
}
