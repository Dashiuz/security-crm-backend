import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import {
  UserRepositoryService,
  EmployeeRepositoryService,
  RoleRepositoryService,
} from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepository: any;
  let mockEmployeeRepository: any;
  let mockRoleRepository: any;
  let mockContextService: any;

  beforeEach(async () => {
    mockUserRepository = {
      createUser: jest.fn(),
      findUserById: jest.fn(),
      findActiveByDocument: jest.fn(),
      listUsers: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    };

    mockEmployeeRepository = {
      findEmployeeById: jest.fn(),
      findEmployeeByDocument: jest.fn(),
    };

    mockRoleRepository = {
      getRoleById: jest.fn(),
    };

    mockContextService = {
      userId: 'test-admin',
      tenantId: 'test-tenant',
      isGodlike: false,
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
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
