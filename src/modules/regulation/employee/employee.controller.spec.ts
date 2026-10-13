import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

describe('EmployeeController', () => {
  let controller: EmployeeController;
  let mockEmployeeService: any;

  beforeEach(async () => {
    mockEmployeeService = {
      create: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
    }).compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
