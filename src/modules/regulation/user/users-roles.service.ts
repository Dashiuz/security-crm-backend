import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PatchUserRolesDto } from './dtos/patch-user-roles.dto';

@Injectable()
export class UsersRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async patchUserRoles(
    tenantId: string,
    userId: string,
    dto: PatchUserRolesDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found in this tenant');

    const add = (dto.addRoleIds ?? []).map((s) => s.trim()).filter(Boolean);
    const remove = (dto.removeRoleIds ?? [])
      .map((s) => s.trim())
      .filter(Boolean);

    if (add.length === 0 && remove.length === 0) {
      throw new BadRequestException('Provide addRoleIds and/or removeRoleIds');
    }

    // Validar que los roleIds pertenecen al tenant
    const roleIds = Array.from(new Set([...add, ...remove]));
    if (roleIds.length) {
      const roles = await this.prisma.role.findMany({
        where: { id: { in: roleIds }, tenantId },
        select: { id: true },
      });
      const okIds = new Set(roles.map((r) => r.id));
      const missing = roleIds.filter((id) => !okIds.has(id));
      if (missing.length)
        throw new BadRequestException(
          `Roles not in tenant: ${missing.join(', ')}`,
        );
    }

    if (remove.length) {
      await this.prisma.userRole.deleteMany({
        where: { userId, roleId: { in: remove } },
      });
    }

    if (add.length) {
      await this.prisma.userRole.createMany({
        data: add.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
      });
    }

    // devolver roles actuales
    const current = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { id: true, name: true } } },
    });

    return {
      userId,
      roles: current.map((r) => r.role),
    };
  }
}
