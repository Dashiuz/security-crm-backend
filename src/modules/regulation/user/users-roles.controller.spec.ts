import { Test, TestingModule } from '@nestjs/testing';
import { UsersRolesController } from './users-roles.controller';
import { UsersRolesService } from './users-roles.service';

describe('UsersRolesController', () => {
  let controller: UsersRolesController;
  let mockUsersRolesService: any;

  beforeEach(async () => {
    mockUsersRolesService = {
      patchUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersRolesController],
      providers: [
        {
          provide: UsersRolesService,
          useValue: mockUsersRolesService,
        },
      ],
    }).compile();

    controller = module.get<UsersRolesController>(UsersRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('patchRoles', () => {
    it('should delegate to usersRolesService.patchUserRoles with tenantId, userId, and dto', async () => {
      const req = { user: { tenantId: 'tenant-123' } };
      const dto = { addRoleIds: ['role-1'], removeRoleIds: ['role-2'] };
      const expectedRes = {
        userId: 'user-456',
        roles: [{ id: 'role-1', name: 'SUPERVISOR' }],
      };

      mockUsersRolesService.patchUserRoles.mockResolvedValue(expectedRes);

      const result = await controller.patchRoles(req, 'user-456', dto);

      expect(mockUsersRolesService.patchUserRoles).toHaveBeenCalledWith(
        'tenant-123',
        'user-456',
        dto,
      );
      expect(result).toEqual(expectedRes);
    });
  });
});
