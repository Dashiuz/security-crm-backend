import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RoleRepositoryService } from '../../../common/repository/index';
import { CreateRoleDto } from './dtos/create-role.dto';
import { PatchRolePermissionsDto } from './dtos/patch-role-permissions.dto';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepositoryService) {}

  async create(tenantId: string, dto: CreateRoleDto) {
    const name = dto.name.trim();

    if (!name) throw new BadRequestException('Role name is required');

    return await this.roleRepository.createRole(tenantId, name);
  }

  async list(tenantId: string) {
    return await this.roleRepository.listRoles(tenantId);
  }

  async patchPermissions(
    tenantId: string,
    roleId: string,
    dto: PatchRolePermissionsDto,
  ) {
    const role = await this.roleRepository.findRoleId(tenantId, roleId);

    if (!role) throw new NotFoundException('Role not found');

    const addKeys = (dto.add ?? []).map((s) => s.trim()).filter(Boolean);
    const removeKeys = (dto.remove ?? []).map((s) => s.trim()).filter(Boolean);

    if (addKeys.length === 0 && removeKeys.length === 0) {
      throw new BadRequestException('Provide add and/or remove');
    }

    // 1) Resolve permission IDs by keys
    const keys = Array.from(new Set([...addKeys, ...removeKeys]));
    const perms = await this.roleRepository.findPermissionIdByKeys(keys);
    const byKey = new Map(perms.map((p) => [p.key, p.id]));
    const missing = keys.filter((k) => !byKey.has(k));

    if (missing.length) {
      throw new BadRequestException(
        `Unknown permission keys: ${missing.join(', ')}`,
      );
    }

    // 2) Apply removals
    if (removeKeys.length) {
      await this.roleRepository.removeRolePermissions(
        roleId,
        removeKeys,
        byKey,
      );
    }

    // 3) Apply adds (idempotente con skipDuplicates si tienes @@id([roleId, permissionId]))
    if (addKeys.length) {
      await this.roleRepository.createRolePermissions(roleId, addKeys, byKey);
    }

    // 4) Return current state
    const updated = await this.roleRepository.getCurrentState(tenantId, roleId);

    return {
      roleId,
      permissions: updated?.perms.map((p) => p.permission.key) ?? [],
    };
  }
}
