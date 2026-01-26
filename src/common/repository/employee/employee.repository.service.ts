import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Employee } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EmployeeRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createEmployee(
    tenantId: string,
    data: Prisma.EmployeeCreateInput,
  ): Promise<Employee> {
    try {
      const employee = await this.prisma.employee.create({
        data: {
          tenant: { connect: { id: tenantId } },
          firstName: data.firstName,
          secondName: data.secondName,
          lastName: data.lastName,
          maternalSurname: data.maternalSurname,
          fullName: data.fullName,
          documentType: data.documentType,
          document: data.document,
          birthdate: data.birthdate,
          gender: data.gender,
          department: data.department,
          position: data.position,
          email: data.email,
          phone: data.phone,
          entryDate: data.entryDate,
          isRetired: data.isRetired,
          isActive: data.isActive,
          retiredAt: data.retiredAt,
        },
      });

      return employee;
    } catch (e: any) {
      // Prisma unique violation
      if (e?.code === 'P2002') {
        const target =
          (e?.meta?.target as string[] | undefined)?.join(', ') ??
          'unique field';
        throw new ConflictException(`Duplicate value for: ${target}`);
      }
      // Foreign key / relation errors etc.
      if (e?.code === 'P2003') {
        throw new BadRequestException('Invalid relation reference.');
      }
      throw e;
    }
  }

  async findAnyById(tenantId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, tenantId, tenant: { isActive: true } },
    });
  }

  async findActiveByDocument(document: string, tenantId: string) {
    return await this.prisma.employee.findFirst({
      where: {
        document,
        isActive: true,
        tenant: { isActive: true, id: tenantId },
      },
      select: {
        id: true,
        tenantId: true,
        fullName: true,
        documentType: true,
        document: true,
        gender: true,
        department: true,
        position: true,
        email: true,
        phone: true,
        birthdate: true,
        entryDate: true,
        isActive: true,
      },
    });
  }

  async updateEmployee(
    tenantId: string,
    id: string,
    data: Prisma.EmployeeUpdateInput,
  ) {
    try {
      const res = await this.prisma.employee.updateMany({
        where: { id, tenantId },
        data,
      });

      if (res.count === 0) throw new NotFoundException('Employee not found.');

      return this.prisma.employee.findFirst({ where: { id, tenantId } });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const target =
          (e?.meta?.target as string[] | undefined)?.join(', ') ??
          'unique field';
        throw new ConflictException(`Duplicate value for: ${target}`);
      }
      if (e?.code === 'P2025') {
        // record not found
        throw new NotFoundException('Employee not found.');
      }
      if (e?.code === 'P2003') {
        throw new BadRequestException('Invalid relation reference.');
      }
      throw e;
    }
  }

  async softDeleteEmployee(tenantId: string, id: string) {
    const res = await this.prisma.employee.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (res.count === 0) throw new NotFoundException('Employee not found.');

    return this.prisma.employee.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        fullName: true,
        document: true,
        isActive: true,
        deletedAt: true,
        updatedAt: true,
      },
    });
  }
}
