import { NotFoundException } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentRepositoryService } from '../../../common/repository/department/department.repository.service';
import { UserRepositoryService } from '../../../common/repository/user/user.repository.service';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let mockDeptRepo: jest.Mocked<Partial<DepartmentRepositoryService>>;
  let mockUserRepo: jest.Mocked<Partial<UserRepositoryService>>;

  beforeEach(() => {
    mockDeptRepo = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    mockUserRepo = {
      findNamesByIds: jest.fn().mockResolvedValue(new Map()),
    };

    service = new DepartmentService(
      mockDeptRepo as unknown as DepartmentRepositoryService,
      mockUserRepo as unknown as UserRepositoryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should normalize department name to uppercase and create', async () => {
      const dto = {
        name: '  seguridad y vigilancia  ',
        description: 'Depto',
      } as any;
      const created = { id: 'dept-1', name: 'SEGURIDAD Y VIGILANCIA' };
      (mockDeptRepo.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(dto);
      expect(mockDeptRepo.create).toHaveBeenCalledWith({
        ...dto,
        name: 'SEGURIDAD Y VIGILANCIA',
      });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return all departments and resolve createdBy names', async () => {
      const depts = [
        { id: '1', name: 'OPERACIONES', createdBy: 'user-1' },
        { id: '2', name: 'ADMINISTRACION', createdBy: 'system' },
        { id: '3', name: 'LOGISTICA', createdBy: null },
      ];
      (mockDeptRepo.findMany as jest.Mock).mockResolvedValue(depts);
      const userMap = new Map([['user-1', 'Admin Carlos']]);
      (mockUserRepo.findNamesByIds as jest.Mock).mockResolvedValue(userMap);

      const result = await service.findAll();
      expect(result).toHaveLength(3);
      expect(result[0].createdBy).toBe('Admin Carlos');
      expect(result[1].createdBy).toBe('system');
      expect(result[2].createdBy).toBe('system');
    });
  });

  describe('findOne', () => {
    it('should return department with resolved createdBy name', async () => {
      const dept = { id: '1', name: 'OPERACIONES', createdBy: 'user-1' };
      (mockDeptRepo.findOne as jest.Mock).mockResolvedValue(dept);
      const userMap = new Map([['user-1', 'Admin Carlos']]);
      (mockUserRepo.findNamesByIds as jest.Mock).mockResolvedValue(userMap);

      const result = await service.findOne('1');
      expect(result.name).toBe('OPERACIONES');
      expect(result.createdBy).toBe('Admin Carlos');
    });

    it('should throw NotFoundException if department does not exist', async () => {
      (mockDeptRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should normalize name and call update', async () => {
      const dto = { name: '  nuevo nombre  ' };
      const updated = { id: '1', name: 'NUEVO NOMBRE' };
      (mockDeptRepo.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('1', dto);
      expect(mockDeptRepo.update).toHaveBeenCalledWith('1', {
        name: 'NUEVO NOMBRE',
      });
      expect(result).toEqual(updated);
    });

    it('should call update without name if not provided', async () => {
      const dto = { isActive: false } as any;
      (mockDeptRepo.update as jest.Mock).mockResolvedValue({
        id: '1',
        isActive: false,
      });

      await service.update('1', dto);
      expect(mockDeptRepo.update).toHaveBeenCalledWith('1', {
        isActive: false,
      });
    });
  });

  describe('remove', () => {
    it('should call remove on repository', async () => {
      (mockDeptRepo.remove as jest.Mock).mockResolvedValue({ id: '1' });

      const result = await service.remove('1');
      expect(mockDeptRepo.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('importDepartmentsFromCsv', () => {
    it('should import valid departments and parse boolean statuses', async () => {
      (mockDeptRepo.findMany as jest.Mock).mockResolvedValue([
        { id: '1', name: 'EXISTENTE' },
      ]);
      (mockDeptRepo.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'new-id', ...data }),
      );

      const csvData: Array<Record<string, string>> = [
        { Nombre: 'Finanzas', EstadoActivo: 'activo' },
        { name: 'Sistemas', Activo: '0' },
      ];

      const result = await service.importDepartmentsFromCsv(
        csvData,
        'depts.csv',
        { sub: 'user-regular', roles: ['ADMIN'] },
      );

      expect(result.status).toBe('completed');
      expect(result.successRows).toBe(2);
      expect(result.errorRows).toBe(0);
      expect(mockDeptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FINANZAS',
          isActive: true,
          createdBy: 'user-regular',
        }),
      );
      expect(mockDeptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'SISTEMAS',
          isActive: false,
          createdBy: 'user-regular',
        }),
      );
    });

    it('should handle GODLIKE user as system createdBy', async () => {
      (mockDeptRepo.findMany as jest.Mock).mockResolvedValue([]);
      (mockDeptRepo.create as jest.Mock).mockResolvedValue({ id: '1' });

      const csvData = [{ Nombre: 'Legal' }];

      await service.importDepartmentsFromCsv(csvData, 'depts.csv', {
        roles: ['GODLIKE'],
        sub: 'superadmin',
      });

      expect(mockDeptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'system',
        }),
      );
    });

    it('should record error when name is empty', async () => {
      (mockDeptRepo.findMany as jest.Mock).mockResolvedValue([]);

      const csvData = [{ Nombre: '   ' }];

      const result = await service.importDepartmentsFromCsv(
        csvData,
        'depts.csv',
        { sub: 'user-1' },
      );

      expect(result.errorRows).toBe(1);
      expect(result.errors[0].reason).toContain('obligatorio');
      expect(mockDeptRepo.create).not.toHaveBeenCalled();
    });

    it('should record error when department already exists', async () => {
      (mockDeptRepo.findMany as jest.Mock).mockResolvedValue([
        { id: '1', name: 'FINANZAS' },
      ]);

      const csvData = [{ Nombre: 'finanzas' }];

      const result = await service.importDepartmentsFromCsv(
        csvData,
        'depts.csv',
        { sub: 'user-1' },
      );

      expect(result.errorRows).toBe(1);
      expect(result.errors[0].reason).toContain('ya existe');
    });

    it('should handle repository creation exception and log error', async () => {
      (mockDeptRepo.findMany as jest.Mock).mockResolvedValue([]);
      (mockDeptRepo.create as jest.Mock).mockRejectedValue(
        new Error('DB failure'),
      );

      const csvData = [{ Nombre: 'Auditoria' }];

      const result = await service.importDepartmentsFromCsv(
        csvData,
        'depts.csv',
        { sub: 'user-1' },
      );

      expect(result.errorRows).toBe(1);
      expect(result.errors[0].reason).toContain('DB failure');
    });
  });
});
