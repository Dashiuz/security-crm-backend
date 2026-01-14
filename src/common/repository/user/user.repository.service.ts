import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UserRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        ...data,
      },
    });

    return user;
  }

  async findEmployeeByDocument(document: string) {
    return await this.prisma.employee.findFirst({
      where: { document, isActive: true, tenant: { isActive: true } },
      select: {
        id: true,
        tenantId: true,
      },
    });
  }

  async findActiveByDocument(document: string) {
    return await this.prisma.user.findFirst({
      where: { document, isActive: true, tenant: { isActive: true } },
      select: {
        id: true,
        tenantId: true,
        fullName: true,
        document: true,
        department: true,
        position: true,
        passwordHash: true,
        isActive: true,
      },
    });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            perms: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });

    const keys = rows.flatMap((r) => r.role.perms.map((p) => p.permission.key));
    return Array.from(new Set(keys));
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        tenantId: true,
        isActive: true,
        tenant: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });
  }
}
