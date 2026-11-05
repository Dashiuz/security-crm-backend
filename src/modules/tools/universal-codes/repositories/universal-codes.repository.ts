import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  Prisma,
  UniversalCode,
  CodeType,
  CodePurpose,
  CodeStatus,
} from '@prisma/client';

export interface FindAllUniversalCodesParams {
  search?: string;
  codeType?: CodeType;
  purpose?: CodePurpose;
  status?: CodeStatus;
  clientId?: string;
  batchId?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class UniversalCodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(
    tenantId: string,
    params: FindAllUniversalCodesParams,
  ): Prisma.UniversalCodeWhereInput {
    const where: Prisma.UniversalCodeWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (params.codeType) {
      where.codeType = params.codeType;
    }

    if (params.purpose) {
      where.purpose = params.purpose;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.clientId) {
      where.clientId = params.clientId;
    }

    if (params.batchId) {
      where.batchId = params.batchId;
    }

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { department: { contains: term, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async create(
    data: Prisma.UniversalCodeUncheckedCreateInput,
  ): Promise<UniversalCode> {
    return this.prisma.universalCode.create({
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        updatedBy: {
          select: { id: true, fullName: true, document: true },
        },
        client: {
          select: { id: true, name: true, internalCode: true },
        },
      },
    });
  }

  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<UniversalCode | null> {
    return this.prisma.universalCode.findFirst({
      where: {
        tenantId,
        code,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        updatedBy: {
          select: { id: true, fullName: true, document: true },
        },
        client: {
          select: { id: true, name: true, internalCode: true },
        },
      },
    });
  }

  async findByCodePublic(code: string): Promise<UniversalCode | null> {
    return this.prisma.universalCode.findFirst({
      where: {
        code,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        updatedBy: {
          select: { id: true, fullName: true, document: true },
        },
        client: {
          select: { id: true, name: true, internalCode: true },
        },
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<UniversalCode | null> {
    return this.prisma.universalCode.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        updatedBy: {
          select: { id: true, fullName: true, document: true },
        },
        client: {
          select: { id: true, name: true, internalCode: true },
        },
      },
    });
  }

  async findAll(
    tenantId: string,
    params: FindAllUniversalCodesParams,
  ): Promise<UniversalCode[]> {
    const where = this.buildWhere(tenantId, params);
    return this.prisma.universalCode.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        updatedBy: {
          select: { id: true, fullName: true, document: true },
        },
        client: {
          select: { id: true, name: true, internalCode: true },
        },
      },
    });
  }

  async count(
    tenantId: string,
    params: FindAllUniversalCodesParams,
  ): Promise<number> {
    const where = this.buildWhere(tenantId, params);
    return this.prisma.universalCode.count({ where });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.UniversalCodeUncheckedUpdateInput,
  ): Promise<UniversalCode> {
    return this.prisma.universalCode.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        updatedBy: {
          select: { id: true, fullName: true, document: true },
        },
        client: {
          select: { id: true, name: true, internalCode: true },
        },
      },
    });
  }

  async softDelete(tenantId: string, id: string): Promise<UniversalCode> {
    return this.prisma.universalCode.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createBatch(
    items: Prisma.UniversalCodeUncheckedCreateInput[],
  ): Promise<UniversalCode[]> {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.universalCode.create({
          data: item,
          include: {
            createdBy: {
              select: { id: true, fullName: true, document: true },
            },
            updatedBy: {
              select: { id: true, fullName: true, document: true },
            },
            client: {
              select: { id: true, name: true, internalCode: true },
            },
          },
        }),
      ),
    );
  }

  async batchUpdate(
    tenantId: string,
    updates: Array<{
      id: string;
      data: Prisma.UniversalCodeUncheckedUpdateInput;
    }>,
  ): Promise<UniversalCode[]> {
    return this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.universalCode.update({
          where: { id: u.id },
          data: u.data,
          include: {
            createdBy: {
              select: { id: true, fullName: true, document: true },
            },
            updatedBy: {
              select: { id: true, fullName: true, document: true },
            },
            client: {
              select: { id: true, name: true, internalCode: true },
            },
          },
        }),
      ),
    );
  }

  async findBatches(tenantId: string): Promise<
    Array<{
      batchId: string;
      count: number;
      purpose: CodePurpose;
      codeType: CodeType;
      department: string | null;
      createdAt: Date;
    }>
  > {
    const items = await this.prisma.universalCode.findMany({
      where: {
        tenantId,
        batchId: { not: null },
        deletedAt: null,
      },
      select: {
        batchId: true,
        purpose: true,
        codeType: true,
        department: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const batchMap = new Map<
      string,
      {
        batchId: string;
        count: number;
        purpose: CodePurpose;
        codeType: CodeType;
        department: string | null;
        createdAt: Date;
      }
    >();

    for (const item of items) {
      if (!item.batchId) continue;
      const existing = batchMap.get(item.batchId);
      if (existing) {
        existing.count += 1;
      } else {
        batchMap.set(item.batchId, {
          batchId: item.batchId,
          count: 1,
          purpose: item.purpose,
          codeType: item.codeType,
          department: item.department,
          createdAt: item.createdAt,
        });
      }
    }

    return Array.from(batchMap.values());
  }

  async getStats(tenantId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    batchesCount: number;
  }> {
    const [total, active, inactive, batches] = await this.prisma.$transaction([
      this.prisma.universalCode.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.universalCode.count({
        where: { tenantId, status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.universalCode.count({
        where: {
          tenantId,
          status: { in: ['INACTIVE', 'REVOKED'] },
          deletedAt: null,
        },
      }),
      this.prisma.universalCode.groupBy({
        by: ['batchId'],
        where: {
          tenantId,
          batchId: { not: null },
          deletedAt: null,
        },
        orderBy: {
          batchId: 'asc',
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      batchesCount: batches.length,
    };
  }
}
