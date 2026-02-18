import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Position } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PositionRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PositionCreateInput): Promise<Position> {
    return (this.prisma.position as any).create({ data });
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
    return this.prisma.position.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Position> {
    return this.prisma.position.delete({ where: { id } });
  }
}
