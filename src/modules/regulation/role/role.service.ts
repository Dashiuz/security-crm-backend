import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RoleRepositoryService, UserRepositoryService } from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  PatchRolePermissionsDto,
  RoleResponseDto,
} from './dtos/index';

@Injectable()
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepositoryService,
    private readonly userRepository: UserRepositoryService,
    private readonly contextService: RequestContextService,
  ) {}

  private mapRoleToResponse(row: any, userName?: string): any {
    return {
      id: row.id,
      name: row.name,
      tenantId: row.tenantId,
      createdAt: row.createdAt,
      createdBy: userName || (row.createdBy === 'system' ? 'Sistema' : row.createdBy || 'Sistema'),
      permissions:
        row.perms?.map((p: any) => ({
          key: p.permission.key,
          desc: p.permission.desc,
        })) ?? [],
    };
  }

  async create(tenantId: string, dto: CreateRoleDto): Promise<RoleResponseDto> {
    const name = dto.name.trim().toUpperCase();

    if (!name) throw new BadRequestException('Role name is required');

    if (['GODLIKE', 'SUPERADMIN'].includes(name) && (!this.contextService.isGodlike || tenantId !== 'system')) {
      throw new ForbiddenException(
        'El nombre de rol GODLIKE o SUPERADMIN está reservado exclusivamente para el sistema.',
      );
    }

    try {
      // tenantId is now automatically handled by the repository extension
      const row = await this.roleRepository.createRole(name);
      return this.mapRoleToResponse(row);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          `Ya existe un rol registrado con el nombre "${name}" en la empresa.`,
        );
      }
      throw e;
    }
  }

  async list(tenantId: string): Promise<any[]> {
    const rows = await this.roleRepository.listRoles(tenantId);
    const createdByIds = rows.map((r: any) => r.createdBy).filter((id): id is string => Boolean(id));
    const userMap = await this.userRepository.findNamesByIds(createdByIds);

    return rows.map((r) =>
      this.mapRoleToResponse(
        r,
        r.createdBy === 'system' ? 'Sistema' : (r.createdBy ? userMap.get(r.createdBy) : undefined),
      ),
    );
  }

  async findOne(tenantId: string, roleId: string): Promise<RoleResponseDto> {
    const row = await this.roleRepository.findRoleById(roleId);
    if (!row) throw new NotFoundException('Role not found');
    return this.mapRoleToResponse(row);
  }

  async update(
    tenantId: string,
    roleId: string,
    dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findRoleId(roleId);
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name) {
      const name = dto.name.trim().toUpperCase();
      if (['GODLIKE', 'SUPERADMIN'].includes(name) && (!this.contextService.isGodlike || tenantId !== 'system')) {
        throw new ForbiddenException(
          'El nombre de rol GODLIKE o SUPERADMIN está reservado exclusivamente para el sistema.',
        );
      }
      try {
        const updated = await this.roleRepository.updateRole(roleId, name);
        return this.mapRoleToResponse(updated);
      } catch (e: any) {
        if (e?.code === 'P2002') {
          throw new ConflictException(
            `Ya existe un rol registrado con el nombre "${name}" en la empresa.`,
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

    if (role.name === 'GODLIKE' || role.tenantId === 'system') {
      throw new ForbiddenException('No es posible eliminar roles reservados del sistema.');
    }

    try {
      const deleted = await this.roleRepository.deleteRole(roleId);
      return this.mapRoleToResponse(deleted);
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new BadRequestException(
          'No es posible eliminar el rol porque se encuentra asignado a uno o más usuarios.',
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

    // Security check: Verify that non-godlike users / non-system roles cannot be granted godlike permissions
    const requestedGodlikeKeys = [...addKeys, ...syncKeys].filter((k) => k.startsWith('godlike:'));
    if (requestedGodlikeKeys.length > 0) {
      if (!this.contextService.isGodlike || role.tenantId !== 'system') {
        throw new ForbiddenException(
          'No tienes autorización para asignar o manipular permisos reservados de nivel Godlike/SuperAdmin.',
        );
      }
    }

    const currentState = await this.roleRepository.getCurrentState(roleId);
    const currentKeys = currentState?.perms.map((p) => p.permission.key) ?? [];

    // 1) Resolve permission IDs by keys
    const allInputKeys = Array.from(
      new Set([...addKeys, ...removeKeys, ...syncKeys, ...currentKeys]),
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
