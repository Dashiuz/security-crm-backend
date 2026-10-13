import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import {
  EmployeeRepositoryService,
  UserRepositoryService,
  DepartmentRepositoryService,
  PositionRepositoryService,
} from '../../../common/repository/index';
import { S3Service } from '../../storage/services/s3.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockEmployeeRepository: any;
  let mockUserRepository: any;
  let mockDepartmentRepository: any;
  let mockPositionRepository: any;
  let mockS3Service: any;

  beforeEach(async () => {
    mockEmployeeRepository = {
      createEmployee: jest.fn(),
      getEmployeeById: jest.fn(),
      findEmployeeByDocument: jest.fn(),
      findEmployeeByEmail: jest.fn(),
      listEmployees: jest.fn(),
      updateEmployee: jest.fn(),
      deleteEmployee: jest.fn(),
      reactivateEmployee: jest.fn(),
    };

    mockUserRepository = {
      findUserById: jest.fn(),
    };

    mockDepartmentRepository = {
      getDepartmentById: jest.fn(),
    };

    mockPositionRepository = {
      getPositionById: jest.fn(),
    };

    mockS3Service = {
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/avatar.jpg'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: EmployeeRepositoryService,
          useValue: mockEmployeeRepository,
        },
        { provide: UserRepositoryService, useValue: mockUserRepository },
        {
          provide: DepartmentRepositoryService,
          useValue: mockDepartmentRepository,
        },
        {
          provide: PositionRepositoryService,
          useValue: mockPositionRepository,
        },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
