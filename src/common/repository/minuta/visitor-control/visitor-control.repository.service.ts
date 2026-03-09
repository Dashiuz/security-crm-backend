import { Injectable } from '@nestjs/common';
import { Prisma, VisitorEntryControl } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class VisitorControlRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.VisitorEntryControlCreateInput,
  ): Promise<VisitorEntryControl> {
    return this.prisma.visitorEntryControl.create({ data });
  }

  async findMany(
    where?: Prisma.VisitorEntryControlWhereInput,
  ): Promise<VisitorEntryControl[]> {
    return this.prisma.visitorEntryControl.findMany({ where });
  }

  async findUnique(
    where: Prisma.VisitorEntryControlWhereUniqueInput,
  ): Promise<VisitorEntryControl | null> {
    return this.prisma.visitorEntryControl.findUnique({ where });
  }

  async update(
    where: Prisma.VisitorEntryControlWhereUniqueInput,
    data: Prisma.VisitorEntryControlUpdateInput,
  ): Promise<VisitorEntryControl> {
    return this.prisma.visitorEntryControl.update({ where, data });
  }

  async delete(
    where: Prisma.VisitorEntryControlWhereUniqueInput,
  ): Promise<VisitorEntryControl> {
    return this.prisma.visitorEntryControl.delete({ where });
  }
}
