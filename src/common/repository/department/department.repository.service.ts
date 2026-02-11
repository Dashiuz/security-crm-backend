import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Department } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DepartmentRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DepartmentCreateInput): Promise<Department> {
    return (this.prisma.department as any).create({ data });
  }

  async findMany(): Promise<Department[]> {
    return this.prisma.department.findMany();
  }

  async findOne(id: string): Promise<Department | null> {
    return this.prisma.department.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.DepartmentUpdateInput,
  ): Promise<Department> {
    return this.prisma.department.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Department> {
    return this.prisma.department.delete({ where: { id } });
  }
}
