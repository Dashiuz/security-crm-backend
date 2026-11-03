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
  CreatePayrollAcademyDto,
  UpdatePayrollAcademyDto,
  CreatePayrollCie10Dto,
  CreatePayrollPeriodDto,
  GenerateYearPeriodsDto,
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

  async createPeriod(
    tenantId: string,
    dto: CreatePayrollPeriodDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollPeriod.findFirst({
        where: {
          tenantId,
          OR: [
            { code: dto.code },
            {
              year: dto.year,
              month: dto.month,
              periodNumber: dto.periodNumber ?? 1,
            },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe un periodo con el código ${dto.code} o para el mes ${dto.month}/${dto.year} (Quincena/Nro ${dto.periodNumber ?? 1}).`,
        );
      }

      return await this.prisma.payrollPeriod.create({
        data: {
          tenantId,
          code: dto.code,
          label: dto.label,
          year: dto.year,
          month: dto.month,
          periodNumber: dto.periodNumber ?? 1,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
          status: dto.status ?? PayrollPeriodStatus.OPEN,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating payroll period for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateYearPeriods(
    tenantId: string,
    dto: GenerateYearPeriodsDto,
    userId?: string,
  ) {
    try {
      const year = dto.year;
      const monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];

      const createdPeriods: any[] = [];

      for (let m = 1; m <= 12; m++) {
        const periodCode = dto.baseCode
          ? dto.baseCode + m
          : (year % 100) * 100 + m;
        const monthLabel = `Nómina Mensual ${monthNames[m - 1]} ${year}`;
        const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
        const startIso = `${year}-${String(m).padStart(2, '0')}-01`;
        const endIso = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const existing = await this.prisma.payrollPeriod.findFirst({
          where: {
            tenantId,
            OR: [{ code: periodCode }, { year, month: m, periodNumber: 1 }],
          },
        });

        if (existing) {
          createdPeriods.push(existing);
        } else {
          const created = await this.prisma.payrollPeriod.create({
            data: {
              tenantId,
              code: periodCode,
              label: monthLabel,
              year,
              month: m,
              periodNumber: 1,
              startDate: new Date(startIso),
              endDate: new Date(endIso),
              paymentDate: new Date(endIso),
              status: PayrollPeriodStatus.OPEN,
              notes: `Generación automática anual para ${year}`,
              createdById: userId,
              updatedById: userId,
            },
          });
          createdPeriods.push(created);
        }
      }

      return createdPeriods;
    } catch (error) {
      this.logger.error(
        `Error generating year periods for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  // 8. Security Academies (Pronos 5.2)
  async listAcademies(tenantId: string) {
    try {
      return await this.prisma.payrollSecurityAcademy.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing security academies for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createAcademy(
    tenantId: string,
    dto: CreatePayrollAcademyDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollSecurityAcademy.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe una academia de seguridad con el código ${dto.code}`,
        );
      }

      return await this.prisma.payrollSecurityAcademy.create({
        data: { ...dto, tenantId, createdById: userId, updatedById: userId },
      });
    } catch (error) {
      this.logger.error(
        `Error creating security academy for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAcademy(
    tenantId: string,
    id: string,
    dto: UpdatePayrollAcademyDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollSecurityAcademy.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new NotFoundException(
          `Academia de seguridad no encontrada (ID: ${id})`,
        );
      }

      return await this.prisma.payrollSecurityAcademy.update({
        where: { id },
        data: { ...dto, updatedById: userId },
      });
    } catch (error) {
      this.logger.error(`Error updating security academy ${id}`, error.stack);
      throw error;
    }
  }

  // 9. CIE-10 Medical Diagnosis Codes
  async listCie10(tenantId: string, search?: string) {
    try {
      const where: any = { tenantId, isActive: true };
      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { code: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ];
      }
      return await this.prisma.payrollCie10.findMany({
        where,
        orderBy: { code: 'asc' },
        take: 100,
      });
    } catch (error) {
      this.logger.error(
        `Error listing CIE-10 codes for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async createCie10(
    tenantId: string,
    dto: CreatePayrollCie10Dto,
    userId?: string,
  ) {
    try {
      const normalizedCode = dto.code.trim().toUpperCase();
      const existing = await this.prisma.payrollCie10.findUnique({
        where: { tenantId_code: { tenantId, code: normalizedCode } },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe un código CIE-10 registrado con el código ${normalizedCode}`,
        );
      }
      return await this.prisma.payrollCie10.create({
        data: {
          tenantId,
          code: normalizedCode,
          familyCode: dto.familyCode
            ? dto.familyCode.trim().toUpperCase()
            : null,
          name: dto.name.trim(),
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating CIE-10 code for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }
}
