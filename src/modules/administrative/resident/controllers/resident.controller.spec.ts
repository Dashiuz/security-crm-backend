import { Test, TestingModule } from '@nestjs/testing';
import { ResidentController } from './resident.controller';
import { ResidentService } from '../services/resident.service';
import { CreateResidentDto, UpdateResidentDto } from '../dtos/resident.dto';
import { ResidentType } from '@prisma/client';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';

describe('ResidentController', () => {
  let controller: ResidentController;
  let service: jest.Mocked<Partial<ResidentService>>;

  const mockUser = {
    sub: 'user-uuid-1',
    tenantId: 'tenant-uuid-1',
    roles: ['ADMIN'],
    permissions: ['resident:create', 'resident:manage', 'resident:read'],
    userType: 'TENANT_ADMIN',
  };

  const mockReq = { user: mockUser };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findByClient: jest.fn(),
      autocomplete: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      importResidentsFromCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResidentController],
      providers: [
        {
          provide: ResidentService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ResidentController>(ResidentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate creation to residentService.create', async () => {
      const dto: CreateResidentDto = {
        clientId: 'client-1',
        unitId: 'unit-1',
        residentType: ResidentType.OWNER,
        firstName: 'Carlos',
        lastName: 'Gomez',
        document: '1098765432',
        phoneNumber: '3009876543',
      };
      const expectedResult = { id: 'res-1', ...dto } as any;
      (service.create as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.create(dto, mockReq);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByClient', () => {
    it('should delegate findByClient to residentService.findByClient', async () => {
      const expectedList = [{ id: 'res-1', firstName: 'Carlos' }] as any;
      (service.findByClient as jest.Mock).mockResolvedValue(expectedList);

      const result = await controller.findByClient('client-1', mockReq);
      expect(service.findByClient).toHaveBeenCalledWith('client-1', mockUser);
      expect(result).toEqual(expectedList);
    });
  });

  describe('autocomplete', () => {
    it('should delegate autocomplete with parsed limit', async () => {
      const expectedMatches = [{ id: 'res-1', firstName: 'Carlos' }];
      (service.autocomplete as jest.Mock).mockResolvedValue(expectedMatches);

      const result = await controller.autocomplete(
        'client-1',
        'Car',
        'unit-1',
        '25',
        mockReq,
      );

      expect(service.autocomplete).toHaveBeenCalledWith(
        'client-1',
        'Car',
        'unit-1',
        mockUser,
        25,
      );
      expect(result).toEqual(expectedMatches);
    });

    it('should default limit to 15 when not provided', async () => {
      (service.autocomplete as jest.Mock).mockResolvedValue([]);

      await controller.autocomplete(
        'client-1',
        'Car',
        'unit-1',
        undefined as any,
        mockReq,
      );

      expect(service.autocomplete).toHaveBeenCalledWith(
        'client-1',
        'Car',
        'unit-1',
        mockUser,
        15,
      );
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to residentService.findOne', async () => {
      const resident = { id: 'res-1', firstName: 'Carlos' } as any;
      (service.findOne as jest.Mock).mockResolvedValue(resident);

      const result = await controller.findOne('res-1', mockReq);
      expect(service.findOne).toHaveBeenCalledWith('res-1', mockUser);
      expect(result).toEqual(resident);
    });
  });

  describe('update', () => {
    it('should delegate update to residentService.update', async () => {
      const dto: UpdateResidentDto = {
        phoneNumber: '3119998877',
      };
      const updated = { id: 'res-1', phoneNumber: '3119998877' } as any;
      (service.update as jest.Mock).mockResolvedValue(updated);

      const result = await controller.update('res-1', dto, mockReq);
      expect(service.update).toHaveBeenCalledWith('res-1', dto, mockUser);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should delegate removal to residentService.remove', async () => {
      (service.remove as jest.Mock).mockResolvedValue({ success: true } as any);

      const result = await controller.remove('res-1', mockReq);
      expect(service.remove).toHaveBeenCalledWith('res-1', mockUser);
      expect(result).toEqual({ success: true });
    });
  });

  describe('importCsv', () => {
    it('should delegate importCsv with payload defaults', async () => {
      const body = {
        clientId: 'client-1',
        data: [{ firstName: 'Carlos', unitName: '101' }],
        fileName: 'upload.csv',
      };
      const importResponse = {
        status: 'SUCCESS',
        successRows: 1,
        errorRows: 0,
      };
      (service.importResidentsFromCsv as jest.Mock).mockResolvedValue(
        importResponse,
      );

      const result = await controller.importCsv(body, mockReq);
      expect(service.importResidentsFromCsv).toHaveBeenCalledWith(
        'client-1',
        body.data,
        'upload.csv',
        mockUser,
      );
      expect(result).toEqual(importResponse);
    });

    it('should handle optional fileName and data gracefully', async () => {
      const body = {
        clientId: 'client-1',
        data: undefined as any,
      };
      (service.importResidentsFromCsv as jest.Mock).mockResolvedValue({
        status: 'SUCCESS',
      });

      await controller.importCsv(body, mockReq);
      expect(service.importResidentsFromCsv).toHaveBeenCalledWith(
        'client-1',
        [],
        'residentes.csv',
        mockUser,
      );
    });
  });
});
