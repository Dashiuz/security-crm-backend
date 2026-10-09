import { Test, TestingModule } from '@nestjs/testing';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import {
  CreateClientDto,
  UpdateClientGeneralDto,
  UpdateClientLegalDto,
} from './dtos/client.dto';
import {
  CreateClientWithStructureDto,
  UpdateClientWithStructureDto,
  UpdateClientOperationsDto,
} from './dtos/client-structure.dto';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { Reflector } from '@nestjs/core';

describe('ClientController', () => {
  let controller: ClientController;
  let service: jest.Mocked<ClientService>;

  const mockUser: UserContext = {
    sub: 'user-123',
    tenantId: 'tenant-abc',
    permissions: ['client:manage'],
    roles: ['ADMIN'],
  };

  const mockRequest = { user: mockUser };

  beforeEach(async () => {
    const mockClientService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateGeneral: jest.fn(),
      updateOperations: jest.fn(),
      updateLegal: jest.fn(),
      remove: jest.fn(),
      reactivate: jest.fn(),
      autocomplete: jest.fn(),
      autocompleteUnits: jest.fn(),
      importClientsFromCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientController],
      providers: [
        {
          provide: ClientService,
          useValue: mockClientService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<ClientController>(ClientController);
    service = module.get(ClientService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and user', async () => {
      const dto: CreateClientDto = {
        name: 'Test Client',
        nit: '900123456-1',
      };
      service.create.mockResolvedValue({ id: 'client-1' } as any);

      const result = await controller.create(dto, mockRequest);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual({ id: 'client-1' });
    });
  });

  describe('createWithStructure', () => {
    it('should call service.create with structure dto and user', async () => {
      const dto: CreateClientWithStructureDto = {
        name: 'Test Complex',
        nit: '900123456-2',
      };
      service.create.mockResolvedValue({ id: 'client-2' } as any);

      const result = await controller.createWithStructure(dto, mockRequest);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual({ id: 'client-2' });
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with user and pagination', async () => {
      service.findAll.mockResolvedValue([{ id: 'c-1' }] as any);

      const result = await controller.findAll(mockRequest, { take: 10 });
      expect(service.findAll).toHaveBeenCalledWith(mockUser, { take: 10 });
      expect(result).toEqual([{ id: 'c-1' }]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and user', async () => {
      service.findOne.mockResolvedValue({ id: 'c-1', name: 'Client 1' } as any);

      const result = await controller.findOne('c-1', mockRequest);
      expect(service.findOne).toHaveBeenCalledWith('c-1', mockUser);
      expect(result).toEqual({ id: 'c-1', name: 'Client 1' });
    });
  });

  describe('updateGeneral (SPEC-UI-002)', () => {
    it('should delegate updateGeneral to service with id, dto, and user', async () => {
      const dto: UpdateClientGeneralDto = {
        name: 'Updated Name',
        phone: '3001234567',
      };
      service.updateGeneral.mockResolvedValue({
        id: 'c-1',
        name: 'Updated Name',
      } as any);

      const result = await controller.updateGeneral('c-1', dto, mockRequest);
      expect(service.updateGeneral).toHaveBeenCalledWith('c-1', dto, mockUser);
      expect(result).toEqual({ id: 'c-1', name: 'Updated Name' });
    });
  });

  describe('updateOperations (SPEC-UI-002)', () => {
    it('should delegate updateOperations to service with id, dto, and user', async () => {
      const dto: UpdateClientOperationsDto = {
        hasSocialRoom: true,
        socialRoomAmount: 1,
        mapboxZoom: 15,
      };
      service.updateOperations.mockResolvedValue({
        id: 'c-1',
        hasSocialRoom: true,
      } as any);

      const result = await controller.updateOperations('c-1', dto, mockRequest);
      expect(service.updateOperations).toHaveBeenCalledWith('c-1', dto, mockUser);
      expect(result).toEqual({ id: 'c-1', hasSocialRoom: true });
    });
  });

  describe('updateLegal (SPEC-UI-002)', () => {
    it('should delegate updateLegal to service with id, dto, and user', async () => {
      const dto: UpdateClientLegalDto = {
        contractNumber: 'CONT-2026-999',
        administrator: 'Pedro Perez',
      };
      service.updateLegal.mockResolvedValue({
        id: 'c-1',
        contractNumber: 'CONT-2026-999',
      } as any);

      const result = await controller.updateLegal('c-1', dto, mockRequest);
      expect(service.updateLegal).toHaveBeenCalledWith('c-1', dto, mockUser);
      expect(result).toEqual({ id: 'c-1', contractNumber: 'CONT-2026-999' });
    });
  });

  describe('update', () => {
    it('should delegate legacy update to service', async () => {
      const dto: UpdateClientWithStructureDto = { name: 'Old Update' };
      service.update.mockResolvedValue({ id: 'c-1' } as any);

      const result = await controller.update('c-1', dto, mockRequest);
      expect(service.update).toHaveBeenCalledWith('c-1', dto, mockUser);
      expect(result).toEqual({ id: 'c-1' });
    });
  });

  describe('remove and reactivate', () => {
    it('should delegate remove to service', async () => {
      service.remove.mockResolvedValue({ id: 'c-1', isActive: false } as any);
      const result = await controller.remove('c-1', mockRequest);
      expect(service.remove).toHaveBeenCalledWith('c-1', mockUser);
      expect(result).toEqual({ id: 'c-1', isActive: false });
    });

    it('should delegate reactivate to service', async () => {
      service.reactivate.mockResolvedValue({ id: 'c-1', isActive: true } as any);
      const result = await controller.reactivate('c-1', mockRequest);
      expect(service.reactivate).toHaveBeenCalledWith('c-1', mockUser);
      expect(result).toEqual({ id: 'c-1', isActive: true });
    });
  });
});
