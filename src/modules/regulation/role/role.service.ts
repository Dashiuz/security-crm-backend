import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RoleRepositoryService } from '../../../common/repository/index';
import {
  CreateRoleDto,
  UpdateRoleDto,
  PatchRolePermissionsDto,
  RoleResponseDto,
} from './dtos/index';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepositoryService) {}

  private mapRoleToResponse(row: any): RoleResponseDto {
    return {
      id: row.id,
      name: row.name,
      tenantId: row.tenantId,
      permissions:
        row.perms?.map((p: any) => ({
          key: p.permission.key,
          desc: p.permission.desc,
        })) ?? [],
    };
  }

  async create(tenantId: string, dto: CreateRoleDto): Promise<RoleResponseDto> {
    const name = dto.name.trim();

    if (!name) throw new BadRequestException('Role name is required');

    try {
      // tenantId is now automatically handled by the repository extension
      const row = await this.roleRepository.createRole(name);
      return this.mapRoleToResponse(row);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          `Role with name "${name}" already exists for this tenant`,
        );
      }
      throw e;
    }
  }

  async list(tenantId: string): Promise<RoleResponseDto[]> {
    const rows = await this.roleRepository.listRoles();
    return rows.map((r) => this.mapRoleToResponse(r));
  }

  async findOne(tenantId: string, roleId: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findRoleById(roleId);
    if (!role) throw new NotFoundException('Role not found');
    return this.mapRoleToResponse(role);
  }

  async update(
    tenantId: string,
    roleId: string,
    dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findRoleId(roleId);
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name) {
      const name = dto.name.trim();
      try {
        const updated = await this.roleRepository.updateRole(roleId, name);
        return this.mapRoleToResponse(updated);
      } catch (e: any) {
        if (e?.code === 'P2002') {
          throw new BadRequestException(
            `Role with name "${name}" already exists for this tenant`,
          );
        }
        throw e;
      }
    }
    return this.findOne(tenantId, roleId);
  }

  async remove(tenantId: string, roleId: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findRoleId(roleId);
    if (!role) throw new NotFoundException('Role not found');

    try {
      const deleted = await this.roleRepository.deleteRole(roleId);
      return this.mapRoleToResponse(deleted);
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete role as it is assigned to users or has permissions',
        );
      }
      throw e;
    }
  }

  async patchPermissions(
    tenantId: string,
    roleId: string,
    dto: PatchRolePermissionsDto,
  ): Promise<any> {
    const role = await this.roleRepository.findRoleId(roleId);

    if (!role) throw new NotFoundException('Role not found');

    const addKeys = (dto.add ?? []).map((s) => s.trim()).filter(Boolean);
    const removeKeys = (dto.remove ?? []).map((s) => s.trim()).filter(Boolean);
    const syncKeys = (dto.keys ?? []).map((s) => s.trim()).filter(Boolean);

    if (addKeys.length === 0 && removeKeys.length === 0 && !dto.keys) {
      throw new BadRequestException('Provide add, remove or keys');
    }

    // 1) Resolve permission IDs by keys
    const allInputKeys = Array.from(
      new Set([...addKeys, ...removeKeys, ...syncKeys]),
    );
    const perms =
      await this.roleRepository.findPermissionIdByKeys(allInputKeys);
    const byKey = new Map(perms.map((p) => [p.key, p.id]));
    const missing = allInputKeys.filter((k) => !byKey.has(k));

    if (missing.length) {
      throw new BadRequestException(
        `Unknown permission keys: ${missing.join(', ')}`,
      );
    }

    // 2) Full Sync Mode
    if (dto.keys) {
      const currentState = await this.roleRepository.getCurrentState(roleId);
      const currentKeys =
        currentState?.perms.map((p) => p.permission.key) ?? [];

      const toAdd = syncKeys.filter((k) => !currentKeys.includes(k));
      const toRemove = currentKeys.filter((k) => !syncKeys.includes(k));

      if (toRemove.length > 0) {
        await this.roleRepository.removeRolePermissions(
          roleId,
          toRemove,
          byKey,
        );
      }
      if (toAdd.length > 0) {
        await this.roleRepository.createRolePermissions(roleId, toAdd, byKey);
      }
    } else {
      // 3) Incremental Mode (add/remove)
      if (removeKeys.length) {
        await this.roleRepository.removeRolePermissions(
          roleId,
          removeKeys,
          byKey,
        );
      }
      if (addKeys.length) {
        await this.roleRepository.createRolePermissions(roleId, addKeys, byKey);
      }
    }

    // 4) Return current state
    const updated = await this.roleRepository.getCurrentState(roleId);

    return {
      roleId,
      permissions: updated?.perms.map((p) => p.permission.key) ?? [],
    };
  }
}
