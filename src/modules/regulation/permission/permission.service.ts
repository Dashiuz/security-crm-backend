import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PermissionRepositoryService } from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from './dtos/index';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly permissionRepository: PermissionRepositoryService,
    private readonly contextService: RequestContextService,
  ) {}

  async list(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.listPermissions();
    if (this.contextService.isGodlike) {
      return permissions;
    }
    // Filter out any godlike:* permissions for non-godlike users
    return permissions.filter((p) => !p.key.startsWith('godlike:'));
  }

  async create(dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    if (dto.key.startsWith('godlike:') && !this.contextService.isGodlike) {
      throw new ForbiddenException(
        'No tienes autorización para crear permisos reservados de nivel Godlike/SuperAdmin.',
      );
    }
    try {
      return await this.permissionRepository.createPermission(dto);
    } catch (e: any) {
      this.logger.error(
        `Error al crear permiso [${dto.key}]: ${e?.message || e}`,
        e?.stack,
      );
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          `Permission with key "${dto.key}" already exists`,
        );
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findPermissionById(id);
    if (!permission) throw new NotFoundException('Permission not found');

    if (
      (permission.key.startsWith('godlike:') ||
        dto.key?.startsWith('godlike:')) &&
      !this.contextService.isGodlike
    ) {
      throw new ForbiddenException(
        'No tienes autorización para modificar permisos reservados de nivel Godlike/SuperAdmin.',
      );
    }

    try {
      return await this.permissionRepository.updatePermission(id, dto);
    } catch (e: any) {
      this.logger.error(
        `Error al actualizar permiso [${id}]: ${e?.message || e}`,
        e?.stack,
      );
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          `Permission with key "${dto.key}" already exists`,
        );
      }
      throw e;
    }
  }

  async remove(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findPermissionById(id);
    if (!permission) throw new NotFoundException('Permission not found');

    if (
      permission.key.startsWith('godlike:') &&
      !this.contextService.isGodlike
    ) {
      throw new ForbiddenException(
        'No tienes autorización para eliminar permisos reservados de nivel Godlike/SuperAdmin.',
      );
    }

    try {
      return await this.permissionRepository.deletePermission(id);
    } catch (e: any) {
      this.logger.error(
        `Error al eliminar permiso [${id}]: ${e?.message || e}`,
        e?.stack,
      );
      // Prisma error for foreign key violation
      if (e?.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete permission as it is assigned to roles',
        );
      }
      throw e;
    }
  }

  async findOne(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findPermissionById(id);
    if (!permission) throw new NotFoundException('Permission not found');

    if (
      permission.key.startsWith('godlike:') &&
      !this.contextService.isGodlike
    ) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }
}
