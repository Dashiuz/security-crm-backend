import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  UserRepositoryService,
  EmployeeRepositoryService,
  RoleRepositoryService,
} from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';
import { CreateUserDto, UserResponseDto } from './dtos/index';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepositoryService,
    private readonly employeeRepository: EmployeeRepositoryService,
    private readonly roleRepository: RoleRepositoryService,
    private readonly contextService: RequestContextService,
  ) {}

  private mapUserToResponse(row: any): UserResponseDto {
    return {
      id: row.id,
      fullName: row.fullName,
      document: row.document,
      department: row.department,
      position: row.position,
      tenantId: row.tenantId,
      clientId: row.clientId ?? null,
      clientName: row.client?.name ?? null,
      isActive: row.isActive,
      isFirstLogin: row.isFirstLogin ?? false,
      roles: (row.roles || [])
        .filter((ur: any) => ur.role)
        .map((ur: any) => ({
          id: ur.role.id,
          name: ur.role.name,
        })),
      userType: row.userType,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    // Optional: basic validation
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const hash = await argon2.hash(password, {
      type: argon2.argon2id, // Recommended variant
      memoryCost: 19456, // ~19 MB (tune for your server)
      timeCost: 2, // iterations
      parallelism: 1, // threads
    });

    return hash; // store this in DB as passwordHash
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const isSystemTenant = this.contextService.tenantId === 'system';
    const isResidenceManager = dto.userType === 'RESIDENCE_MANAGER';

    let fullName = dto.fullName?.trim() || '';
    let department = dto.department?.trim() || 'system';
    let position = dto.position?.trim() || 'system manager';
    let clientId: string | null = dto.clientId || null;
    let userType = dto.userType || 'EMPLOYEE';

    if (isSystemTenant) {
      if (!fullName) {
        throw new BadRequestException(
          'El nombre completo es requerido para usuarios administradores del sistema.',
        );
      }
      department = 'system';
      position = 'system manager';
    } else if (isResidenceManager) {
      if (!clientId) {
        throw new BadRequestException(
          'El ID del cliente es requerido para administradores de conjunto.',
        );
      }
      if (!fullName) {
        throw new BadRequestException('El nombre completo es requerido.');
      }
      department = 'ADMINISTRACION CLIENTE';
      position = 'ADMINISTRADOR CLIENTE';
    } else {
      // 1) Business validation: verify an existing active employee with same document
      const employee = (await this.employeeRepository.findActiveByDocument(
        dto.document,
      )) as any;

      if (!employee) {
        throw new BadRequestException(
          'No active employee found with the provided document.',
        );
      }

      fullName = employee.fullName;
      department = employee.departmentRef?.name || 'N/A';
      position = employee.positionRef?.name || 'N/A';
      clientId = employee.clientId || null;
    }

    // 2) Check if user record already exists (regardless of isActive)
    const existingUser = await this.userRepository.findByDocument(dto.document);

    if (existingUser) {
      if (existingUser.isActive) {
        throw new BadRequestException(
          isSystemTenant
            ? 'Ya existe un usuario registrado con este documento en el sistema.'
            : 'User already exists for this document.',
        );
      }

      // REACTIVATION LOGIC
      // 3) Hash new password
      const passwordHash = await this.hashPassword(dto.password);

      // 4) Reactivate and update user data
      const reactivatedUser = await this.userRepository.reactivateUser(
        existingUser.id,
        {
          passwordHash,
          fullName,
          department,
          position,
          clientId,
          userType,
        } as any,
      );

      // 5) Sync roles (remove old, add new)
      if (dto.roleIds) {
        // Remove existing roles
        const existingRoleIds = existingUser.roles.map((r: any) => r.role.id);
        if (existingRoleIds.length > 0) {
          await this.userRepository.deleteUserRoles(
            existingUser.id,
            existingRoleIds,
          );
        }
        // Add new roles
        if (dto.roleIds.length > 0) {
          await this.userRepository.addUserRoles(existingUser.id, dto.roleIds);
        }
      }

      const finalUser = await this.userRepository.getMe(reactivatedUser.id);
      return this.mapUserToResponse(finalUser);
    }

    // 6) Normal creation flow
    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.userRepository.createUser({
      passwordHash,
      fullName,
      document: dto.document,
      department,
      position,
      clientId,
      userType,
    } as any);

    if (isResidenceManager) {
      // Find or create 'residence-manager' role
      let role = await this.roleRepository.findByName('residence-manager', this.contextService.tenantId!);
      if (!role) {
        role = await this.roleRepository.create({
          name: 'residence-manager',
          tenantId: this.contextService.tenantId!,
        });
        // We can assign permissions here if needed using createRolePermissions, 
        // but typically a residence manager would get assigned default permissions in the UI later or handled centrally.
      }
      await this.userRepository.addUserRoles(user.id, [role.id]);
    } else if (dto.roleIds && dto.roleIds.length > 0) {
      await this.userRepository.addUserRoles(user.id, dto.roleIds);
    }

    const newUser = await this.userRepository.getMe(user.id);
    return this.mapUserToResponse(newUser);
  }

  async softDelete(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.getMe(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.tenantId === 'system') {
      const activeCount =
        await this.userRepository.countActiveInTenant('system');
      if (activeCount <= 1) {
        throw new BadRequestException(
          'No se puede eliminar ni inhabilitar el único usuario administrador (GODLIKE) activo del sistema.',
        );
      }
    }

    const deleted = await this.userRepository.softDeleteUser(userId);
    return this.mapUserToResponse(deleted);
  }

  async changeUserPassword(
    document: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<any> {
    const user = await this.userRepository.findActiveByDocument(document);

    if (!user) {
      throw new NotFoundException('User not found or inactive in this tenant.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, oldPassword);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid current password.');
    }

    const newPasswordHash = await this.hashPassword(newPassword);

    await this.userRepository.updateUserPassword(user.id, newPasswordHash);

    return { message: 'Password changed successfully' };
  }

  async resetPassword(document: string, newPassword: string): Promise<any> {
    const user = await this.userRepository.findActiveByDocument(document);

    if (!user) {
      throw new NotFoundException('User not found or inactive in this tenant.');
    }

    const newPasswordHash = await this.hashPassword(newPassword);

    await this.userRepository.adminResetPassword(user.id, newPasswordHash);

    return { message: 'Password reset successfully' };
  }

  async findActiveByDocument(
    document: string,
    tenantId: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findActiveByDocument(document);
    return user ? this.mapUserToResponse(user) : null;
  }

  async findAll(tenantId: string): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll(tenantId);
    return users.map((u) => this.mapUserToResponse(u));
  }

  async findUsersForAssignment(
    tenantId: string,
    type: string,
    search: string,
    limit: number,
  ) {
    const trimmed = (search || '').trim();
    const where: any = {
      tenantId,
      isActive: true,
    };

    // Filtramos suavemente para dar prioridad, pero en la práctica 
    // cualquier usuario podría ser asignado dependiendo de la empresa.
    if (type === 'COORDINADOR') {
      // where.position = { contains: 'coordinador', mode: 'insensitive' }
    }

    if (trimmed) {
      where.OR = [
        { fullName: { contains: trimmed, mode: 'insensitive' } },
        { document: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const prismaClient = (this.userRepository as any).prisma;
    const users = await prismaClient.user.findMany({
      where,
      take: Math.min(limit, 50),
      select: {
        id: true,
        fullName: true,
        position: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return users;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return await this.userRepository.getUserPermissions(userId);
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.getMe(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUserToResponse(user);
  }
}
