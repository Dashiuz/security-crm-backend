import { Test, TestingModule } from '@nestjs/testing';
import { ProspectController } from './prospect.controller';
import { ProspectService } from './prospect.service';
import {
  CreateProspectDto,
  CreateProspectWithStructureDto,
  UpdateProspectDto,
  ConvertProspectDto,
} from './dtos/prospect.dto';

describe('ProspectController', () => {
  let controller: ProspectController;
  let mockProspectService: any;

  beforeEach(async () => {
    mockProspectService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      convertToClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProspectController],
      providers: [
        {
          provide: ProspectService,
          useValue: mockProspectService,
        },
      ],
    }).compile();

    controller = module.get<ProspectController>(ProspectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to prospectService.create with dto and req.user', async () => {
      const dto: CreateProspectDto = {
        name: 'Prospecto Los Alamos',
        nit: '900111222-1',
      } as any;
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockProspectService.create.mockResolvedValue({ id: 'prosp-1', ...dto });

      const result = await controller.create(dto, req);
      expect(mockProspectService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result).toEqual({ id: 'prosp-1', ...dto });
    });
  });

  describe('createWithStructure', () => {
    it('should delegate to prospectService.create with structure config', async () => {
      const dto: CreateProspectWithStructureDto = {
        name: 'Prospecto Torres',
        nit: '900333444-2',
        structureConfig: { towersAmount: 2 } as any,
      } as any;
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockProspectService.create.mockResolvedValue({ id: 'prosp-2', ...dto });

      const result = await controller.createWithStructure(dto, req);
      expect(mockProspectService.create).toHaveBeenCalledWith(dto, req.user);
      expect(result).toEqual({ id: 'prosp-2', ...dto });
    });
  });

  describe('findAll', () => {
    it('should delegate to prospectService.findAll with req.user', async () => {
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockProspectService.findAll.mockResolvedValue([
        { id: 'prosp-1', name: 'Prospecto 1' },
      ]);

      const result = await controller.findAll(req);
      expect(mockProspectService.findAll).toHaveBeenCalledWith(req.user);
      expect(result).toEqual([{ id: 'prosp-1', name: 'Prospecto 1' }]);
    });
  });

  describe('findOne', () => {
    it('should delegate to prospectService.findOne with id and req.user', async () => {
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockProspectService.findOne.mockResolvedValue({
        id: 'prosp-1',
        name: 'Prospecto 1',
      });

      const result = await controller.findOne('prosp-1', req);
      expect(mockProspectService.findOne).toHaveBeenCalledWith(
        'prosp-1',
        req.user,
      );
      expect(result).toEqual({ id: 'prosp-1', name: 'Prospecto 1' });
    });
  });

  describe('update', () => {
    it('should delegate to prospectService.update with id, dto, and req.user', async () => {
      const dto: UpdateProspectDto = { name: 'Nombre Actualizado' } as any;
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockProspectService.update.mockResolvedValue({ id: 'prosp-1', ...dto });

      const result = await controller.update('prosp-1', dto, req);
      expect(mockProspectService.update).toHaveBeenCalledWith(
        'prosp-1',
        dto,
        req.user,
      );
      expect(result).toEqual({ id: 'prosp-1', ...dto });
    });
  });

  describe('remove', () => {
    it('should delegate to prospectService.remove with id and req.user', async () => {
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockProspectService.remove.mockResolvedValue({ success: true });

      const result = await controller.remove('prosp-1', req);
      expect(mockProspectService.remove).toHaveBeenCalledWith(
        'prosp-1',
        req.user,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('convert', () => {
    it('should delegate to prospectService.convertToClient with id, dto, and req.user', async () => {
      const dto: ConvertProspectDto = {
        contractDate: '2026-01-01',
        lastContractDate: '2027-01-01',
      } as any;
      const req = { user: { sub: 'u-1', tenantId: 'tenant-1' } };
      mockProspectService.convertToClient.mockResolvedValue({
        id: 'cli-1',
        name: 'Convertido',
      });

      const result = await controller.convert('prosp-1', dto, req);
      expect(mockProspectService.convertToClient).toHaveBeenCalledWith(
        'prosp-1',
        dto,
        req.user,
      );
      expect(result).toEqual({ id: 'cli-1', name: 'Convertido' });
    });
  });
});
