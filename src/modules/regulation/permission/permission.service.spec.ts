import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PermissionRepositoryService } from '../../../common/repository/index';
import { RequestContextService } from '../../../common/context/request-context.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let mockPermissionRepository: any;
  let mockContextService: any;

  beforeEach(async () => {
    mockPermissionRepository = {
      createPermission: jest.fn(),
      getPermissionById: jest.fn(),
      getPermissionByKey: jest.fn(),
      listPermissions: jest.fn().mockResolvedValue([
        { id: '1', key: 'user:read', desc: 'Read users' },
        { id: '2', key: 'godlike:manage', desc: 'SuperAdmin' },
      ]),
      updatePermission: jest.fn(),
      deletePermission: jest.fn(),
    };

    mockContextService = {
      isGodlike: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PermissionRepositoryService,
          useValue: mockPermissionRepository,
        },
        { provide: RequestContextService, useValue: mockContextService },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should filter out godlike permissions for non-godlike users', async () => {
    const permissions = await service.list();
    expect(permissions).toHaveLength(1);
    expect(permissions[0].key).toBe('user:read');
  });
});
