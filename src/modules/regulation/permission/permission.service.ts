import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PermissionRepositoryService } from '../../../common/repository/index';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from './dtos/index';

@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly permissionRepository: PermissionRepositoryService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.syncDefaultPermissions();
  }

  async syncDefaultPermissions() {
    const defaultPermissions = [
      { key: 'resident:read', desc: 'Read resident records and unit assignments' },
      { key: 'resident:create', desc: 'Create resident records and unit assignments' },
      { key: 'resident:update', desc: 'Update resident records and unit assignments' },
      { key: 'resident:delete', desc: 'Soft delete or unassign resident records' },
      { key: 'resident:manage', desc: 'Manage all resident operations' },
    ];

    try {
      for (const p of defaultPermissions) {
        const permRecord = await this.prisma.permission.upsert({
          where: { key: p.key },
          update: { desc: p.desc },
          create: p,
        });

        // Link to ADMIN and GODLIKE roles across all tenants
        const adminAndGodlikeRoles = await this.prisma.role.findMany({
          where: {
            name: { in: ['ADMIN', 'GODLIKE'] },
          },
        });

        for (const role of adminAndGodlikeRoles) {
          await this.prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permRecord.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permRecord.id,
              assignedBy: 'system',
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Permission sync error: ${err.message}`);
    }
  }

  async list(): Promise<PermissionResponseDto[]> {
    await this.syncDefaultPermissions();
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
