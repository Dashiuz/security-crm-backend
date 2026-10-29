import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdatePayrollSettingsDto } from '../dtos/payroll-settings.dto';
import { ColombianHolidayEngine } from '../engines/colombian-holiday.engine';

@Injectable()
export class PayrollSettingsService {
  private readonly logger = new Logger(PayrollSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly holidayEngine: ColombianHolidayEngine,
  ) {}

  async getSettings(tenantId: string) {
    try {
      let settings = await this.prisma.payrollSettings.findUnique({
        where: { tenantId },
      });

      if (!settings) {
        // Auto-initialize default settings if not exists
        settings = await this.prisma.payrollSettings.create({
          data: {
            tenantId,
          },
        });
      }

      return settings;
    } catch (error) {
      this.logger.error(
        `Error retrieving payroll settings for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateSettings(
    tenantId: string,
    dto: UpdatePayrollSettingsDto,
    userId?: string,
  ) {
    try {
      const existing = await this.getSettings(tenantId);

      const updated = await this.prisma.payrollSettings.update({
        where: { id: existing.id },
        data: {
          ...dto,
          scheduleLockDate: dto.scheduleLockDate
            ? new Date(dto.scheduleLockDate)
            : undefined,
          updatedById: userId,
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Error updating payroll settings for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getHolidays(tenantId: string, year?: number) {
    try {
      const targetYear = year || new Date().getFullYear();
      let holidays = await this.prisma.payrollHoliday.findMany({
        where: {
          tenantId,
          year: targetYear,
        },
        orderBy: { date: 'asc' },
      });

      if (holidays.length === 0) {
        // Auto-seed holidays for this year if missing
        await this.generateHolidaysForYear(tenantId, targetYear);
        holidays = await this.prisma.payrollHoliday.findMany({
          where: {
            tenantId,
            year: targetYear,
          },
          orderBy: { date: 'asc' },
        });
      }

      return holidays;
    } catch (error) {
      this.logger.error(
        `Error fetching holidays for tenant ${tenantId} and year ${year}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateHolidaysForYear(
    tenantId: string,
    year: number,
    userId?: string,
  ) {
    try {
      const computed = this.holidayEngine.getHolidaysForYear(year);

      const createdList: any[] = [];
      for (const h of computed) {
        const item = await this.prisma.payrollHoliday.upsert({
          where: {
            tenantId_date: {
              tenantId,
              date: h.date,
            },
          },
          update: {
            name: h.name,
            year,
            updatedById: userId,
          },
          create: {
            tenantId,
            date: h.date,
            year,
            name: h.name,
            isNational: true,
            createdById: userId,
          },
        });
        createdList.push(item);
      }

      return createdList;
    } catch (error) {
      this.logger.error(
        `Error generating holidays for tenant ${tenantId} and year ${year}`,
        error.stack,
      );
      throw error;
    }
  }
}
