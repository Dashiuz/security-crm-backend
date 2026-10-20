import { Test, TestingModule } from '@nestjs/testing';
import { MinutaGeneralController } from './minuta-general.controller';
import { MinutaGeneralService } from '../services/minuta-general.service';
import {
  CreateMinutaDto,
  UpdateMinutaDto,
  VoidRecordDto,
  MinutaFilterQueryDto,
} from '../dtos/minuta-general.dto';

describe('MinutaGeneralController', () => {
  let controller: MinutaGeneralController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      void: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinutaGeneralController],
      providers: [
        {
          provide: MinutaGeneralService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MinutaGeneralController>(MinutaGeneralController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate create to service with dto, userId and tenantId', async () => {
      const dto: CreateMinutaDto = {
        title: 'Novedad turno',
        description: 'Todo en orden en portería',
        priority: 1,
      } as any;
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockService.create.mockResolvedValue({ id: 'min-1', ...dto });

      const result = await controller.create(req, dto);
      expect(mockService.create).toHaveBeenCalledWith(dto, 'u-1', 'tenant-1');
      expect(result).toEqual({ id: 'min-1', ...dto });
    });
  });

  describe('findAll', () => {
    it('should delegate findAll to service with query filters', async () => {
      const query: MinutaFilterQueryDto = { limit: 10 } as any;
      mockService.findAll.mockResolvedValue({ data: [], meta: {} });

      const result = await controller.findAll(query);
      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], meta: {} });
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to service with id', async () => {
      mockService.findOne.mockResolvedValue({ id: 'min-1' });

      const result = await controller.findOne('min-1');
      expect(mockService.findOne).toHaveBeenCalledWith('min-1');
      expect(result).toEqual({ id: 'min-1' });
    });
  });

  describe('update', () => {
    it('should delegate update to service with id, dto and userId', async () => {
      const dto: UpdateMinutaDto = { title: 'Actualizado' } as any;
      const req = { user: { sub: 'u-1' } };
      mockService.update.mockResolvedValue({ id: 'min-1', ...dto });

      const result = await controller.update(req, 'min-1', dto);
      expect(mockService.update).toHaveBeenCalledWith('min-1', dto, 'u-1');
      expect(result).toEqual({ id: 'min-1', ...dto });
    });
  });

  describe('void', () => {
    it('should delegate void to service with id, dto and userId', async () => {
      const dto: VoidRecordDto = {
        voidReason: 'Error de digitación en la minuta',
      };
      const req = { user: { sub: 'u-1' } };
      mockService.void.mockResolvedValue({ id: 'min-1', isVoided: true });

      const result = await controller.void(req, 'min-1', dto);
      expect(mockService.void).toHaveBeenCalledWith('min-1', dto, 'u-1');
      expect(result).toEqual({ id: 'min-1', isVoided: true });
    });
  });

  describe('remove', () => {
    it('should delegate remove to service with id and userId', async () => {
      const req = { user: { sub: 'u-1' } };
      mockService.remove.mockResolvedValue({ success: true });

      const result = await controller.remove(req, 'min-1');
      expect(mockService.remove).toHaveBeenCalledWith('min-1', 'u-1');
      expect(result).toEqual({ success: true });
    });
  });
});
