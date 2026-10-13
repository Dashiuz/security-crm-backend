import { Test, TestingModule } from '@nestjs/testing';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';

describe('PermissionController', () => {
  let controller: PermissionController;
  let mockPermissionService: any;

  beforeEach(async () => {
    mockPermissionService = {
      create: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        { provide: PermissionService, useValue: mockPermissionService },
      ],
    }).compile();

    controller = module.get<PermissionController>(PermissionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
