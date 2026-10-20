import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import {
  RoleRepositoryService,
  UserRepositoryService,
} from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('RoleService', () => {
  let service: RoleService;
  let mockRoleRepository: any;
  let mockUserRepository: any;
  let mockContextService: any;

  beforeEach(async () => {
    mockRoleRepository = {
      createRole: jest.fn(),
      findRoleById: jest.fn(),
      findRoleId: jest.fn(),
      findRoleByName: jest.fn(),
      listRoles: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      countUsersWithRole: jest.fn(),
      patchRolePermissions: jest.fn(),
      getCurrentState: jest.fn(),
      findPermissionIdByKeys: jest.fn(),
      removeRolePermissions: jest.fn(),
      createRolePermissions: jest.fn(),
    };

    mockUserRepository = {
      findUserById: jest.fn(),
      findNamesByIds: jest.fn().mockResolvedValue(new Map()),
    };

    mockContextService = {
      userId: 'test-user',
      tenantId: 'test-tenant',
      isGodlike: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: RoleRepositoryService, useValue: mockRoleRepository },
        { provide: UserRepositoryService, useValue: mockUserRepository },
        { provide: RequestContextService, useValue: mockContextService },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un rol exitosamente', async () => {
      mockRoleRepository.createRole.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR_SEGURIDAD',
        tenantId: 'test-tenant',
        isActive: true,
        createdAt: new Date(),
        perms: [],
      });

      const result = await service.create('test-tenant', {
        name: 'OPERADOR_SEGURIDAD',
      });

      expect(result.name).toBe('OPERADOR_SEGURIDAD');
      expect(result.isActive).toBe(true);
      expect(mockRoleRepository.createRole).toHaveBeenCalledWith(
        'OPERADOR_SEGURIDAD',
      );
    });

    it('debe rechazar la creación de rol GODLIKE si no es godlike', async () => {
      await expect(
        service.create('test-tenant', { name: 'GODLIKE' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ConflictException si el nombre ya existe (P2002)', async () => {
      mockRoleRepository.createRole.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create('test-tenant', { name: 'DUPLICATE' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('list', () => {
    it('debe listar roles mapeando creador', async () => {
      mockRoleRepository.listRoles.mockResolvedValue([
        {
          id: 'role-1',
          name: 'OPERADOR',
          tenantId: 'test-tenant',
          isActive: true,
          createdBy: 'user-1',
          perms: [],
        },
      ]);
      mockUserRepository.findNamesByIds.mockResolvedValue(
        new Map([['user-1', 'Juan Perez']]),
      );

      const roles = await service.list('test-tenant');
      expect(roles).toHaveLength(1);
      expect(roles[0].createdBy).toBe('Juan Perez');
      expect(roles[0].isActive).toBe(true);
    });
  });

  describe('findOne', () => {
    it('debe retornar rol por id', async () => {
      mockRoleRepository.findRoleById.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
        isActive: true,
        perms: [],
      });

      const role = await service.findOne('test-tenant', 'role-1');
      expect(role.id).toBe('role-1');
    });

    it('debe lanzar NotFoundException si no existe el rol', async () => {
      mockRoleRepository.findRoleById.mockResolvedValue(null);

      await expect(
        service.findOne('test-tenant', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe actualizar isActive y nombre exitosamente', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
      });
      mockRoleRepository.updateRole.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR_LEAD',
        isActive: false,
        perms: [],
      });

      const updated = await service.update('test-tenant', 'role-1', {
        name: 'OPERADOR_LEAD',
        isActive: false,
      });

      expect(updated.name).toBe('OPERADOR_LEAD');
      expect(updated.isActive).toBe(false);
      expect(mockRoleRepository.updateRole).toHaveBeenCalledWith('role-1', {
        name: 'OPERADOR_LEAD',
        isActive: false,
      });
    });

    it('debe lanzar NotFoundException si el rol a actualizar no existe', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue(null);

      await expect(
        service.update('test-tenant', 'missing', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debe eliminar rol exitosamente', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
      });
      mockRoleRepository.deleteRole.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        perms: [],
      });

      const result = await service.remove('test-tenant', 'role-1');
      expect(result.id).toBe('role-1');
      expect(mockRoleRepository.deleteRole).toHaveBeenCalledWith('role-1');
    });

    it('debe prohibir eliminar rol GODLIKE', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-god',
        name: 'GODLIKE',
        tenantId: 'system',
      });

      await expect(service.remove('test-tenant', 'role-god')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar BadRequestException si el rol está asignado a usuarios (P2003)', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
      });
      mockRoleRepository.deleteRole.mockRejectedValue({ code: 'P2003' });

      await expect(service.remove('test-tenant', 'role-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('patchPermissions', () => {
    it('debe sincronizar permisos en modo sync (dto.keys)', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
      });
      mockRoleRepository.getCurrentState
        .mockResolvedValueOnce({
          perms: [{ permission: { key: 'pqrs:read' } }],
        })
        .mockResolvedValueOnce({
          perms: [{ permission: { key: 'pqrs:update' } }],
        });
      mockRoleRepository.findPermissionIdByKeys.mockResolvedValue([
        { key: 'pqrs:read', id: 'perm-1' },
        { key: 'pqrs:update', id: 'perm-2' },
      ]);

      const result = await service.patchPermissions('test-tenant', 'role-1', {
        keys: ['pqrs:update'],
      });

      expect(mockRoleRepository.removeRolePermissions).toHaveBeenCalled();
      expect(mockRoleRepository.createRolePermissions).toHaveBeenCalled();
      expect(result.permissions).toEqual(['pqrs:update']);
    });

    it('debe aplicar adición y remoción en modo incremental', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
      });
      mockRoleRepository.getCurrentState
        .mockResolvedValueOnce({
          perms: [{ permission: { key: 'pqrs:read' } }],
        })
        .mockResolvedValueOnce({
          perms: [
            { permission: { key: 'pqrs:read' } },
            { permission: { key: 'pqrs:create' } },
          ],
        });
      mockRoleRepository.findPermissionIdByKeys.mockResolvedValue([
        { key: 'pqrs:read', id: 'perm-1' },
        { key: 'pqrs:create', id: 'perm-2' },
      ]);

      const result = await service.patchPermissions('test-tenant', 'role-1', {
        add: ['pqrs:create'],
      });

      expect(mockRoleRepository.createRolePermissions).toHaveBeenCalled();
      expect(result.permissions).toContain('pqrs:create');
    });

    it('debe prohibir otorgar permisos godlike si no es godlike', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
      });

      await expect(
        service.patchPermissions('test-tenant', 'role-1', {
          add: ['godlike:manage'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si no se proveen keys, add o remove', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
      });

      await expect(
        service.patchPermissions('test-tenant', 'role-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si se especifican permisos inexistentes', async () => {
      mockRoleRepository.findRoleId.mockResolvedValue({
        id: 'role-1',
        name: 'OPERADOR',
        tenantId: 'test-tenant',
      });
      mockRoleRepository.getCurrentState.mockResolvedValue({ perms: [] });
      mockRoleRepository.findPermissionIdByKeys.mockResolvedValue([]);

      await expect(
        service.patchPermissions('test-tenant', 'role-1', {
          add: ['nonexistent:perm'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
