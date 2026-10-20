import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';

describe('DepartmentController', () => {
  let controller: DepartmentController;
  let mockDepartmentService: any;

  beforeEach(async () => {
    mockDepartmentService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      importDepartmentsFromCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentController],
      providers: [
        {
          provide: DepartmentService,
          useValue: mockDepartmentService,
        },
      ],
    }).compile();

    controller = module.get<DepartmentController>(DepartmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate create to departmentService.create', async () => {
      const dto = { name: 'OPERACIONES' };
      mockDepartmentService.create.mockResolvedValue({ id: 'dep-1', ...dto });

      const result = await controller.create(dto);
      expect(mockDepartmentService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'dep-1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should delegate findAll to departmentService.findAll', async () => {
      const departments = [{ id: 'dep-1', name: 'OPERACIONES' }];
      mockDepartmentService.findAll.mockResolvedValue(departments);

      const result = await controller.findAll();
      expect(mockDepartmentService.findAll).toHaveBeenCalled();
      expect(result).toEqual(departments);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to departmentService.findOne', async () => {
      const dep = { id: 'dep-1', name: 'OPERACIONES' };
      mockDepartmentService.findOne.mockResolvedValue(dep);

      const result = await controller.findOne('dep-1');
      expect(mockDepartmentService.findOne).toHaveBeenCalledWith('dep-1');
      expect(result).toEqual(dep);
    });
  });

  describe('update', () => {
    it('should delegate update to departmentService.update', async () => {
      const dto = { name: 'OPERACIONES Y LOGÍSTICA' };
      mockDepartmentService.update.mockResolvedValue({ id: 'dep-1', ...dto });

      const result = await controller.update('dep-1', dto);
      expect(mockDepartmentService.update).toHaveBeenCalledWith('dep-1', dto);
      expect(result).toEqual({ id: 'dep-1', ...dto });
    });
  });

  describe('toggleStatus', () => {
    it('should delegate toggleStatus to departmentService.update with isActive', async () => {
      mockDepartmentService.update.mockResolvedValue({
        id: 'dep-1',
        isActive: false,
      });

      const result = await controller.toggleStatus('dep-1', false);
      expect(mockDepartmentService.update).toHaveBeenCalledWith('dep-1', {
        isActive: false,
      });
      expect(result).toEqual({ id: 'dep-1', isActive: false });
    });
  });

  describe('remove', () => {
    it('should delegate remove to departmentService.remove', async () => {
      mockDepartmentService.remove.mockResolvedValue({ id: 'dep-1' });

      const result = await controller.remove('dep-1');
      expect(mockDepartmentService.remove).toHaveBeenCalledWith('dep-1');
      expect(result).toEqual({ id: 'dep-1' });
    });
  });

  describe('importCsv', () => {
    it('should delegate importCsv to departmentService.importDepartmentsFromCsv with user and payload', async () => {
      const body = {
        data: [{ Nombre: 'Operaciones' }],
        fileName: 'custom.csv',
      };
      const req = { user: { sub: 'usr-1', roles: ['ADMIN'] } };
      mockDepartmentService.importDepartmentsFromCsv.mockResolvedValue({
        status: 'completed',
        successRows: 1,
      });

      const result = await controller.importCsv(body, req);
      expect(
        mockDepartmentService.importDepartmentsFromCsv,
      ).toHaveBeenCalledWith(body.data, body.fileName, req.user);
      expect(result).toEqual({ status: 'completed', successRows: 1 });
    });
  });
});
