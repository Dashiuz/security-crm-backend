import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserPasswordDto,
  AdminResetPasswordDto,
  UpdateUserStatusDto,
} from './dtos/index';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: any;

  beforeEach(async () => {
    mockUserService = {
      createUser: jest.fn(),
      getMe: jest.fn(),
      findAll: jest.fn(),
      findUsersForAssignment: jest.fn(),
      changeUserPassword: jest.fn(),
      resetPassword: jest.fn(),
      updateUserStatus: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to userService.createUser', async () => {
      const dto: CreateUserDto = {
        document: '12345678',
        password: 'Password123!',
      } as any;
      mockUserService.createUser.mockResolvedValue({ id: 'u-1', ...dto });

      const result = await controller.create(dto);
      expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'u-1', ...dto });
    });
  });

  describe('getMe', () => {
    it('should delegate to userService.getMe with req.user.sub', async () => {
      const req = { user: { sub: 'u-1' } };
      mockUserService.getMe.mockResolvedValue({
        id: 'u-1',
        fullName: 'Carlos',
      });

      const result = await controller.getMe(req);
      expect(mockUserService.getMe).toHaveBeenCalledWith('u-1');
      expect(result).toEqual({ id: 'u-1', fullName: 'Carlos' });
    });
  });

  describe('findAll', () => {
    it('should delegate to userService.findAll with req.user.tenantId', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockUserService.findAll.mockResolvedValue([{ id: 'u-1' }]);

      const result = await controller.findAll(req);
      expect(mockUserService.findAll).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual([{ id: 'u-1' }]);
    });
  });

  describe('getCoordinators', () => {
    it('should delegate to findUsersForAssignment with COORDINADOR and default limit', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockUserService.findUsersForAssignment.mockResolvedValue([{ id: 'u-1' }]);

      const result = await controller.getCoordinators(req, 'carlos', '');
      expect(mockUserService.findUsersForAssignment).toHaveBeenCalledWith(
        'tenant-1',
        'COORDINADOR',
        'carlos',
        15,
      );
      expect(result).toEqual([{ id: 'u-1' }]);
    });

    it('should parse custom limit when provided', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockUserService.findUsersForAssignment.mockResolvedValue([]);

      await controller.getCoordinators(req, '', '5');
      expect(mockUserService.findUsersForAssignment).toHaveBeenCalledWith(
        'tenant-1',
        'COORDINADOR',
        '',
        5,
      );
    });
  });

  describe('getCommercials', () => {
    it('should delegate to findUsersForAssignment with COMERCIAL', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      mockUserService.findUsersForAssignment.mockResolvedValue([{ id: 'u-2' }]);

      const result = await controller.getCommercials(req, 'maria', '10');
      expect(mockUserService.findUsersForAssignment).toHaveBeenCalledWith(
        'tenant-1',
        'COMERCIAL',
        'maria',
        10,
      );
      expect(result).toEqual([{ id: 'u-2' }]);
    });
  });

  describe('update password', () => {
    it('should delegate to userService.changeUserPassword', async () => {
      const dto: UpdateUserPasswordDto = {
        document: '12345678',
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };
      mockUserService.changeUserPassword.mockResolvedValue({
        message: 'Password updated',
      });

      const result = await controller.update(dto);
      expect(mockUserService.changeUserPassword).toHaveBeenCalledWith(
        dto.document,
        dto.oldPassword,
        dto.newPassword,
      );
      expect(result).toEqual({ message: 'Password updated' });
    });
  });

  describe('adminReset password', () => {
    it('should delegate to userService.resetPassword', async () => {
      const dto: AdminResetPasswordDto = {
        document: '12345678',
        newPassword: 'NewPassword123!',
      };
      mockUserService.resetPassword.mockResolvedValue({
        message: 'Password reset',
      });

      const result = await controller.adminReset(dto);
      expect(mockUserService.resetPassword).toHaveBeenCalledWith(
        dto.document,
        dto.newPassword,
      );
      expect(result).toEqual({ message: 'Password reset' });
    });
  });

  describe('updateStatus', () => {
    it('should delegate to userService.updateUserStatus with userId and isActive', async () => {
      const dto: UpdateUserStatusDto = { isActive: false };
      mockUserService.updateUserStatus.mockResolvedValue({
        id: 'u-1',
        isActive: false,
      });

      const result = await controller.updateStatus('u-1', dto);
      expect(mockUserService.updateUserStatus).toHaveBeenCalledWith(
        'u-1',
        false,
      );
      expect(result).toEqual({ id: 'u-1', isActive: false });
    });
  });

  describe('remove', () => {
    it('should delegate to userService.softDelete', async () => {
      mockUserService.softDelete.mockResolvedValue({
        id: 'u-1',
        isActive: false,
      });

      const result = await controller.remove('u-1');
      expect(mockUserService.softDelete).toHaveBeenCalledWith('u-1');
      expect(result).toEqual({ id: 'u-1', isActive: false });
    });
  });
});
