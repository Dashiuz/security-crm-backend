import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RoleRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(tenantId: string, name: string): Promise<Role> {
    return this.prisma.role.create({
      data: { tenantId, name },
      select: { id: true, tenantId: true, name: true },
    });
  }

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        perms: {
          select: { permission: { select: { key: true } } },
        },
      },
    });
  }

  async findRoleId(tenantId: string, roleId: string) {
    return this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      select: { id: true },
    });
  }

  async findPermissionIdByKeys(keys: string[]) {
    return this.prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true },
    });
  }

  async createRolePermissions(
    roleId: string,
    addKeys: string[],
    byKey: Map<string, string>,
  ) {
    return await this.prisma.rolePermission.createMany({
      data: addKeys.map((k) => ({ roleId, permissionId: byKey.get(k)! })),
      skipDuplicates: true,
    });
  }

  async removeRolePermissions(
    roleId: string,
    removeKeys: string[],
    byKey: Map<string, string>,
  ) {
    return this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { in: removeKeys.map((k) => byKey.get(k)!) },
      },
    });
  }

  async getCurrentState(tenantId: string, roleId: string) {
    return await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      select: {
        id: true,
        name: true,
        perms: { select: { permission: { select: { key: true } } } },
      },
    });
  }
}
