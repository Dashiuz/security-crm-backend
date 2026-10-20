import { Test, TestingModule } from '@nestjs/testing';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { OperationalCategory } from './dtos/position.dto';

describe('PositionController', () => {
  let controller: PositionController;
  let mockPositionService: any;

  beforeEach(async () => {
    mockPositionService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      importPositionsFromCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PositionController],
      providers: [
        {
          provide: PositionService,
          useValue: mockPositionService,
        },
      ],
    }).compile();

    controller = module.get<PositionController>(PositionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate create to positionService.create', async () => {
      const dto = {
        name: 'SUPERVISOR',
        operationalCategory: OperationalCategory.SUPERVISOR,
      };
      mockPositionService.create.mockResolvedValue({ id: 'pos-1', ...dto });

      const result = await controller.create(dto);
      expect(mockPositionService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'pos-1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should delegate findAll to positionService.findAll', async () => {
      const positions = [{ id: 'pos-1', name: 'SUPERVISOR' }];
      mockPositionService.findAll.mockResolvedValue(positions);

      const result = await controller.findAll();
      expect(mockPositionService.findAll).toHaveBeenCalled();
      expect(result).toEqual(positions);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to positionService.findOne', async () => {
      const pos = { id: 'pos-1', name: 'SUPERVISOR' };
      mockPositionService.findOne.mockResolvedValue(pos);

      const result = await controller.findOne('pos-1');
      expect(mockPositionService.findOne).toHaveBeenCalledWith('pos-1');
      expect(result).toEqual(pos);
    });
  });

  describe('update', () => {
    it('should delegate update to positionService.update', async () => {
      const dto = { name: 'SUPERVISOR SENIOR' };
      mockPositionService.update.mockResolvedValue({ id: 'pos-1', ...dto });

      const result = await controller.update('pos-1', dto);
      expect(mockPositionService.update).toHaveBeenCalledWith('pos-1', dto);
      expect(result).toEqual({ id: 'pos-1', ...dto });
    });
  });

  describe('remove', () => {
    it('should delegate remove to positionService.remove', async () => {
      mockPositionService.remove.mockResolvedValue({ id: 'pos-1' });

      const result = await controller.remove('pos-1');
      expect(mockPositionService.remove).toHaveBeenCalledWith('pos-1');
      expect(result).toEqual({ id: 'pos-1' });
    });
  });

  describe('importCsv', () => {
    it('should delegate importCsv to positionService.importPositionsFromCsv with user and payload', async () => {
      const body = {
        data: [{ Nombre: 'Guarda' }],
        fileName: 'custom.csv',
      };
      const req = { user: { sub: 'usr-1', roles: ['ADMIN'] } };
      mockPositionService.importPositionsFromCsv.mockResolvedValue({
        status: 'completed',
        successRows: 1,
      });

      const result = await controller.importCsv(body, req);
      expect(mockPositionService.importPositionsFromCsv).toHaveBeenCalledWith(
        body.data,
        body.fileName,
        req.user,
      );
      expect(result).toEqual({ status: 'completed', successRows: 1 });
    });

    it('should use default empty data and filename if not provided', async () => {
      const body = {} as any;
      const req = { user: { sub: 'usr-2' } };
      mockPositionService.importPositionsFromCsv.mockResolvedValue({
        status: 'completed',
      });

      await controller.importCsv(body, req);
      expect(mockPositionService.importPositionsFromCsv).toHaveBeenCalledWith(
        [],
        'cargos.csv',
        req.user,
      );
    });
  });

  describe('toggleStatus', () => {
    it('should delegate toggleStatus to positionService.update with isActive', async () => {
      mockPositionService.update.mockResolvedValue({
        id: 'pos-1',
        isActive: false,
      });

      const result = await controller.toggleStatus('pos-1', false);
      expect(mockPositionService.update).toHaveBeenCalledWith('pos-1', {
        isActive: false,
      });
      expect(result).toEqual({ id: 'pos-1', isActive: false });
    });
  });
});
