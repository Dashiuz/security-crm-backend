import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepositoryService } from '../../../common/repository/index';
import { PatchUserRolesDto } from './dtos/patch-user-roles.dto';

@Injectable()
export class UsersRolesService {
  constructor(private readonly userRepository: UserRepositoryService) {}

  async patchUserRoles(
    tenantId: string,
    userId: string,
    dto: PatchUserRolesDto,
  ): Promise<any> {
    const user = await this.userRepository.findUserInTenant(userId, tenantId);

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
      const roles = await this.userRepository.validateRolesInTenant(
        roleIds,
        tenantId,
      );
      const okIds = new Set(roles.map((r) => r.id));
      const missing = roleIds.filter((id) => !okIds.has(id));
      if (missing.length)
        throw new BadRequestException(
          `Roles not in tenant: ${missing.join(', ')}`,
        );
    }

    if (remove.length) {
      await this.userRepository.deleteUserRoles(userId, remove);
    }

    if (add.length) {
      await this.userRepository.addUserRoles(userId, add);
    }

    // devolver roles actuales
    const current = await this.userRepository.getUserRolesDetailed(userId);

    return {
      userId,
      roles: current.map((r) => r.role),
    };
  }
}
