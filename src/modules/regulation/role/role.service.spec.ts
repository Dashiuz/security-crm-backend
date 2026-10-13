import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import {
  RoleRepositoryService,
  UserRepositoryService,
} from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';

describe('RoleService', () => {
  let service: RoleService;
  let mockRoleRepository: any;
  let mockUserRepository: any;
  let mockContextService: any;

  beforeEach(async () => {
    mockRoleRepository = {
      createRole: jest.fn(),
      getRoleById: jest.fn(),
      findRoleByName: jest.fn(),
      listRoles: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      countUsersWithRole: jest.fn(),
      patchRolePermissions: jest.fn(),
    };

    mockUserRepository = {
      findUserById: jest.fn(),
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
});
