import { Test, TestingModule } from '@nestjs/testing';
import { UsersRolesService } from './users-roles.service';
import { UserRepositoryService } from '../../../common/repository/index';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('UsersRolesService', () => {
  let service: UsersRolesService;
  let mockUserRepo: any;

  beforeEach(async () => {
    mockUserRepo = {
      findUserInTenant: jest.fn(),
      validateRolesInTenant: jest.fn(),
      deleteUserRoles: jest.fn(),
      addUserRoles: jest.fn(),
      getUserRolesDetailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRolesService,
        {
          provide: UserRepositoryService,
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<UsersRolesService>(UsersRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('patchUserRoles', () => {
    it('should throw NotFoundException if user not found in tenant', async () => {
      mockUserRepo.findUserInTenant.mockResolvedValue(null);

      await expect(
        service.patchUserRoles('t-1', 'u-1', { addRoleIds: ['r-1'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is RESIDENCE_MANAGER', async () => {
      mockUserRepo.findUserInTenant.mockResolvedValue({
        id: 'u-1',
        userType: 'RESIDENCE_MANAGER',
      });

      await expect(
        service.patchUserRoles('t-1', 'u-1', { addRoleIds: ['r-1'] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if both addRoleIds and removeRoleIds are empty', async () => {
      mockUserRepo.findUserInTenant.mockResolvedValue({
        id: 'u-1',
        userType: 'OPERATIONAL',
      });

      await expect(
        service.patchUserRoles('t-1', 'u-1', {
          addRoleIds: [],
          removeRoleIds: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if any roles do not belong to tenant', async () => {
      mockUserRepo.findUserInTenant.mockResolvedValue({
        id: 'u-1',
        userType: 'OPERATIONAL',
      });
      mockUserRepo.validateRolesInTenant.mockResolvedValue([{ id: 'r-1' }]);

      await expect(
        service.patchUserRoles('t-1', 'u-1', {
          addRoleIds: ['r-1', 'r-missing'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete and add roles and return updated role list', async () => {
      mockUserRepo.findUserInTenant.mockResolvedValue({
        id: 'u-1',
        userType: 'OPERATIONAL',
      });
      mockUserRepo.validateRolesInTenant.mockResolvedValue([
        { id: 'r-add' },
        { id: 'r-del' },
      ]);
      mockUserRepo.deleteUserRoles.mockResolvedValue(undefined);
      mockUserRepo.addUserRoles.mockResolvedValue(undefined);
      mockUserRepo.getUserRolesDetailed.mockResolvedValue([
        { role: { id: 'r-add', name: 'SUPERVISOR' } },
      ]);

      const result = await service.patchUserRoles('t-1', 'u-1', {
        addRoleIds: ['r-add'],
        removeRoleIds: ['r-del'],
      });

      expect(mockUserRepo.deleteUserRoles).toHaveBeenCalledWith('u-1', [
        'r-del',
      ]);
      expect(mockUserRepo.addUserRoles).toHaveBeenCalledWith('u-1', ['r-add']);
      expect(result).toEqual({
        userId: 'u-1',
        roles: [{ id: 'r-add', name: 'SUPERVISOR' }],
      });
    });

    it('should support only adding roles', async () => {
      mockUserRepo.findUserInTenant.mockResolvedValue({
        id: 'u-1',
        userType: 'OPERATIONAL',
      });
      mockUserRepo.validateRolesInTenant.mockResolvedValue([{ id: 'r-add' }]);
      mockUserRepo.addUserRoles.mockResolvedValue(undefined);
      mockUserRepo.getUserRolesDetailed.mockResolvedValue([
        { role: { id: 'r-add', name: 'COORDINADOR' } },
      ]);

      const result = await service.patchUserRoles('t-1', 'u-1', {
        addRoleIds: ['r-add'],
      });

      expect(mockUserRepo.deleteUserRoles).not.toHaveBeenCalled();
      expect(mockUserRepo.addUserRoles).toHaveBeenCalledWith('u-1', ['r-add']);
      expect(result.roles).toHaveLength(1);
    });

    it('should support only removing roles', async () => {
      mockUserRepo.findUserInTenant.mockResolvedValue({
        id: 'u-1',
        userType: 'OPERATIONAL',
      });
      mockUserRepo.validateRolesInTenant.mockResolvedValue([{ id: 'r-del' }]);
      mockUserRepo.deleteUserRoles.mockResolvedValue(undefined);
      mockUserRepo.getUserRolesDetailed.mockResolvedValue([]);

      const result = await service.patchUserRoles('t-1', 'u-1', {
        removeRoleIds: ['r-del'],
      });

      expect(mockUserRepo.deleteUserRoles).toHaveBeenCalledWith('u-1', [
        'r-del',
      ]);
      expect(mockUserRepo.addUserRoles).not.toHaveBeenCalled();
      expect(result.roles).toHaveLength(0);
    });
  });
});
