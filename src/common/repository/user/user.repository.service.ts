import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionObjectInterface } from '../../../common/interfaces/index';

@Injectable()
export class UserRepositoryService {
  constructor(private readonly prisma: PrismaService) { }

  // tenant table operation
  async checkTenantActive(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, isActive: true },
      select: { id: true },
    });

    return tenant;
  }

  async findNamesByIds(ids: string[]): Promise<Map<string, string>> {
    const validIds = ids.filter((id) => id && id !== 'system');
    if (validIds.length === 0) return new Map();

    const users = await this.prisma.user.findMany({
      where: { id: { in: validIds } },
      select: { id: true, fullName: true },
    });

    return new Map(users.map((u) => [u.id, u.fullName]));
  }

  // ##### USER DATA OPERATIONS ##### //
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const user = await (this.prisma.user as any).create({
      data: {
        ...data,
      },
    });

    return user;
  }

  async findActiveByDocument(document: string) {
    return await this.prisma.user.findFirst({
      where: { document, isActive: true, tenant: { isActive: true } },
      select: {
        id: true,
        tenantId: true,
        clientId: true,
        fullName: true,
        document: true,
        department: true,
        position: true,
        passwordHash: true,
        isActive: true,
      },
    });
  }

  async findByDocument(document: string) {
    return await this.prisma.user.findFirst({
      where: { document },
      include: {
        roles: {
          select: { role: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async findAll(tenantId: string) {
    return await (this.prisma.user as any).findMany({
      where: { tenantId, isActive: true, tenant: { isActive: true } },
      select: {
        id: true,
        tenantId: true,
        clientId: true,
        fullName: true,
        document: true,
        department: true,
        position: true,
        isActive: true,
        isFirstLogin: true,
        client: {
          select: {
            id: true,
            name: true,
            internalCode: true,
          },
        },
        roles: {
          select: {
            role: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getMe(userId: string, targetTenantId?: string) {
    const user = await (this.prisma.user as any).findUnique({
      bypassTenant: true,
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        tenantId: true,
        clientId: true,
        isActive: true,
        client: {
          select: {
            id: true,
            name: true,
            internalCode: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            features: { select: { key: true } },
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            sidebarColor: true,
          },
        },
      },
    });

    if (!user) return null;

    if (targetTenantId && targetTenantId !== user.tenantId) {
      const overrideTenant = await this.prisma.tenant.findUnique({
        where: { id: targetTenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          features: { select: { key: true } },
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          sidebarColor: true,
        },
      });
      if (overrideTenant) {
        user.tenant = overrideTenant as any;
      }
    }

    const { features, ...tenantData } = user.tenant;

    return {
      ...user,
      tenant: {
        ...tenantData,
        enabledFeatures: features.map((f) => f.key),
      },
    };
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

  // ##### USER SESSION OPERATIONS ##### //
  async createUserSession(sessionData: SessionObjectInterface) {
    return await (this.prisma.userSession as any).create({
      data: sessionData,
      select: { id: true },
    });
  }

  async updateUserSessionTokenHash(
    sessionId: string,
    refreshTokenHash: string,
  ) {
    return await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { refreshTokenHash },
    });
  }

  async updateUserPassword(userId: string, newPasswordHash: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  async adminResetPassword(userId: string, newPasswordHash: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        isFirstLogin: true,
      },
    });
  }

  async findUserSession(sessionId: string) {
    return await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        refreshTokenHash: true,
        impersonatedTenantId: true,
        user: {
          select: {
            id: true,
            tenantId: true,
            clientId: true,
            isActive: true,
            tenant: { select: { isActive: true } },
          },
        },
      },
    });
  }

  async refreshUserSession(sessionId: string, newSessionId: string) {
    return await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), replacedById: newSessionId },
    });
  }

  async revokeSession(sessionId: string) {
    return await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async tokenThiefRevokeSession(sessionId: string) {
    return await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.name);
  }

  async revokeAllSessionsForUser(userId: string) {
    return await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ##### USER ROLE OPERATIONS ##### //

  async getTenantFeatures(tenantId: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { features: { select: { key: true } } },
    });
    return tenant?.features.map((f) => f.key) ?? [];
  }

  async findUserInTenant(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true },
    });
  }

  async validateRolesInTenant(roleIds: string[]) {
    return this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
  }

  async deleteUserRoles(userId: string, roleIds: string[]) {
    return this.prisma.userRole.deleteMany({
      where: { userId, roleId: { in: roleIds } },
    });
  }

  async addUserRoles(userId: string, roleIds: string[]) {
    return this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  async getUserRolesDetailed(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: { select: { id: true, name: true } },
      },
    });
  }
  async updateUser(userId: string, data: Partial<Prisma.UserUpdateInput>) {
    return await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async softDeleteUser(userId: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async reactivateUser(userId: string, data: Partial<Prisma.UserUpdateInput>) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        isActive: true,
        isFirstLogin: true,
      },
    });
  }
}
