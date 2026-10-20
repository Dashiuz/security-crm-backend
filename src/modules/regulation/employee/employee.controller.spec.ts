import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

describe('EmployeeController', () => {
  let controller: EmployeeController;
  let mockEmployeeService: any;

  beforeEach(async () => {
    mockEmployeeService = {
      createEmployee: jest.fn(),
      findAll: jest.fn(),
      findAnyEmployeeById: jest.fn(),
      updateEmployee: jest.fn(),
      softDeleteEmployee: jest.fn(),
      retireEmployee: jest.fn(),
      reactivateEmployee: jest.fn(),
      assignClient: jest.fn(),
      unassignClient: jest.fn(),
      getWorkforceSummary: jest.fn(),
      enableUser: jest.fn(),
      autocomplete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [{ provide: EmployeeService, useValue: mockEmployeeService }],
    }).compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('assignClient', () => {
    it('should call employeeService.assignClient with proper arguments', async () => {
      const dto = {
        clientId: 'client-1',
        assignedAt: '2026-10-15',
        notes: 'Puesto asignado',
      };
      const req = { user: { email: 'admin@noxia.com', id: 'user-admin' } };
      mockEmployeeService.assignClient.mockResolvedValue({
        id: 'emp-1',
        clientId: 'client-1',
      });

      const result = await controller.assignClient('emp-1', dto, req);

      expect(mockEmployeeService.assignClient).toHaveBeenCalledWith(
        'emp-1',
        dto,
        'admin@noxia.com',
      );
      expect(result).toEqual({ id: 'emp-1', clientId: 'client-1' });
    });

    it('assignClientPost should also delegate to employeeService.assignClient', async () => {
      const dto = { clientId: 'client-1' };
      const req = { user: { email: 'admin@noxia.com' } };
      mockEmployeeService.assignClient.mockResolvedValue({ id: 'emp-1' });

      const result = await controller.assignClientPost('emp-1', dto, req);
      expect(mockEmployeeService.assignClient).toHaveBeenCalledWith(
        'emp-1',
        dto,
        'admin@noxia.com',
      );
      expect(result).toEqual({ id: 'emp-1' });
    });
  });

  describe('unassignClient', () => {
    it('should call employeeService.unassignClient with proper arguments', async () => {
      const dto = {
        unassignedAt: '2026-10-15',
        notes: 'Desvinculación',
      };
      const req = { user: { email: 'admin@noxia.com', id: 'user-admin' } };
      mockEmployeeService.unassignClient.mockResolvedValue({
        id: 'emp-1',
        clientId: null,
      });

      const result = await controller.unassignClient('emp-1', dto, req);

      expect(mockEmployeeService.unassignClient).toHaveBeenCalledWith(
        'emp-1',
        dto,
        'admin@noxia.com',
      );
      expect(result).toEqual({ id: 'emp-1', clientId: null });
    });

    it('unassignClientPost should also delegate to employeeService.unassignClient', async () => {
      const dto = { clientId: 'client-1' };
      const req = { user: { email: 'admin@noxia.com' } };
      mockEmployeeService.unassignClient.mockResolvedValue({ id: 'emp-1' });

      const result = await controller.unassignClientPost('emp-1', dto, req);
      expect(mockEmployeeService.unassignClient).toHaveBeenCalledWith(
        'emp-1',
        dto,
        'admin@noxia.com',
      );
      expect(result).toEqual({ id: 'emp-1' });
    });
  });

  describe('Workforce Summary & Enable User (SPEC-REG-015)', () => {
    it('getWorkforceSummary should delegate to service.getWorkforceSummary', async () => {
      mockEmployeeService.getWorkforceSummary.mockResolvedValue({
        employee: { id: 'emp-1' },
        user: null,
        activeAssignments: [],
      });

      const result = await controller.getWorkforceSummary('emp-1');
      expect(mockEmployeeService.getWorkforceSummary).toHaveBeenCalledWith(
        'emp-1',
      );
      expect(result.employee.id).toBe('emp-1');
    });

    it('enableUser should delegate to service.enableUser', async () => {
      const dto = { password: 'SecretPassword123*' };
      const req = { user: { email: 'admin@noxia.com' } };
      mockEmployeeService.enableUser.mockResolvedValue({
        employee: { id: 'emp-1' },
        user: { id: 'u-1' },
      });

      const result = await controller.enableUser('emp-1', dto, req);
      expect(mockEmployeeService.enableUser).toHaveBeenCalledWith(
        'emp-1',
        dto,
        'admin@noxia.com',
      );
      expect(result.user?.id).toBe('u-1');
    });
  });

  describe('CRUD and lifecycle endpoints', () => {
    it('create should delegate to service.createEmployee', async () => {
      const dto = { firstName: 'Juan', lastName: 'Perez' } as any;
      const req = { user: { tenantId: 'tenant-1' } };
      mockEmployeeService.createEmployee.mockResolvedValue({ id: 'emp-1' });

      const res = await controller.create(req, dto);
      expect(mockEmployeeService.createEmployee).toHaveBeenCalledWith(
        'tenant-1',
        dto,
      );
      expect(res).toEqual({ id: 'emp-1' });
    });

    it('findAll should delegate to service.findAll', async () => {
      mockEmployeeService.findAll.mockResolvedValue([{ id: 'emp-1' }]);
      const res = await controller.findAll();
      expect(mockEmployeeService.findAll).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });

    it('reactivate should delegate to service.reactivateEmployee', async () => {
      mockEmployeeService.reactivateEmployee.mockResolvedValue({
        id: 'emp-1',
        isActive: true,
      });
      const res = await controller.reactivate('emp-1');
      expect(mockEmployeeService.reactivateEmployee).toHaveBeenCalledWith(
        'emp-1',
      );
      expect(res.isActive).toBe(true);
    });

    it('autocomplete should delegate to service.autocomplete', async () => {
      mockEmployeeService.autocomplete.mockResolvedValue([
        { id: 'emp-1', fullName: 'Juan' },
      ]);
      const req = { user: { tenantId: 'tenant-1' } };
      const res = await controller.autocomplete('Juan', '10', req);
      expect(mockEmployeeService.autocomplete).toHaveBeenCalledWith(
        'Juan',
        'tenant-1',
        10,
      );
      expect(res).toHaveLength(1);
    });
  });
});
