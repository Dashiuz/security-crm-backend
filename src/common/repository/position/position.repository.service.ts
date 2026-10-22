import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, Position } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PositionRepositoryService {
  private readonly logger = new Logger(PositionRepositoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PositionCreateInput): Promise<Position> {
    try {
      return await (this.prisma.position as any).create({ data });
    } catch (e: any) {
      this.logger.error(
        `Error al crear cargo/posición: ${e?.message || e}`,
        e?.stack,
      );
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un cargo/posición registrado con este nombre en la empresa.',
        );
      }
      throw e;
    }
  }

  async findMany(): Promise<Position[]> {
    return this.prisma.position.findMany();
  }

  async findOne(id: string): Promise<Position | null> {
    return this.prisma.position.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.PositionUpdateInput,
  ): Promise<Position> {
    try {
      return await this.prisma.position.update({ where: { id }, data });
    } catch (e: any) {
      this.logger.error(
        `Error al actualizar cargo/posición [${id}]: ${e?.message || e}`,
        e?.stack,
      );
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un cargo/posición registrado con este nombre en la empresa.',
        );
      }
      throw e;
    }
  }

  async remove(id: string): Promise<Position> {
    try {
      return await this.prisma.position.delete({ where: { id } });
    } catch (e: any) {
      this.logger.error(
        `Error al eliminar cargo/posición [${id}]: ${e?.message || e}`,
        e?.stack,
      );
      if (e?.code === 'P2003') {
        throw new BadRequestException(
          'No es posible eliminar el cargo porque existen empleados vinculados al mismo.',
        );
      }
      throw e;
    }
  }
}
