import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import {
  EmployeeRepositoryService,
  UserRepositoryService,
  DepartmentRepositoryService,
  PositionRepositoryService,
  ClientRepositoryService,
} from '../../../common/repository/index';
import { S3Service } from '../../storage/services/s3.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockEmployeeRepository: any;
  let mockUserRepository: any;
  let mockDepartmentRepository: any;
  let mockPositionRepository: any;
  let mockClientRepository: any;
  let mockS3Service: any;
  let mockPrisma: any;

  const mockEmployee = {
    id: 'emp-1',
    tenantId: 'tenant-1',
    firstName: 'Carlos',
    secondName: null,
    lastName: 'Gomez',
    maternalSurname: null,
    fullName: 'Carlos Gomez',
    documentType: 'CC',
    document: '12345678',
    gender: 'M',
    address: 'Calle 10 # 20-30',
    email: 'carlos@example.com',
    phone: '3001234567',
    birthdate: new Date('1990-01-01'),
    entryDate: new Date('2025-01-01'),
    isActive: true,
    isRetired: false,
    clientId: null,
    client: null,
    departmentId: 'dept-1',
    positionId: 'pos-1',
    clientHistory: [],
    mediaAttachments: [],
  };

  const mockClientA = {
    id: 'client-1',
    name: 'Conjunto Residencial Los Sauces',
    internalCode: 'CLI-2001',
  };

  const mockClientB = {
    id: 'client-2',
    name: 'Edificio Parque Central',
    internalCode: 'CLI-2002',
  };

  beforeEach(async () => {
    mockEmployeeRepository = {
      createEmployee: jest.fn(),
      findAnyById: jest.fn().mockResolvedValue({ ...mockEmployee }),
      findActiveByDocument: jest.fn(),
      findAll: jest.fn(),
      findWithRefsById: jest.fn(),
      updateEmployee: jest.fn(),
      softDeleteEmployee: jest.fn(),
      retireEmployee: jest.fn(),
      reactivateEmployee: jest.fn(),
      autocomplete: jest.fn(),
    };

    mockUserRepository = {
      findByDocument: jest
        .fn()
        .mockResolvedValue({ id: 'user-1', clientId: null }),
      updateUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
      checkTenantActive: jest.fn().mockResolvedValue(true),
    };

    mockDepartmentRepository = {
      getDepartmentById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    };

    mockPositionRepository = {
      getPositionById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    };

    mockClientRepository = {
      findOne: jest.fn().mockImplementation((id: string) => {
        if (id === 'client-1') return Promise.resolve(mockClientA);
        if (id === 'client-2') return Promise.resolve(mockClientB);
        return Promise.resolve(null);
      }),
    };

    mockS3Service = {
      getPresignedUrl: jest
        .fn()
        .mockResolvedValue('https://s3.example.com/avatar.jpg'),
    };

    mockPrisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', clientId: null }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'user-new', roles: [] }),
        update: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      role: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'role-emp', name: 'EMPLOYEE' }),
      },
      userClientAccess: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'uca-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      position: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'pos-new', name: 'DIRECTOR_OPERACIONES' }),
      },
      department: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'dept-new', name: 'OPERACIONES' }),
      },
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
        {
          provide: ClientRepositoryService,
          useValue: mockClientRepository,
        },
        { provide: S3Service, useValue: mockS3Service },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignClient', () => {
    it('should assign a client for the first time to an employee with no previous client', async () => {
      mockEmployeeRepository.updateEmployee.mockImplementation(
        (id: string, data: any) =>
          Promise.resolve({
            ...mockEmployee,
            clientId: data.clientId,
            client: mockClientA,
            clientHistory: data.clientHistory,
          }),
      );

      const result = await service.assignClient(
        'emp-1',
        {
          clientId: 'client-1',
          assignedAt: '2026-10-15',
          notes: 'Asignación inicial a puesto',
        },
        'admin@noxia.com',
      );

      expect(result.clientId).toBe('client-1');
      expect(result.clientName).toBe('Conjunto Residencial Los Sauces');
      expect(result.clientHistory).toBeDefined();
      expect(result.clientHistory?.length).toBe(1);

      const historyItem = result.clientHistory?.[0];
      expect(historyItem?.clientId).toBe('client-1');
      expect(historyItem?.clientName).toBe('Conjunto Residencial Los Sauces');
      expect(historyItem?.clientCode).toBe('CLI-2001');
      expect(historyItem?.assignedAt).toBe('2026-10-15');
      expect(historyItem?.unassignedAt).toBeNull();
      expect(historyItem?.recordedBy).toBe('admin@noxia.com');

      // Verify sync with User account
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', {
        clientId: 'client-1',
      });
    });

    it('should transfer an employee from client-1 to client-2, closing previous assignment and opening new one', async () => {
      // Employee currently assigned to client-1
      const initialHistory = [
        {
          id: 'hist-1',
          clientId: 'client-1',
          clientName: 'Conjunto Residencial Los Sauces',
          clientCode: 'CLI-2001',
          assignedAt: '2026-05-01',
          unassignedAt: null,
          recordedAt: '2026-05-01T10:00:00.000Z',
          recordedBy: 'admin@noxia.com',
          notes: 'Inicio',
        },
      ];

      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: 'client-1',
        client: mockClientA,
        clientHistory: initialHistory,
      });

      mockEmployeeRepository.updateEmployee.mockImplementation(
        (id: string, data: any) =>
          Promise.resolve({
            ...mockEmployee,
            clientId: data.clientId,
            client: mockClientB,
            clientHistory: data.clientHistory,
          }),
      );

      const result = await service.assignClient(
        'emp-1',
        {
          clientId: 'client-2',
          unassignedAt: '2026-10-14',
          assignedAt: '2026-10-15',
          notes: 'Traslado a Parque Central',
          isConcurrent: false,
        },
        'admin@noxia.com',
      );

      expect(result.clientId).toBe('client-2');
      expect(result.clientHistory?.length).toBe(2);

      // Previous assignment closed
      const prevItem = result.clientHistory?.[0];
      expect(prevItem?.clientId).toBe('client-1');
      expect(prevItem?.unassignedAt).toBe('2026-10-14');

      // New assignment active
      const newItem = result.clientHistory?.[1];
      expect(newItem?.clientId).toBe('client-2');
      expect(newItem?.clientName).toBe('Edificio Parque Central');
      expect(newItem?.assignedAt).toBe('2026-10-15');
      expect(newItem?.unassignedAt).toBeNull();
    });

    it('should throw BadRequestException when unassignedAt is after assignedAt', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: 'client-1',
        client: mockClientA,
      });

      await expect(
        service.assignClient('emp-1', {
          clientId: 'client-2',
          unassignedAt: '2026-10-20',
          assignedAt: '2026-10-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when assigning to an inactive or retired employee', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        isRetired: true,
      });

      await expect(
        service.assignClient('emp-1', { clientId: 'client-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when target client does not exist', async () => {
      await expect(
        service.assignClient('emp-1', { clientId: 'client-999' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unassignClient', () => {
    it('should unassign current client, set clientId to null, and close the active history entry', async () => {
      const activeHistory = [
        {
          id: 'hist-1',
          clientId: 'client-1',
          clientName: 'Conjunto Residencial Los Sauces',
          clientCode: 'CLI-2001',
          assignedAt: '2026-05-01',
          unassignedAt: null,
          recordedAt: '2026-05-01T10:00:00.000Z',
          recordedBy: 'admin@noxia.com',
          notes: 'Activo',
        },
      ];

      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: 'client-1',
        client: mockClientA,
        clientHistory: activeHistory,
      });

      mockEmployeeRepository.updateEmployee.mockImplementation(
        (id: string, data: any) =>
          Promise.resolve({
            ...mockEmployee,
            clientId: null,
            client: null,
            clientHistory: data.clientHistory,
          }),
      );

      const result = await service.unassignClient(
        'emp-1',
        {
          unassignedAt: '2026-10-15',
          notes: 'Fin de asignación, pasa a disponibilidad',
        },
        'supervisor@noxia.com',
      );

      expect(result.clientId).toBeNull();
      expect(result.clientName).toBeNull();
      expect(result.clientHistory?.length).toBe(1);
      expect(result.clientHistory?.[0].unassignedAt).toBe('2026-10-15');

      // Verify user clientId was set to null
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', {
        clientId: null,
      });
    });

    it('should throw BadRequestException when trying to unassign an employee with no current client', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: null,
      });

      await expect(service.unassignClient('emp-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should unassign a specific client when clientId is provided in multi-assignment scenario', async () => {
      const activeHistory = [
        {
          id: 'hist-1',
          clientId: 'client-1',
          clientName: 'Conjunto 1',
          assignedAt: '2026-05-01',
          unassignedAt: null,
        },
        {
          id: 'hist-2',
          clientId: 'client-2',
          clientName: 'Conjunto 2',
          assignedAt: '2026-06-01',
          unassignedAt: null,
        },
      ];

      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: 'client-2',
        clientHistory: activeHistory,
      });

      mockEmployeeRepository.updateEmployee.mockImplementation(
        (id: string, data: any) =>
          Promise.resolve({
            ...mockEmployee,
            clientId: data.clientId,
            clientHistory: data.clientHistory,
          }),
      );

      const result = await service.unassignClient('emp-1', {
        clientId: 'client-1',
        unassignedAt: '2026-10-17',
      });

      expect(result.clientId).toBe('client-2');
      const unassigned = result.clientHistory?.find(
        (h) => h.clientId === 'client-1',
      );
      expect(unassigned?.unassignedAt).toBe('2026-10-17');
    });
  });

  describe('Multi-Client Concurrent Assignments (SPEC-REG-015)', () => {
    it('should assign client concurrently without closing existing assignments by default', async () => {
      const initialHistory = [
        {
          id: 'hist-1',
          clientId: 'client-1',
          clientName: 'Conjunto 1',
          assignedAt: '2026-05-01',
          unassignedAt: null,
        },
      ];

      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: 'client-1',
        clientHistory: initialHistory,
      });

      mockEmployeeRepository.updateEmployee.mockImplementation(
        (id: string, data: any) =>
          Promise.resolve({
            ...mockEmployee,
            clientId: data.clientId,
            clientHistory: data.clientHistory,
          }),
      );

      const result = await service.assignClient('emp-1', {
        clientId: 'client-2',
        assignedAt: '2026-10-17',
      });

      expect(result.clientHistory).toHaveLength(2);
      expect(result.clientHistory?.[0].unassignedAt).toBeNull();
      expect(result.clientHistory?.[1].unassignedAt).toBeNull();
      expect(mockPrisma.userClientAccess.upsert).toBeDefined();
    });

    it('should throw BadRequestException if client is already actively assigned', async () => {
      const initialHistory = [
        {
          id: 'hist-1',
          clientId: 'client-1',
          clientName: 'Conjunto 1',
          assignedAt: '2026-05-01',
          unassignedAt: null,
        },
      ];

      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: 'client-1',
        clientHistory: initialHistory,
      });

      await expect(
        service.assignClient('emp-1', { clientId: 'client-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Workforce Summary & Enable User (SPEC-REG-015)', () => {
    it('getWorkforceSummary should return consolidated employee, user, and active assignments', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientHistory: [
          {
            id: 'h1',
            clientId: 'client-1',
            clientName: 'Los Sauces',
            assignedAt: '2026-05-01',
            unassignedAt: null,
          },
        ],
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-linked',
        document: mockEmployee.document,
        fullName: mockEmployee.fullName,
        userType: 'EMPLOYEE',
        isActive: true,
        isFirstLogin: false,
        createdAt: new Date(),
        roles: [{ role: { id: 'r1', name: 'SUPERVISOR' } }],
        clientAccesses: [
          {
            clientId: 'client-1',
            roleName: 'SUPERVISOR',
            createdAt: new Date(),
            client: { id: 'client-1', name: 'Los Sauces' },
          },
        ],
      });

      const summary = await service.getWorkforceSummary('emp-1');
      expect(summary.employee.id).toBe('emp-1');
      expect(summary.user?.fullName).toBe(mockEmployee.fullName);
      expect(summary.activeAssignments).toHaveLength(1);
      expect(summary.activeAssignments[0].clientName).toBe('Los Sauces');
    });

    it('enableUser should hash password, create user, and inherit active assignments', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        clientId: 'client-1',
        clientHistory: [
          {
            id: 'h1',
            clientId: 'client-1',
            clientName: 'Los Sauces',
            assignedAt: '2026-05-01',
            unassignedAt: null,
          },
        ],
      });

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-1',
        document: mockEmployee.document,
        fullName: mockEmployee.fullName,
        roles: [],
      });

      const result = await service.enableUser('emp-1', {
        password: 'Password123*',
      });

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.userClientAccess.updateMany).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
        data: { userId: 'new-user-1' },
      });
      expect(mockPrisma.userClientAccess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            employeeId_clientId: {
              employeeId: 'emp-1',
              clientId: 'client-1',
            },
          },
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('CRUD and lifecycle methods', () => {
    it('createEmployee should validate dates and create employee', async () => {
      mockEmployeeRepository.createEmployee.mockResolvedValue({
        ...mockEmployee,
        id: 'new-emp',
      });

      const dto = {
        firstName: 'Carlos',
        lastName: 'Ruiz',
        documentType: 'CC',
        document: '99887766',
        gender: 'M',
        address: 'Calle 100',
        birthdate: '1990-01-01',
        entryDate: '2020-01-01',
        isActive: true,
      } as any;

      const result = await service.createEmployee('tenant-1', dto);
      expect(mockEmployeeRepository.createEmployee).toHaveBeenCalled();
      expect(result.id).toBe('new-emp');
    });

    it('createEmployee should throw BadRequestException if birthdate is after entryDate', async () => {
      const dto = {
        firstName: 'Carlos',
        lastName: 'Ruiz',
        documentType: 'CC',
        document: '99887766',
        gender: 'M',
        address: 'Calle 100',
        birthdate: '2025-01-01',
        entryDate: '2020-01-01',
      } as any;

      await expect(service.createEmployee('tenant-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('findAll should return all employees and enrich with user digital info', async () => {
      mockEmployeeRepository.findAll.mockResolvedValue([{ ...mockEmployee }]);
      mockPrisma.user.findMany = jest.fn().mockResolvedValue([
        {
          document: mockEmployee.document,
          roles: [{ role: { name: 'COORDINATOR' } }],
        },
      ]);

      const result = await service.findAll();
      expect(mockEmployeeRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].hasUser).toBe(true);
      expect(result[0].userRole).toBe('COORDINATOR');
    });

    it('findActiveByDocument should return active employee or null', async () => {
      mockEmployeeRepository.findActiveByDocument.mockResolvedValue({
        ...mockEmployee,
      });

      const result = await service.findActiveByDocument(mockEmployee.document);
      expect(result?.document).toBe(mockEmployee.document);
    });

    it('findAnyEmployeeById should return employee with refs', async () => {
      mockEmployeeRepository.findWithRefsById.mockResolvedValue({
        ...mockEmployee,
      });

      const result = await service.findAnyEmployeeById('emp-1');
      expect(result?.id).toBe('emp-1');
    });

    it('updateEmployee should update employee and return mapped response', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({ ...mockEmployee });
      mockEmployeeRepository.updateEmployee.mockResolvedValue({
        ...mockEmployee,
        firstName: 'Juan Modificado',
      });

      const result = await service.updateEmployee('emp-1', {
        firstName: 'Juan Modificado',
      } as any);

      expect(mockEmployeeRepository.updateEmployee).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('updateEmployee should sync position and department to user account when updated', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({ ...mockEmployee });
      mockEmployeeRepository.updateEmployee.mockResolvedValue({
        ...mockEmployee,
        positionId: 'pos-new',
        departmentId: 'dept-new',
      });
      mockUserRepository.findByDocument.mockResolvedValue({ id: 'user-1' });
      mockPrisma.position.findUnique.mockResolvedValue({
        id: 'pos-new',
        name: 'DIRECTOR_OPERACIONES',
      });
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'dept-new',
        name: 'OPERACIONES',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await service.updateEmployee('emp-1', {
        positionId: 'pos-new',
        departmentId: 'dept-new',
      } as any);

      expect(mockEmployeeRepository.updateEmployee).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          position: 'DIRECTOR_OPERACIONES',
          department: 'OPERACIONES',
        },
      });
      expect(result).toBeDefined();
    });

    it('retireEmployee should mark employee as retired', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({ ...mockEmployee });
      mockEmployeeRepository.retireEmployee.mockResolvedValue({
        ...mockEmployee,
        isRetired: true,
      });

      const result = await service.retireEmployee('emp-1');
      expect(mockEmployeeRepository.retireEmployee).toHaveBeenCalledWith(
        'emp-1',
      );
      expect(result).toBeDefined();
    });

    it('reactivateEmployee should reactivate retired employee', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({
        ...mockEmployee,
        isRetired: true,
      });
      mockEmployeeRepository.reactivateEmployee.mockResolvedValue({
        ...mockEmployee,
        isRetired: false,
        isActive: true,
      });

      const result = await service.reactivateEmployee('emp-1');
      expect(mockEmployeeRepository.reactivateEmployee).toHaveBeenCalledWith(
        'emp-1',
      );
      expect(result).toBeDefined();
    });

    it('softDeleteEmployee should call repository softDeleteEmployee', async () => {
      mockEmployeeRepository.findAnyById.mockResolvedValue({ ...mockEmployee });
      mockEmployeeRepository.softDeleteEmployee.mockResolvedValue({
        ...mockEmployee,
        isDeleted: true,
      });

      await service.softDeleteEmployee('emp-1');
      expect(mockEmployeeRepository.softDeleteEmployee).toHaveBeenCalledWith(
        'emp-1',
      );
    });

    it('autocomplete should call repository autocomplete', async () => {
      mockEmployeeRepository.autocomplete.mockResolvedValue([
        { id: 'emp-1', fullName: 'Juan Perez' },
      ]);

      const result = await service.autocomplete('Juan', 'tenant-1', 10);
      expect(mockEmployeeRepository.autocomplete).toHaveBeenCalledWith(
        'Juan',
        'tenant-1',
        10,
      );
      expect(result).toHaveLength(1);
    });

    it('importEmployeesFromCsv should process rows and return summary', async () => {
      mockEmployeeRepository.findActiveByDocument.mockResolvedValue(null);
      mockEmployeeRepository.createEmployee.mockResolvedValue({
        ...mockEmployee,
        id: 'imported-1',
      });

      const csvData: Array<Record<string, string>> = [
        {
          Nombre: 'Pedro',
          Apellido: 'Ramirez',
          TipoDocumento: 'CC',
          Documento: '10203040',
          Telefono: '3001234567',
          FechaNacimiento: '1995-05-15',
          FechaIngreso: '2022-01-10',
        },
        {
          Nombre: '', // missing required field
          Apellido: 'Lopez',
        },
      ];

      const res = await service.importEmployeesFromCsv(
        csvData,
        'employees.csv',
        { tenantId: 'tenant-1', id: 'user-admin' },
      );

      expect(res.totalRows).toBe(2);
      expect(res.successRows).toBe(1);
      expect(res.errorRows).toBe(1);
    });
  });
});
