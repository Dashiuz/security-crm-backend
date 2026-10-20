import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

describe('RoleController', () => {
  let controller: RoleController;
  let mockRoleService: any;

  beforeEach(async () => {
    mockRoleService = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      patchPermissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [{ provide: RoleService, useValue: mockRoleService }],
    }).compile();

    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate create to roleService.create with tenantId', async () => {
      const dto = { name: 'OPERATOR' };
      const req = { user: { tenantId: 'tenant-1' } };
      mockRoleService.create.mockResolvedValue({ id: 'role-1', ...dto });

      const result = await controller.create(req, dto);
      expect(mockRoleService.create).toHaveBeenCalledWith('tenant-1', dto);
      expect(result).toEqual({ id: 'role-1', ...dto });
    });
  });

  describe('list', () => {
    it('should delegate list to roleService.list with tenantId', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockRoleService.list.mockResolvedValue([
        { id: 'role-1', name: 'OPERATOR' },
      ]);

      const result = await controller.list(req);
      expect(mockRoleService.list).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual([{ id: 'role-1', name: 'OPERATOR' }]);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to roleService.findOne with tenantId and roleId', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockRoleService.findOne.mockResolvedValue({
        id: 'role-1',
        name: 'OPERATOR',
      });

      const result = await controller.findOne(req, 'role-1');
      expect(mockRoleService.findOne).toHaveBeenCalledWith(
        'tenant-1',
        'role-1',
      );
      expect(result).toEqual({ id: 'role-1', name: 'OPERATOR' });
    });
  });

  describe('update', () => {
    it('should delegate update to roleService.update', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      const dto = { name: 'OPERATOR_SENIOR' };
      mockRoleService.update.mockResolvedValue({ id: 'role-1', ...dto });

      const result = await controller.update(req, 'role-1', dto);
      expect(mockRoleService.update).toHaveBeenCalledWith(
        'tenant-1',
        'role-1',
        dto,
      );
      expect(result).toEqual({ id: 'role-1', ...dto });
    });
  });

  describe('toggleStatus', () => {
    it('should delegate toggleStatus to roleService.update with isActive', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockRoleService.update.mockResolvedValue({
        id: 'role-1',
        isActive: false,
      });

      const result = await controller.toggleStatus(req, 'role-1', false);
      expect(mockRoleService.update).toHaveBeenCalledWith(
        'tenant-1',
        'role-1',
        {
          isActive: false,
        },
      );
      expect(result).toEqual({ id: 'role-1', isActive: false });
    });
  });

  describe('remove', () => {
    it('should delegate remove to roleService.remove', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockRoleService.remove.mockResolvedValue({ id: 'role-1' });

      const result = await controller.remove(req, 'role-1');
      expect(mockRoleService.remove).toHaveBeenCalledWith('tenant-1', 'role-1');
      expect(result).toEqual({ id: 'role-1' });
    });
  });

  describe('patchPermissions', () => {
    it('should delegate patchPermissions to roleService.patchPermissions', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      const dto = { add: ['pqrs:read'] };
      mockRoleService.patchPermissions.mockResolvedValue({
        roleId: 'role-1',
        permissions: ['pqrs:read'],
      });

      const result = await controller.patchPermissions(req, 'role-1', dto);
      expect(mockRoleService.patchPermissions).toHaveBeenCalledWith(
        'tenant-1',
        'role-1',
        dto,
      );
      expect(result).toEqual({
        roleId: 'role-1',
        permissions: ['pqrs:read'],
      });
    });
  });
});
