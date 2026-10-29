import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePayrollConceptDto,
  UpdatePayrollConceptDto,
  UpdateConceptBaseMatrixDto,
} from '../dtos/payroll-concept.dto';
import {
  CreatePayrollShiftModalityDto,
  UpdatePayrollShiftModalityDto,
} from '../dtos/payroll-modality.dto';
import { PayrollConceptNature } from '@prisma/client';

@Injectable()
export class PayrollConceptsService {
  private readonly logger = new Logger(PayrollConceptsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // CONCEPTS CRUD & BASE MATRIX
  // ==========================================

  async listConcepts(
    tenantId: string,
    filters?: {
      nature?: PayrollConceptNature;
      isActive?: boolean;
      search?: string;
    },
  ) {
    try {
      const where: any = { tenantId };

      if (filters?.nature) {
        where.nature = filters.nature;
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters?.search) {
        const query = filters.search.trim();
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { adminPucAccount: { contains: query } },
          { operativePucAccount: { contains: query } },
          { dianNieCode: { contains: query, mode: 'insensitive' } },
        ];
        const num = parseInt(query, 10);
        if (!isNaN(num)) {
          where.OR.push({ code: num });
        }
      }

      return await this.prisma.payrollConcept.findMany({
        where,
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing payroll concepts for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getConceptById(tenantId: string, id: string) {
    try {
      const concept = await this.prisma.payrollConcept.findFirst({
        where: { id, tenantId },
      });

      if (!concept) {
        throw new NotFoundException(
          `Concepto de nómina no encontrado (ID: ${id})`,
        );
      }

      return concept;
    } catch (error) {
      this.logger.error(`Error retrieving payroll concept ${id}`, error.stack);
      throw error;
    }
  }

  async createConcept(
    tenantId: string,
    dto: CreatePayrollConceptDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollConcept.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe un concepto de nómina con el código ${dto.code}`,
        );
      }

      return await this.prisma.payrollConcept.create({
        data: {
          ...dto,
          tenantId,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating payroll concept for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateConcept(
    tenantId: string,
    id: string,
    dto: UpdatePayrollConceptDto,
    userId?: string,
  ) {
    try {
      await this.getConceptById(tenantId, id);

      if (dto.code) {
        const conflict = await this.prisma.payrollConcept.findFirst({
          where: { tenantId, code: dto.code, NOT: { id } },
        });
        if (conflict) {
          throw new BadRequestException(
            `El código ${dto.code} ya está en uso por otro concepto`,
          );
        }
      }

      return await this.prisma.payrollConcept.update({
        where: { id },
        data: {
          ...dto,
          updatedById: userId,
        },
      });
    } catch (error) {
      this.logger.error(`Error updating payroll concept ${id}`, error.stack);
      throw error;
    }
  }

  async deleteConcept(tenantId: string, id: string) {
    try {
      const concept = await this.getConceptById(tenantId, id);

      if (!concept.isDeletableOnLiquidation) {
        throw new BadRequestException(
          'Este concepto es del sistema y no puede ser eliminado.',
        );
      }

      return await this.prisma.payrollConcept.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.logger.error(
        `Error deactivating payroll concept ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateBaseMatrix(
    tenantId: string,
    matrix: UpdateConceptBaseMatrixDto[],
    userId?: string,
  ) {
    try {
      const updatedConcepts: any[] = [];
      for (const row of matrix) {
        const { conceptId, ...flags } = row;
        const updated = await this.prisma.payrollConcept.updateMany({
          where: { id: conceptId, tenantId },
          data: {
            ...flags,
            updatedById: userId,
          },
        });
        updatedConcepts.push(updated);
      }
      return { success: true, count: updatedConcepts.length };
    } catch (error) {
      this.logger.error(
        `Error updating concept base matrix for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // SHIFT MODALITIES & BREAKDOWN ITEMS
  // ==========================================

  async listModalities(tenantId: string) {
    try {
      return await this.prisma.payrollShiftModality.findMany({
        where: { tenantId, isActive: true },
        include: {
          items: {
            include: { concept: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error listing shift modalities for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getModalityById(tenantId: string, id: string) {
    try {
      const modality = await this.prisma.payrollShiftModality.findFirst({
        where: { id, tenantId },
        include: {
          items: {
            include: { concept: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!modality) {
        throw new NotFoundException(
          `Modalidad de turno no encontrada (ID: ${id})`,
        );
      }

      return modality;
    } catch (error) {
      this.logger.error(`Error retrieving shift modality ${id}`, error.stack);
      throw error;
    }
  }

  async createModality(
    tenantId: string,
    dto: CreatePayrollShiftModalityDto,
    userId?: string,
  ) {
    try {
      const existing = await this.prisma.payrollShiftModality.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe una modalidad con el código ${dto.code}`,
        );
      }

      if (dto.items && dto.items.length > 0) {
        const sum = dto.items.reduce(
          (acc, curr) => acc + Number(curr.percentage),
          0,
        );
        if (Math.abs(sum - 100.0) > 0.05) {
          throw new BadRequestException(
            `Los porcentajes de la modalidad deben sumar 100.00%. Suma actual: ${sum}%`,
          );
        }
      }

      const modality = await this.prisma.payrollShiftModality.create({
        data: {
          tenantId,
          code: dto.code,
          name: dto.name,
          shiftClass: dto.shiftClass,
          hoursPerShift: dto.hoursPerShift || 12,
          description: dto.description,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          createdById: userId,
          updatedById: userId,
          items: dto.items
            ? {
                create: dto.items.map((item, idx) => ({
                  tenantId,
                  conceptId: item.conceptId,
                  percentage: item.percentage,
                  sortOrder: item.sortOrder || idx + 1,
                  createdById: userId,
                  updatedById: userId,
                })),
              }
            : undefined,
        },
        include: {
          items: {
            include: { concept: true },
          },
        },
      });

      return modality;
    } catch (error) {
      this.logger.error(
        `Error creating shift modality for tenant ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateModality(
    tenantId: string,
    id: string,
    dto: UpdatePayrollShiftModalityDto,
    userId?: string,
  ) {
    try {
      await this.getModalityById(tenantId, id);

      if (dto.items && dto.items.length > 0) {
        const sum = dto.items.reduce(
          (acc, curr) => acc + Number(curr.percentage),
          0,
        );
        if (Math.abs(sum - 100.0) > 0.05) {
          throw new BadRequestException(
            `Los porcentajes de la modalidad deben sumar 100.00%. Suma actual: ${sum}%`,
          );
        }
      }

      // If items provided, clear and recreate
      if (dto.items) {
        await this.prisma.payrollModalityItem.deleteMany({
          where: { modalityId: id },
        });
      }

      const updated = await this.prisma.payrollShiftModality.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          shiftClass: dto.shiftClass,
          hoursPerShift: dto.hoursPerShift,
          description: dto.description,
          isActive: dto.isActive,
          updatedById: userId,
          items: dto.items
            ? {
                create: dto.items.map((item, idx) => ({
                  tenantId,
                  conceptId: item.conceptId,
                  percentage: item.percentage,
                  sortOrder: item.sortOrder || idx + 1,
                  createdById: userId,
                  updatedById: userId,
                })),
              }
            : undefined,
        },
        include: {
          items: {
            include: { concept: true },
          },
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(`Error updating shift modality ${id}`, error.stack);
      throw error;
    }
  }

  async deleteModality(tenantId: string, id: string) {
    try {
      await this.getModalityById(tenantId, id);
      return await this.prisma.payrollShiftModality.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.logger.error(`Error deactivating shift modality ${id}`, error.stack);
      throw error;
    }
  }
}
