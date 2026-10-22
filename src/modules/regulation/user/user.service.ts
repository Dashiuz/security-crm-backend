import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  UserRepositoryService,
  EmployeeRepositoryService,
  RoleRepositoryService,
  ClientRepositoryService,
} from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto, UserResponseDto } from './dtos/index';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepositoryService,
    private readonly employeeRepository: EmployeeRepositoryService,
    private readonly roleRepository: RoleRepositoryService,
    private readonly contextService: RequestContextService,
    private readonly clientRepository: ClientRepositoryService,
    private readonly prisma: PrismaService,
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
    const userType = dto.userType || 'EMPLOYEE';

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

      // 1) Verify client existence and tenant isolation
      const client = await this.clientRepository.findOne(clientId);
      if (!client || client.tenantId !== this.contextService.tenantId) {
        throw new BadRequestException(
          'El conjunto residencial especificado no existe o no pertenece a la organización.',
        );
      }

      // 2) Validate that dto.document belongs to client's registered administrators
      const admComp: any = client.administrationCompanyData || {};
      const validDocs: string[] = [];

      if (
        client.administrationType === 'INDIVIDUAL' ||
        !client.administrationType
      ) {
        const doc = (
          admComp.identificationNumber ||
          admComp.representativeDocument ||
          ''
        ).trim();
        if (doc) validDocs.push(doc);
        if (!fullName && client.administrator) {
          fullName = client.administrator.trim();
        }
      } else if (client.administrationType === 'ENTERPRISE') {
        const repDoc = (admComp.legalRepId || '').trim();
        if (repDoc) {
          validDocs.push(repDoc);
          if (!fullName && repDoc === dto.document.trim()) {
            fullName = (admComp.legalRepName || '').trim();
          }
        }
        const additional = Array.isArray(admComp.additionalContacts)
          ? admComp.additionalContacts
          : [];
        for (const c of additional) {
          const cDoc = (c.document || c.idNumber || '').trim();
          if (cDoc) {
            validDocs.push(cDoc);
            if (!fullName && cDoc === dto.document.trim()) {
              fullName = (c.name || '').trim();
            }
          }
        }
      }

      if (!validDocs.includes(dto.document.trim())) {
        throw new BadRequestException(
          'El documento de identidad no corresponde a ningún administrador registrado en los datos legales del conjunto residencial.',
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
      if (
        existingUser.tenantId !== this.contextService.tenantId &&
        !isSystemTenant
      ) {
        throw new BadRequestException(
          'El documento ya se encuentra registrado en otra organización.',
        );
      }

      if (existingUser.isActive) {
        if (isResidenceManager) {
          // Check if user already has access to this client
          const existingAccess = await this.prisma.userClientAccess.findFirst({
            where: {
              userId: existingUser.id,
              clientId: clientId!,
              isActive: true,
            },
          });

          if (existingUser.clientId === clientId || existingAccess) {
            throw new BadRequestException(
              'Este administrador ya cuenta con acceso activo a este conjunto residencial.',
            );
          }

          // Authorize access to additional client (Multi-client support)
          await this.prisma.userClientAccess.upsert({
            where: {
              userId_clientId: {
                userId: existingUser.id,
                clientId: clientId!,
              },
            },
            create: {
              tenantId: this.contextService.tenantId!,
              userId: existingUser.id,
              clientId: clientId!,
              roleName: dto.roleName || 'Administrador de Conjunto',
              isActive: true,
            },
            update: {
              isActive: true,
              roleName: dto.roleName || undefined,
            },
          });

          // Ensure active primary clientId if null
          if (!existingUser.clientId) {
            await this.prisma.user.update({
              where: { id: existingUser.id },
              data: { clientId },
            });
          }

          // Ensure residence-manager role
          let role = await this.roleRepository.findByName(
            'residence-manager',
            this.contextService.tenantId!,
          );
          if (!role) {
            role = await this.roleRepository.create({
              name: 'residence-manager',
              tenantId: this.contextService.tenantId!,
            });
          }
          const hasRole = (existingUser.roles || []).some(
            (r: any) =>
              r.role?.name === 'residence-manager' || r.roleId === role.id,
          );
          if (!hasRole) {
            await this.userRepository.addUserRoles(existingUser.id, [role.id]);
          }

          const updatedUser = await this.userRepository.getMe(existingUser.id);
          return this.mapUserToResponse(updatedUser);
        }

        throw new BadRequestException(
          isSystemTenant
            ? 'Ya existe un usuario registrado con este documento en el sistema.'
            : 'User already exists for this document.',
        );
      }

      // REACTIVATION LOGIC (existingUser.isActive === false)
      if (!dto.password || dto.password.length < 8) {
        throw new BadRequestException(
          'Password must be at least 8 characters.',
        );
      }
      const passwordHash = await this.hashPassword(dto.password);

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

      if (isResidenceManager) {
        await this.prisma.userClientAccess.upsert({
          where: {
            userId_clientId: {
              userId: existingUser.id,
              clientId: clientId!,
            },
          },
          create: {
            tenantId: this.contextService.tenantId!,
            userId: existingUser.id,
            clientId: clientId!,
            roleName: dto.roleName || 'Administrador de Conjunto',
            isActive: true,
          },
          update: {
            isActive: true,
            roleName: dto.roleName || undefined,
          },
        });

        let role = await this.roleRepository.findByName(
          'residence-manager',
          this.contextService.tenantId!,
        );
        if (!role) {
          role = await this.roleRepository.create({
            name: 'residence-manager',
            tenantId: this.contextService.tenantId!,
          });
        }
        await this.userRepository.deleteAllUserRoles(existingUser.id);
        await this.userRepository.addUserRoles(existingUser.id, [role.id]);
      } else if (dto.roleIds !== undefined) {
        await this.userRepository.deleteAllUserRoles(existingUser.id);
        if (dto.roleIds.length > 0) {
          await this.userRepository.addUserRoles(existingUser.id, dto.roleIds);
        }
      }

      const finalUser = await this.userRepository.getMe(reactivatedUser.id);
      return this.mapUserToResponse(finalUser);
    }

    // Normal creation flow
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }
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
      await this.prisma.userClientAccess.create({
        data: {
          tenantId: this.contextService.tenantId!,
          userId: user.id,
          clientId: clientId!,
          roleName: dto.roleName || 'Administrador de Conjunto',
          isActive: true,
        },
      });

      let role = await this.roleRepository.findByName(
        'residence-manager',
        this.contextService.tenantId!,
      );
      if (!role) {
        role = await this.roleRepository.create({
          name: 'residence-manager',
          tenantId: this.contextService.tenantId!,
        });
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

  async updateUserStatus(
    userId: string,
    isActive: boolean,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.getMe(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.tenantId === 'system' && !isActive) {
      const activeCount =
        await this.userRepository.countActiveInTenant('system');
      if (activeCount <= 1) {
        throw new BadRequestException(
          'No se puede inhabilitar el único usuario administrador (GODLIKE) activo del sistema.',
        );
      }
    }

    await this.userRepository.updateUser(userId, {
      isActive,
    });

    if (!isActive) {
      try {
        await this.prisma.userSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Could not revoke user sessions: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    const fresh = await this.userRepository.getMe(userId);
    return this.mapUserToResponse(fresh);
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

  async findAll(
    tenantId: string,
    filter?: { userType?: any; isActive?: boolean },
  ): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll(tenantId, filter);
    if (!users.length) return [];

    try {
      const documents = users.map((u) => u.document).filter(Boolean);
      const employees = await (this.prisma as any).employee.findMany({
        where: {
          tenantId,
          document: { in: documents },
          deletedAt: null,
        },
        select: {
          document: true,
          positionRef: { select: { name: true } },
          departmentRef: { select: { name: true } },
        },
      });

      const empMap = new Map<
        string,
        { position?: string; department?: string }
      >();
      for (const emp of employees || []) {
        empMap.set(emp.document, {
          position: emp.positionRef?.name,
          department: emp.departmentRef?.name,
        });
      }

      return users.map((u) => {
        const mapped = this.mapUserToResponse(u);
        const emp = empMap.get(u.document);
        if (emp?.position) mapped.position = emp.position;
        if (emp?.department) mapped.department = emp.department;
        return mapped;
      });
    } catch (err: any) {
      this.logger.error(
        `Error al enriquecer usuarios con datos de empleado: ${err?.message || err}`,
        err?.stack,
      );
      return users.map((u) => this.mapUserToResponse(u));
    }
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
      userType: 'EMPLOYEE',
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
