import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Department } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DepartmentRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DepartmentCreateInput): Promise<Department> {
    try {
      return await (this.prisma.department as any).create({ data });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un departamento registrado con este nombre en la empresa.',
        );
      }
      throw e;
    }
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
    try {
      return await this.prisma.department.update({ where: { id }, data });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un departamento registrado con este nombre en la empresa.',
        );
      }
      throw e;
    }
  }

  async remove(id: string): Promise<Department> {
    try {
      return await this.prisma.department.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new BadRequestException(
          'No es posible eliminar el departamento porque existen empleados vinculados al mismo.',
        );
      }
      throw e;
    }
  }
}
