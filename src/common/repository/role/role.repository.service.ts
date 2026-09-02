import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RoleRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(name: string): Promise<Role> {
    return (this.prisma.role as any).create({
      data: { name },
    });
  }

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        createdBy: true,
        perms: {
          select: { permission: { select: { key: true } } },
        },
      },
    });
  }

  async findRoleId(roleId: string) {
    return this.prisma.role.findFirst({
      where: { id: roleId },
      select: { id: true, name: true, tenantId: true },
    });
  }

  async findRoleById(roleId: string) {
    return this.prisma.role.findFirst({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        perms: {
          select: {
            permission: { select: { id: true, key: true, desc: true } },
          },
        },
      },
    });
  }

  async updateRole(roleId: string, name: string): Promise<Role> {
    return (this.prisma.role as any).update({
      where: { id: roleId },
      data: { name },
    });
  }

  async deleteRole(roleId: string): Promise<Role> {
    return this.prisma.role.delete({
      where: { id: roleId },
    });
  }

  async getCurrentState(roleId: string) {
    return await this.prisma.role.findFirst({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        perms: { select: { permission: { select: { key: true } } } },
      },
    });
  }

  // ##### ROLE PERMISSION OPERATIONS ##### //

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
    const ids = addKeys
      .map((k) => byKey.get(k))
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return { count: 0 };

    return await this.prisma.rolePermission.createMany({
      data: ids.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }

  async removeRolePermissions(
    roleId: string,
    removeKeys: string[],
    byKey: Map<string, string>,
  ) {
    const ids = removeKeys
      .map((k) => byKey.get(k))
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return { count: 0 };

    return this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { in: ids },
      },
    });
  }
}
