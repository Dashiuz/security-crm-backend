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
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
});
