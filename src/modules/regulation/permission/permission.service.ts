import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionRepositoryService } from '../../../common/repository/index';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from './dtos/index';

@Injectable()
export class PermissionService {
  constructor(
    private readonly permissionRepository: PermissionRepositoryService,
  ) {}

  async list(): Promise<PermissionResponseDto[]> {
    return await this.permissionRepository.listPermissions();
  }

  async create(dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    try {
      return await this.permissionRepository.createPermission(dto);
    } catch (e: any) {
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
    try {
      const permission = await this.permissionRepository.findPermissionById(id);
      if (!permission) throw new NotFoundException('Permission not found');

      return await this.permissionRepository.updatePermission(id, dto);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          `Permission with key "${dto.key}" already exists`,
        );
      }
      throw e;
    }
  }

  async remove(id: string): Promise<PermissionResponseDto> {
    try {
      const permission = await this.permissionRepository.findPermissionById(id);
      if (!permission) throw new NotFoundException('Permission not found');

      return await this.permissionRepository.deletePermission(id);
    } catch (e: any) {
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
    return permission;
  }
}
