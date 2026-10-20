import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PositionService } from './position.service';
import { PositionRepositoryService } from '../../../common/repository/position/position.repository.service';
import { UserRepositoryService } from '../../../common/repository/user/user.repository.service';
import { OperationalCategory } from './dtos/position.dto';

describe('PositionService', () => {
  let service: PositionService;
  let mockPositionRepo: any;
  let mockUserRepo: any;

  beforeEach(async () => {
    mockPositionRepo = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    mockUserRepo = {
      findNamesByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionService,
        {
          provide: PositionRepositoryService,
          useValue: mockPositionRepo,
        },
        {
          provide: UserRepositoryService,
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<PositionService>(PositionService);
  });

  describe('deriveOperationalCategory', () => {
    it('should return explicit OperationalCategory when categoryStr matches enum', () => {
      expect(service.deriveOperationalCategory('Random Name', 'DIRECTOR')).toBe(
        OperationalCategory.DIRECTOR,
      );
      expect(
        service.deriveOperationalCategory('Random Name', '  coordinator  '),
      ).toBe(OperationalCategory.COORDINATOR);
      expect(
        service.deriveOperationalCategory('Random Name', 'SUPERVISOR'),
      ).toBe(OperationalCategory.SUPERVISOR);
      expect(service.deriveOperationalCategory('Random Name', 'OPERATOR')).toBe(
        OperationalCategory.OPERATOR,
      );
      expect(
        service.deriveOperationalCategory('Random Name', 'ADMINISTRATIVE'),
      ).toBe(OperationalCategory.ADMINISTRATIVE);
      expect(service.deriveOperationalCategory('Random Name', 'GUARD')).toBe(
        OperationalCategory.GUARD,
      );
      expect(service.deriveOperationalCategory('Random Name', 'OTHER')).toBe(
        OperationalCategory.OTHER,
      );
    });

    it('should infer DIRECTOR from name keywords (direct, geren)', () => {
      expect(
        service.deriveOperationalCategory('Director de Operaciones', ''),
      ).toBe(OperationalCategory.DIRECTOR);
      expect(service.deriveOperationalCategory('Gerente General', '')).toBe(
        OperationalCategory.DIRECTOR,
      );
    });

    it('should infer COORDINATOR from name keywords (coord)', () => {
      expect(
        service.deriveOperationalCategory('Coordinador de Seguridad', ''),
      ).toBe(OperationalCategory.COORDINATOR);
    });

    it('should infer SUPERVISOR from name keywords (superv)', () => {
      expect(service.deriveOperationalCategory('Supervisor de Turno', '')).toBe(
        OperationalCategory.SUPERVISOR,
      );
    });

    it('should infer OPERATOR from name keywords (cctv, medio, operad, consola)', () => {
      expect(service.deriveOperationalCategory('Operador CCTV', '')).toBe(
        OperationalCategory.OPERATOR,
      );
      expect(
        service.deriveOperationalCategory(
          'Operador de Medios Tecnológicos',
          '',
        ),
      ).toBe(OperationalCategory.OPERATOR);
      expect(
        service.deriveOperationalCategory('Controlador de Consola', ''),
      ).toBe(OperationalCategory.OPERATOR);
    });

    it('should infer ADMINISTRATIVE from name keywords (admin, comercial, rrhh, talento)', () => {
      expect(service.deriveOperationalCategory('Asistente Admin', '')).toBe(
        OperationalCategory.ADMINISTRATIVE,
      );
      expect(service.deriveOperationalCategory('Ejecutivo Comercial', '')).toBe(
        OperationalCategory.ADMINISTRATIVE,
      );
      expect(service.deriveOperationalCategory('Analista RRHH', '')).toBe(
        OperationalCategory.ADMINISTRATIVE,
      );
      expect(
        service.deriveOperationalCategory('Gestor de Talento Humano', ''),
      ).toBe(OperationalCategory.ADMINISTRATIVE);
    });

    it('should fallback to GUARD when no keywords match', () => {
      expect(
        service.deriveOperationalCategory('Vigilante de Seguridad', ''),
      ).toBe(OperationalCategory.GUARD);
      expect(service.deriveOperationalCategory('Escolta Armado', '')).toBe(
        OperationalCategory.GUARD,
      );
      expect(service.deriveOperationalCategory('', '')).toBe(
        OperationalCategory.GUARD,
      );
    });
  });

  describe('create', () => {
    it('should create position with trimmed uppercase name and explicit category', async () => {
      mockPositionRepo.create.mockResolvedValue({
        id: 'pos-1',
        name: 'SUPERVISOR GENERAL',
        operationalCategory: OperationalCategory.SUPERVISOR,
      });

      const result = await service.create({
        name: '  supervisor general  ',
        operationalCategory: OperationalCategory.SUPERVISOR,
      });

      expect(mockPositionRepo.create).toHaveBeenCalledWith({
        name: 'SUPERVISOR GENERAL',
        operationalCategory: OperationalCategory.SUPERVISOR,
      });
      expect(result).toEqual({
        id: 'pos-1',
        name: 'SUPERVISOR GENERAL',
        operationalCategory: OperationalCategory.SUPERVISOR,
      });
    });

    it('should create position and derive category if none provided', async () => {
      mockPositionRepo.create.mockResolvedValue({
        id: 'pos-2',
        name: 'DIRECTOR DE SEGURIDAD',
        operationalCategory: OperationalCategory.DIRECTOR,
      });

      const result = await service.create({
        name: 'director de seguridad',
      });

      expect(mockPositionRepo.create).toHaveBeenCalledWith({
        name: 'DIRECTOR DE SEGURIDAD',
        operationalCategory: OperationalCategory.DIRECTOR,
      });
      expect(result.operationalCategory).toBe(OperationalCategory.DIRECTOR);
    });
  });

  describe('findAll', () => {
    it('should return positions with resolved createdBy user names', async () => {
      const positions = [
        { id: '1', name: 'SUPERVISOR', createdBy: 'user-1' },
        { id: '2', name: 'COORDINADOR', createdBy: 'system' },
        { id: '3', name: 'GUARDA', createdBy: null },
      ];
      mockPositionRepo.findMany.mockResolvedValue(positions);

      const userMap = new Map<string, string>();
      userMap.set('user-1', 'Juan Pérez');
      mockUserRepo.findNamesByIds.mockResolvedValue(userMap);

      const result = await service.findAll();

      expect(mockPositionRepo.findMany).toHaveBeenCalled();
      expect(mockUserRepo.findNamesByIds).toHaveBeenCalledWith(['user-1']);
      expect(result).toEqual([
        { id: '1', name: 'SUPERVISOR', createdBy: 'Juan Pérez' },
        { id: '2', name: 'COORDINADOR', createdBy: 'system' },
        { id: '3', name: 'GUARDA', createdBy: 'system' },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return position if found with creator name', async () => {
      const pos = { id: 'pos-1', name: 'DIRECTOR', createdBy: 'user-1' };
      mockPositionRepo.findOne.mockResolvedValue(pos);

      const userMap = new Map<string, string>();
      userMap.set('user-1', 'Admin Master');
      mockUserRepo.findNamesByIds.mockResolvedValue(userMap);

      const result = await service.findOne('pos-1');

      expect(mockPositionRepo.findOne).toHaveBeenCalledWith('pos-1');
      expect(result.createdBy).toBe('Admin Master');
    });

    it('should throw NotFoundException if position does not exist', async () => {
      mockPositionRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('pos-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should trim and uppercase name if present in dto', async () => {
      mockPositionRepo.update.mockResolvedValue({
        id: 'pos-1',
        name: 'NUEVO NOMBRE',
      });

      const result = await service.update('pos-1', {
        name: '  nuevo nombre  ',
      });

      expect(mockPositionRepo.update).toHaveBeenCalledWith('pos-1', {
        name: 'NUEVO NOMBRE',
      });
      expect(result.name).toBe('NUEVO NOMBRE');
    });

    it('should update without name if not provided', async () => {
      mockPositionRepo.update.mockResolvedValue({
        id: 'pos-1',
        operationalCategory: OperationalCategory.COORDINATOR,
      });

      await service.update('pos-1', {
        operationalCategory: OperationalCategory.COORDINATOR,
      });

      expect(mockPositionRepo.update).toHaveBeenCalledWith('pos-1', {
        operationalCategory: OperationalCategory.COORDINATOR,
      });
    });
  });

  describe('remove', () => {
    it('should call positionRepository.remove', async () => {
      mockPositionRepo.remove.mockResolvedValue({ id: 'pos-1' });

      const result = await service.remove('pos-1');
      expect(mockPositionRepo.remove).toHaveBeenCalledWith('pos-1');
      expect(result).toEqual({ id: 'pos-1' });
    });
  });

  describe('importPositionsFromCsv', () => {
    it('should import rows, derive category and parse boolean statuses', async () => {
      mockPositionRepo.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'EXISTENTE',
          operationalCategory: OperationalCategory.GUARD,
        },
      ]);
      mockPositionRepo.create.mockImplementation((data: any) =>
        Promise.resolve({ id: `pos-${Math.random()}`, ...data }),
      );

      const rows: Record<string, string>[] = [
        {
          Nombre: 'Supervisor de Turno',
          Nivel: '3',
          EstadoActivo: 'activo',
          CategoriaOperativa: 'SUPERVISOR',
        },
        {
          name: 'Operador CCTV',
          level: 'invalid-num',
          isActive: 'false',
        },
        {
          Nombre: 'EXISTENTE', // duplicate should fail
        },
        {
          Nombre: '   ', // empty name should fail
        },
      ];

      const user = { sub: 'admin-id', roles: ['ADMIN'] };
      const res = await service.importPositionsFromCsv(rows, 'test.csv', user);

      expect(res.status).toBe('completed');
      expect(res.totalRows).toBe(4);
      expect(res.successRows).toBe(2);
      expect(res.errorRows).toBe(2);
      expect(res.errors).toHaveLength(2);
      expect(res.errors[0].reason).toContain('ya existe');
      expect(res.errors[1].reason).toContain('es obligatorio');
    });

    it('should assign system createdBy if user is godlike', async () => {
      mockPositionRepo.findMany.mockResolvedValue([]);
      mockPositionRepo.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'pos-new', ...data }),
      );

      const rows: Record<string, string>[] = [
        { Nombre: 'Director de Seguridad' },
      ];
      const godlikeUser = { sub: 'super', roles: ['GODLIKE'] };

      await service.importPositionsFromCsv(rows, 'test.csv', godlikeUser);

      expect(mockPositionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'system',
          operationalCategory: OperationalCategory.DIRECTOR,
        }),
      );
    });
  });
});
