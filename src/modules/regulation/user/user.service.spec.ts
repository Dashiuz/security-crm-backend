import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import {
  UserRepositoryService,
  EmployeeRepositoryService,
  RoleRepositoryService,
  ClientRepositoryService,
} from '../../../common/repository/index';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestContextService } from '../../../common/context/request-context.service';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked_hash_password'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));

describe('UserService', () => {
  let service: UserService;
  let mockUserRepository: any;
  let mockEmployeeRepository: any;
  let mockRoleRepository: any;
  let mockContextService: any;
  let mockClientRepository: any;
  let mockPrisma: any;

  beforeEach(async () => {
    mockUserRepository = {
      createUser: jest.fn(),
      findUserById: jest.fn(),
      findActiveByDocument: jest.fn(),
      findByDocument: jest.fn(),
      getMe: jest.fn(),
      countActiveInTenant: jest.fn(),
      softDeleteUser: jest.fn(),
      reactivateUser: jest.fn(),
      deleteAllUserRoles: jest.fn(),
      deleteUserRoles: jest.fn(),
      addUserRoles: jest.fn(),
      listUsers: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    };

    mockEmployeeRepository = {
      findEmployeeById: jest.fn(),
      findActiveByDocument: jest.fn(),
      findEmployeeByDocument: jest.fn(),
    };

    mockRoleRepository = {
      getRoleById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
    };

    mockContextService = {
      userId: 'test-admin',
      tenantId: 'test-tenant',
      isGodlike: false,
    };

    mockClientRepository = {
      findOne: jest.fn(),
    };

    mockPrisma = {
      userClientAccess: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      employee: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepositoryService, useValue: mockUserRepository },
        {
          provide: EmployeeRepositoryService,
          useValue: mockEmployeeRepository,
        },
        { provide: RoleRepositoryService, useValue: mockRoleRepository },
        { provide: RequestContextService, useValue: mockContextService },
        { provide: ClientRepositoryService, useValue: mockClientRepository },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser & softDelete lifecycle', () => {
    const document = '1001001011';
    const mockEmployee = {
      id: 'emp-123',
      document,
      fullName: 'Juan Pérez',
      departmentRef: { name: 'OPERACIONES' },
      positionRef: { name: 'GUARDA DE SEGURIDAD' },
      clientId: 'client-999',
    };

    const mockActiveUser = {
      id: 'usr-123',
      document,
      fullName: 'Juan Pérez',
      department: 'OPERACIONES',
      position: 'GUARDA DE SEGURIDAD',
      tenantId: 'test-tenant',
      clientId: 'client-999',
      isActive: true,
      roles: [{ role: { id: 'role-guard', name: 'GUARDA' } }],
    };

    const mockSoftDeletedUser = {
      ...mockActiveUser,
      isActive: false,
    };

    it('should create a brand new user when active employee exists and user record does not exist', async () => {
      mockEmployeeRepository.findActiveByDocument.mockResolvedValue(
        mockEmployee,
      );
      mockUserRepository.findByDocument.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue({ id: 'usr-123' });
      mockUserRepository.addUserRoles.mockResolvedValue({ count: 1 });
      mockUserRepository.getMe.mockResolvedValue(mockActiveUser);

      const result = await service.createUser({
        document,
        password: 'securePassword123',
        roleIds: ['role-guard'],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('usr-123');
      expect(result.fullName).toBe('Juan Pérez');
      expect(mockUserRepository.createUser).toHaveBeenCalled();
      expect(mockUserRepository.addUserRoles).toHaveBeenCalledWith('usr-123', [
        'role-guard',
      ]);
    });

    it('should successfully soft delete a user and then re-create/reactivate them without error 500', async () => {
      // 1. Soft delete phase
      mockUserRepository.getMe.mockResolvedValueOnce(mockActiveUser);
      mockUserRepository.softDeleteUser.mockResolvedValueOnce(
        mockSoftDeletedUser,
      );

      const deletedResult = await service.softDelete('usr-123');
      expect(deletedResult.isActive).toBe(false);
      expect(mockUserRepository.softDeleteUser).toHaveBeenCalledWith('usr-123');

      // 2. Re-create / Reactivation phase
      mockEmployeeRepository.findActiveByDocument.mockResolvedValue(
        mockEmployee,
      );
      // findByDocument returns the soft-deleted user (with roles relation populated)
      mockUserRepository.findByDocument.mockResolvedValue(mockSoftDeletedUser);
      mockUserRepository.reactivateUser.mockResolvedValue({ id: 'usr-123' });
      mockUserRepository.deleteAllUserRoles.mockResolvedValue({ count: 1 });
      mockUserRepository.addUserRoles.mockResolvedValue({ count: 1 });
      mockUserRepository.getMe.mockResolvedValueOnce({
        ...mockActiveUser,
        roles: [{ role: { id: 'role-supervisor', name: 'SUPERVISOR' } }],
      });

      const reactivatedResult = await service.createUser({
        document,
        password: 'newPassword123',
        roleIds: ['role-supervisor'],
      });

      expect(reactivatedResult).toBeDefined();
      expect(reactivatedResult.id).toBe('usr-123');
      expect(reactivatedResult.isActive).toBe(true);
      expect(reactivatedResult.roles).toEqual([
        { id: 'role-supervisor', name: 'SUPERVISOR' },
      ]);
      expect(mockUserRepository.reactivateUser).toHaveBeenCalledWith(
        'usr-123',
        expect.objectContaining({
          fullName: 'Juan Pérez',
          passwordHash: 'mocked_hash_password',
        }),
      );
      expect(mockUserRepository.deleteAllUserRoles).toHaveBeenCalledWith(
        'usr-123',
      );
      expect(mockUserRepository.addUserRoles).toHaveBeenCalledWith('usr-123', [
        'role-supervisor',
      ]);
    });

    it('should successfully reactivate a user even if existingUser.roles is undefined', async () => {
      mockEmployeeRepository.findActiveByDocument.mockResolvedValue(
        mockEmployee,
      );
      // Regression simulation: findByDocument returns user without roles loaded
      const userWithoutRolesProperty = {
        id: 'usr-123',
        document,
        tenantId: 'test-tenant',
        isActive: false,
        roles: undefined,
      };
      mockUserRepository.findByDocument.mockResolvedValue(
        userWithoutRolesProperty,
      );
      mockUserRepository.reactivateUser.mockResolvedValue({ id: 'usr-123' });
      mockUserRepository.deleteAllUserRoles.mockResolvedValue({ count: 0 });
      mockUserRepository.addUserRoles.mockResolvedValue({ count: 1 });
      mockUserRepository.getMe.mockResolvedValue({
        ...mockActiveUser,
        roles: [{ role: { id: 'role-guard', name: 'GUARDA' } }],
      });

      const result = await service.createUser({
        document,
        password: 'newPassword123',
        roleIds: ['role-guard'],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('usr-123');
      expect(mockUserRepository.deleteAllUserRoles).toHaveBeenCalledWith(
        'usr-123',
      );
      expect(mockUserRepository.addUserRoles).toHaveBeenCalledWith('usr-123', [
        'role-guard',
      ]);
    });

    it('should throw BadRequestException if user already exists and is active', async () => {
      mockEmployeeRepository.findActiveByDocument.mockResolvedValue(
        mockEmployee,
      );
      mockUserRepository.findByDocument.mockResolvedValue(mockActiveUser);

      await expect(
        service.createUser({
          document,
          password: 'password123',
          roleIds: ['role-guard'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if inactive user belongs to a different tenant', async () => {
      mockEmployeeRepository.findActiveByDocument.mockResolvedValue(
        mockEmployee,
      );
      mockUserRepository.findByDocument.mockResolvedValue({
        ...mockSoftDeletedUser,
        tenantId: 'another-tenant',
      });

      await expect(
        service.createUser({
          document,
          password: 'password123',
          roleIds: ['role-guard'],
        }),
      ).rejects.toThrow(
        'El documento ya se encuentra registrado en otra organización.',
      );
    });

    it('should reactivate a user as RESIDENCE_MANAGER and assign residence-manager role', async () => {
      mockClientRepository.findOne.mockResolvedValue({
        id: 'client-123',
        tenantId: 'test-tenant',
        administrationType: 'INDIVIDUAL',
        administrator: 'Administrador Edificio',
        administrationCompanyData: { identificationNumber: '999888777' },
      });

      mockUserRepository.findByDocument.mockResolvedValue({
        ...mockSoftDeletedUser,
        userType: 'RESIDENCE_MANAGER',
      });
      mockRoleRepository.findByName.mockResolvedValue({
        id: 'role-residence-mgr',
        name: 'residence-manager',
      });
      mockUserRepository.reactivateUser.mockResolvedValue({ id: 'usr-123' });
      mockUserRepository.deleteAllUserRoles.mockResolvedValue({ count: 1 });
      mockUserRepository.addUserRoles.mockResolvedValue({ count: 1 });
      mockUserRepository.getMe.mockResolvedValue({
        ...mockActiveUser,
        userType: 'RESIDENCE_MANAGER',
        roles: [
          { role: { id: 'role-residence-mgr', name: 'residence-manager' } },
        ],
      });

      const result = await service.createUser({
        document: '999888777',
        password: 'managerPassword123',
        fullName: 'Administrador Edificio',
        clientId: 'client-123',
        userType: 'RESIDENCE_MANAGER',
      });

      expect(result).toBeDefined();
      expect(mockUserRepository.deleteAllUserRoles).toHaveBeenCalledWith(
        'usr-123',
      );
      expect(mockUserRepository.addUserRoles).toHaveBeenCalledWith('usr-123', [
        'role-residence-mgr',
      ]);
      expect(mockPrisma.userClientAccess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: 'usr-123',
            clientId: 'client-123',
          }),
        }),
      );
    });

    describe('RESIDENCE_MANAGER Validation & Multi-Client Access (SPEC-REG-014)', () => {
      it('should create new RESIDENCE_MANAGER with UserClientAccess when document matches INDIVIDUAL administrator', async () => {
        mockClientRepository.findOne.mockResolvedValue({
          id: 'client-001',
          tenantId: 'test-tenant',
          administrationType: 'INDIVIDUAL',
          administrator: 'Carlos Rodriguez',
          administrationCompanyData: { identificationNumber: '11223344' },
        });

        mockUserRepository.findByDocument.mockResolvedValue(null);
        mockUserRepository.createUser.mockResolvedValue({ id: 'usr-carlos' });
        mockRoleRepository.findByName.mockResolvedValue({
          id: 'role-rm',
          name: 'residence-manager',
        });
        mockUserRepository.addUserRoles.mockResolvedValue({ count: 1 });
        mockUserRepository.getMe.mockResolvedValue({
          id: 'usr-carlos',
          document: '11223344',
          fullName: 'Carlos Rodriguez',
          department: 'ADMINISTRACION CLIENTE',
          position: 'ADMINISTRADOR CLIENTE',
          clientId: 'client-001',
          userType: 'RESIDENCE_MANAGER',
          isActive: true,
          roles: [{ role: { id: 'role-rm', name: 'residence-manager' } }],
        });

        const result = await service.createUser({
          document: '11223344',
          password: 'securePass123',
          clientId: 'client-001',
          userType: 'RESIDENCE_MANAGER',
        });

        expect(result).toBeDefined();
        expect(result.id).toBe('usr-carlos');
        expect(mockPrisma.userClientAccess.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'usr-carlos',
            clientId: 'client-001',
            roleName: 'Administrador de Conjunto',
            isActive: true,
          }),
        });
      });

      it('should create new RESIDENCE_MANAGER when document matches ENTERPRISE additional contacts', async () => {
        mockClientRepository.findOne.mockResolvedValue({
          id: 'client-002',
          tenantId: 'test-tenant',
          administrationType: 'ENTERPRISE',
          administrator: 'Administraciones SAS',
          administrationCompanyData: {
            legalRepName: 'Pedro Perez',
            legalRepId: '990011',
            additionalContacts: [
              {
                name: 'Diana Morales',
                document: '77889900',
                roleName: 'Delegada',
              },
            ],
          },
        });

        mockUserRepository.findByDocument.mockResolvedValue(null);
        mockUserRepository.createUser.mockResolvedValue({ id: 'usr-diana' });
        mockRoleRepository.findByName.mockResolvedValue({
          id: 'role-rm',
          name: 'residence-manager',
        });
        mockUserRepository.addUserRoles.mockResolvedValue({ count: 1 });
        mockUserRepository.getMe.mockResolvedValue({
          id: 'usr-diana',
          document: '77889900',
          fullName: 'Diana Morales',
          department: 'ADMINISTRACION CLIENTE',
          position: 'ADMINISTRADOR CLIENTE',
          clientId: 'client-002',
          userType: 'RESIDENCE_MANAGER',
          isActive: true,
          roles: [{ role: { id: 'role-rm', name: 'residence-manager' } }],
        });

        const result = await service.createUser({
          document: '77889900',
          password: 'securePass123',
          clientId: 'client-002',
          userType: 'RESIDENCE_MANAGER',
        });

        expect(result.fullName).toBe('Diana Morales');
        expect(mockPrisma.userClientAccess.create).toHaveBeenCalled();
      });

      it('should throw BadRequestException if document is not among client administrators', async () => {
        mockClientRepository.findOne.mockResolvedValue({
          id: 'client-001',
          tenantId: 'test-tenant',
          administrationType: 'INDIVIDUAL',
          administrator: 'Carlos Rodriguez',
          administrationCompanyData: { identificationNumber: '11223344' },
        });

        await expect(
          service.createUser({
            document: '99999999', // Not registered in client
            password: 'password123',
            clientId: 'client-001',
            userType: 'RESIDENCE_MANAGER',
          }),
        ).rejects.toThrow(
          'El documento de identidad no corresponde a ningún administrador registrado en los datos legales del conjunto residencial.',
        );
      });

      it('should throw BadRequestException if client does not exist or tenant mismatch', async () => {
        mockClientRepository.findOne.mockResolvedValue(null);

        await expect(
          service.createUser({
            document: '11223344',
            password: 'password123',
            clientId: 'client-nonexistent',
            userType: 'RESIDENCE_MANAGER',
          }),
        ).rejects.toThrow(
          'El conjunto residencial especificado no existe o no pertenece a la organización.',
        );
      });

      it('should authorize access to a new client when administrator already has active account (Multi-Client)', async () => {
        mockClientRepository.findOne.mockResolvedValue({
          id: 'client-002',
          tenantId: 'test-tenant',
          administrationType: 'INDIVIDUAL',
          administrator: 'Carlos Rodriguez',
          administrationCompanyData: { identificationNumber: '11223344' },
        });

        // User already exists and is active for client-001
        mockUserRepository.findByDocument.mockResolvedValue({
          id: 'usr-carlos',
          document: '11223344',
          fullName: 'Carlos Rodriguez',
          tenantId: 'test-tenant',
          clientId: 'client-001',
          isActive: true,
          roles: [{ role: { name: 'residence-manager' } }],
        });

        mockPrisma.userClientAccess.findFirst.mockResolvedValue(null); // No previous access to client-002
        mockPrisma.userClientAccess.upsert.mockResolvedValue({});
        mockRoleRepository.findByName.mockResolvedValue({
          id: 'role-rm',
          name: 'residence-manager',
        });
        mockUserRepository.getMe.mockResolvedValue({
          id: 'usr-carlos',
          document: '11223344',
          fullName: 'Carlos Rodriguez',
          clientId: 'client-001',
          isActive: true,
          roles: [{ role: { id: 'role-rm', name: 'residence-manager' } }],
        });

        const result = await service.createUser({
          document: '11223344',
          clientId: 'client-002',
          userType: 'RESIDENCE_MANAGER',
          roleName: 'Administrador Titular',
        });

        expect(result).toBeDefined();
        expect(mockPrisma.userClientAccess.upsert).toHaveBeenCalledWith({
          where: {
            userId_clientId: {
              userId: 'usr-carlos',
              clientId: 'client-002',
            },
          },
          create: expect.objectContaining({
            userId: 'usr-carlos',
            clientId: 'client-002',
            roleName: 'Administrador Titular',
          }),
          update: expect.objectContaining({
            isActive: true,
          }),
        });
        expect(mockUserRepository.createUser).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException if administrator already has active access to this client', async () => {
        mockClientRepository.findOne.mockResolvedValue({
          id: 'client-001',
          tenantId: 'test-tenant',
          administrationType: 'INDIVIDUAL',
          administrator: 'Carlos Rodriguez',
          administrationCompanyData: { identificationNumber: '11223344' },
        });

        mockUserRepository.findByDocument.mockResolvedValue({
          id: 'usr-carlos',
          document: '11223344',
          tenantId: 'test-tenant',
          clientId: 'client-001', // Already primary client
          isActive: true,
        });

        await expect(
          service.createUser({
            document: '11223344',
            clientId: 'client-001',
            userType: 'RESIDENCE_MANAGER',
          }),
        ).rejects.toThrow(
          'Este administrador ya cuenta con acceso activo a este conjunto residencial.',
        );
      });
    });
  });

  describe('updateUserStatus', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.getMe.mockResolvedValue(null);

      await expect(service.updateUserStatus('usr-404', false)).rejects.toThrow(
        'Usuario no encontrado',
      );
    });

    it('should throw BadRequestException if attempting to disable the only system admin', async () => {
      mockUserRepository.getMe.mockResolvedValue({
        id: 'usr-admin',
        tenantId: 'system',
        isActive: true,
      });
      mockUserRepository.countActiveInTenant.mockResolvedValue(1);

      await expect(
        service.updateUserStatus('usr-admin', false),
      ).rejects.toThrow(
        'No se puede inhabilitar el único usuario administrador (GODLIKE) activo del sistema.',
      );
    });

    it('should disable user and revoke active sessions when isActive is false', async () => {
      const mockUser = {
        id: 'usr-1',
        fullName: 'Carlos Sanchez',
        tenantId: 'tenant-1',
        isActive: true,
        roles: [],
      };
      mockUserRepository.getMe
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, isActive: false });

      mockPrisma.userSession = {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      };

      const result = await service.updateUserStatus('usr-1', false);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('usr-1', {
        isActive: false,
      });
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr-1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
      expect(result.isActive).toBe(false);
    });

    it('should enable user when isActive is true without revoking sessions', async () => {
      const mockUser = {
        id: 'usr-1',
        fullName: 'Carlos Sanchez',
        tenantId: 'tenant-1',
        isActive: false,
        roles: [],
      };
      mockUserRepository.getMe
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, isActive: true });

      mockPrisma.userSession = {
        updateMany: jest.fn(),
      };

      const result = await service.updateUserStatus('usr-1', true);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('usr-1', {
        isActive: true,
      });
      expect(mockPrisma.userSession.updateMany).not.toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });
  });

  describe('softDelete', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.getMe.mockResolvedValue(null);
      await expect(service.softDelete('usr-999')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw BadRequestException if deleting only godlike admin', async () => {
      mockUserRepository.getMe.mockResolvedValue({
        id: 'usr-god',
        tenantId: 'system',
      });
      mockUserRepository.countActiveInTenant.mockResolvedValue(1);

      await expect(service.softDelete('usr-god')).rejects.toThrow(
        'No se puede eliminar ni inhabilitar el único usuario administrador (GODLIKE) activo del sistema.',
      );
    });

    it('should soft delete user successfully', async () => {
      const mockUser = {
        id: 'usr-2',
        fullName: 'Juan Lopez',
        tenantId: 'tenant-1',
        isActive: true,
        roles: [],
      };
      mockUserRepository.getMe.mockResolvedValue(mockUser);
      mockUserRepository.softDeleteUser.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const res = await service.softDelete('usr-2');
      expect(mockUserRepository.softDeleteUser).toHaveBeenCalledWith('usr-2');
      expect(res.isActive).toBe(false);
    });
  });

  describe('password management', () => {
    it('changeUserPassword should throw NotFoundException if user not found', async () => {
      mockUserRepository.findActiveByDocument.mockResolvedValue(null);

      await expect(
        service.changeUserPassword('12345678', 'old', 'newpass123'),
      ).rejects.toThrow('User not found or inactive in this tenant.');
    });

    it('changeUserPassword should throw BadRequestException if current password invalid', async () => {
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);
      mockUserRepository.findActiveByDocument.mockResolvedValue({
        id: 'u-1',
        passwordHash: 'hash',
      });

      await expect(
        service.changeUserPassword('12345678', 'wrong', 'newpass123'),
      ).rejects.toThrow('Invalid current password.');
    });

    it('changeUserPassword should update password when valid', async () => {
      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);
      mockUserRepository.findActiveByDocument.mockResolvedValue({
        id: 'u-1',
        passwordHash: 'hash',
      });
      mockUserRepository.updateUserPassword = jest.fn().mockResolvedValue({});

      const res = await service.changeUserPassword(
        '12345678',
        'correct',
        'newpass123',
      );
      expect(res.message).toBe('Password changed successfully');
      expect(mockUserRepository.updateUserPassword).toHaveBeenCalled();
    });

    it('resetPassword should throw NotFoundException if user not found', async () => {
      mockUserRepository.findActiveByDocument.mockResolvedValue(null);

      await expect(
        service.resetPassword('12345678', 'newpass123'),
      ).rejects.toThrow('User not found or inactive in this tenant.');
    });

    it('resetPassword should update password with admin reset', async () => {
      mockUserRepository.findActiveByDocument.mockResolvedValue({
        id: 'u-1',
      });
      mockUserRepository.adminResetPassword = jest.fn().mockResolvedValue({});

      const res = await service.resetPassword('12345678', 'newpass123');
      expect(res.message).toBe('Password reset successfully');
      expect(mockUserRepository.adminResetPassword).toHaveBeenCalled();
    });
  });

  describe('read & helper methods', () => {
    it('findActiveByDocument should return mapped user or null', async () => {
      mockUserRepository.findActiveByDocument.mockResolvedValueOnce({
        id: 'u-1',
        fullName: 'Test',
        roles: [],
      });
      let res = await service.findActiveByDocument('123', 't-1');
      expect(res?.id).toBe('u-1');

      mockUserRepository.findActiveByDocument.mockResolvedValueOnce(null);
      res = await service.findActiveByDocument('999', 't-1');
      expect(res).toBeNull();
    });

    it('findAll should return mapped users and sync official employee position', async () => {
      mockUserRepository.findAll = jest.fn().mockResolvedValue([
        {
          id: 'u-1',
          fullName: 'User 1',
          document: '1001',
          position: 'Gerente',
          roles: [],
        },
      ]);
      mockPrisma.employee.findMany.mockResolvedValue([
        {
          document: '1001',
          positionRef: { name: 'DIRECTOR_OPERACIONES' },
          departmentRef: { name: 'OPERACIONES' },
        },
      ]);

      const res = await service.findAll('t-1');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('u-1');
      expect(res[0].position).toBe('DIRECTOR_OPERACIONES');
      expect(res[0].department).toBe('OPERACIONES');
    });

    it('findUsersForAssignment should search users in prisma', async () => {
      mockUserRepository.prisma = {
        user: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'u-1', fullName: 'Carlos Coord', position: 'Coordinador' },
            ]),
        },
      };

      const res = await service.findUsersForAssignment(
        't-1',
        'COORDINADOR',
        'Carlos',
        10,
      );
      expect(res).toHaveLength(1);
      expect(mockUserRepository.prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          where: expect.objectContaining({
            tenantId: 't-1',
            isActive: true,
          }),
        }),
      );
    });

    it('getUserPermissions should delegate to repository', async () => {
      mockUserRepository.getUserPermissions = jest
        .fn()
        .mockResolvedValue(['user:read']);

      const res = await service.getUserPermissions('u-1');
      expect(res).toEqual(['user:read']);
    });

    it('getMe should return user or throw NotFoundException', async () => {
      mockUserRepository.getMe.mockResolvedValueOnce({
        id: 'u-1',
        fullName: 'Carlos',
        roles: [],
      });
      const res = await service.getMe('u-1');
      expect(res.id).toBe('u-1');

      mockUserRepository.getMe.mockResolvedValueOnce(null);
      await expect(service.getMe('u-404')).rejects.toThrow('User not found');
    });
  });
});
