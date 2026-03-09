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

  private readonly employeeSelect = {
    id: true,
    tenantId: true,
    departmentId: true,
    positionId: true,
    firstName: true,
    secondName: true,
    lastName: true,
    maternalSurname: true,
    fullName: true,
    documentType: true,
    document: true,
    address: true,
    gender: true,
    departmentRef: {
      select: {
        id: true,
        name: true,
      },
    },
    positionRef: {
      select: {
        id: true,
        name: true,
      },
    },
    email: true,
    phone: true,
    birthdate: true,
    entryDate: true,
    isRetired: true,
    isActive: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    retiredAt: true,
    deletedAt: true,
  } as const;

  private readonly deletedEmployeeSelect = {
    id: true,
    tenantId: true,
    fullName: true,
    document: true,
    isActive: true,
    deletedAt: true,
    updatedAt: true,
  } as const;

  async createEmployee(data: Prisma.EmployeeCreateInput): Promise<Employee> {
    try {
      const employee = await (this.prisma.employee as any).create({
        data: {
          firstName: data.firstName,
          secondName: data.secondName,
          lastName: data.lastName,
          maternalSurname: data.maternalSurname,
          fullName: data.fullName,
          documentType: data.documentType,
          document: data.document,
          birthdate: data.birthdate,
          gender: data.gender,
          departmentId: (data as any).departmentId,
          positionId: (data as any).positionId,
          email: data.email,
          phone: data.phone,
          entryDate: data.entryDate,
          isRetired: data.isRetired,
          isActive: data.isActive,
          retiredAt: data.retiredAt,
        },
        select: this.employeeSelect,
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

  async findAnyById(id: string) {
    return this.prisma.employee.findFirst({
      where: { id, tenant: { isActive: true } },
      select: this.employeeSelect,
    });
  }

  async findAll() {
    return this.prisma.employee.findMany({
      where: { tenant: { isActive: true }, deletedAt: null },
      select: this.employeeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithRefsById(id: string) {
    return this.prisma.employee.findFirst({
      where: { id, tenant: { isActive: true } },
      select: this.employeeSelect,
    });
  }

  async findActiveByDocument(document: string) {
    return await this.prisma.employee.findFirst({
      where: {
        document,
        isActive: true,
        tenant: { isActive: true },
      },
      select: this.employeeSelect,
    });
  }

  async updateEmployee(id: string, data: Prisma.EmployeeUpdateInput) {
    try {
      const res = await this.prisma.employee.updateMany({
        where: { id },
        data,
      });

      if (res.count === 0) throw new NotFoundException('Employee not found.');

      const updated = await this.prisma.employee.findFirst({
        where: { id },
        select: this.employeeSelect,
      });

      if (!updated)
        throw new NotFoundException('Employee not found after update.');

      return updated;
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

  async softDeleteEmployee(id: string) {
    const res = await this.prisma.employee.updateMany({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    if (res.count === 0) throw new NotFoundException('Employee not found.');

    const findDeleted = await this.prisma.employee.findFirst({
      where: { id },
      select: this.deletedEmployeeSelect,
    });

    if (!findDeleted)
      throw new NotFoundException('Employee not found after delete.');

    return findDeleted;
  }

  async retireEmployee(id: string) {
    const res = await this.prisma.employee.updateMany({
      where: { id },
      data: {
        isRetired: true,
        retiredAt: new Date(),
        isActive: false,
      },
    });

    if (res.count === 0) throw new NotFoundException('Employee not found.');

    return this.prisma.employee.findFirst({
      where: { id },
      select: this.employeeSelect,
    });
  }
}
