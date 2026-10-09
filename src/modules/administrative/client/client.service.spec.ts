import { Test, TestingModule } from '@nestjs/testing';
import { ClientService } from './client.service';
import { ClientRepositoryService } from '../../../common/repository/client/client.repository.service';
import { ClientStructureGeneratorService } from './services/client-structure-generator.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { ClientSector, ClientStatus, ContractStatus } from '@prisma/client';

describe('ClientService (SPEC-UI-002)', () => {
  let service: ClientService;
  let clientRepository: any;
  let structureGenerator: any;
  let prisma: any;

  const mockAdminUser: UserContext = {
    sub: 'user-admin',
    tenantId: 'tenant-123',
    permissions: ['client:manage'],
    roles: ['ADMIN'],
  };

  const mockGeneralUser: UserContext = {
    sub: 'user-general',
    tenantId: 'tenant-123',
    permissions: ['client:read_general'],
    roles: ['OPERATOR'],
  };

  const mockLegalUser: UserContext = {
    sub: 'user-legal',
    tenantId: 'tenant-123',
    permissions: ['client:read_general', 'client:read_legal'],
    roles: ['LEGAL'],
  };

  const mockOperationsUser: UserContext = {
    sub: 'user-ops',
    tenantId: 'tenant-123',
    permissions: ['client:read_general', 'client:read_operations'],
    roles: ['OPERATOR'],
  };

  const sampleDbClient = {
    id: 'client-001',
    tenantId: 'tenant-123',
    internalCode: 'CLI-1001',
    nit: '900123456-7',
    name: 'Conjunto Residencial Paraiso',
    email: 'contacto@paraiso.com',
    phone: '3001234567',
    receptionPhone: '6012345678',
    zipCode: '110111',
    address: 'Calle 100 # 15-20',
    city: 'Bogota',
    state: 'Cundinamarca',
    sector: ClientSector.RESIDENTIAL,
    clientStatus: ClientStatus.ACTIVE,
    contractStatus: ContractStatus.ACTIVE,
    contractNumber: 'CONT-2026-001',
    contractDate: new Date('2026-01-01'),
    lastContractDate: new Date('2027-01-01'),
    contractEndDate: new Date('2027-01-01'),
    renewedContract: false,
    contractMediaFiles: { file1: 'url1' },
    administrator: 'Carlos Gomez',
    administratorPhone: '3119876543',
    administratorEmail: 'carlos@admin.com',
    administrationType: 'DIRECT',
    administrationCompanyData: { company: 'Propiedad Raiz' },
    councilData: { president: 'Maria Lopez' },
    securityStudy: 'EST-2026-A',
    geofence: { type: 'Polygon', coordinates: [] },
    mapboxBaseImageS3Key: 'keys/map.png',
    mapboxCenterLat: 4.711,
    mapboxCenterLng: -74.0721,
    mapboxZoom: 16,
    clientProperties: {
      id: 'prop-1',
      hasSocialRoom: true,
      socialRoomAmount: 1,
    },
    towers: [{ id: 'tower-1', towerName: 'Torre 1' }],
    floors: [{ id: 'floor-1', floorNumber: 1 }],
    units: [{ id: 'unit-1', unitName: '101' }],
    createdBy: { fullName: 'Admin User' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    clientRepository = {
      findOne: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    structureGenerator = {
      generateStructure: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      resident: {
        count: jest.fn().mockResolvedValue(0),
      },
      clientProperties: {
        upsert: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn(),
      },
      client: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      fileImportLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: ClientRepositoryService, useValue: clientRepository },
        { provide: ClientStructureGeneratorService, useValue: structureGenerator },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClientService>(ClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne & Granular RBAC Scrubbing (SPEC-UI-002)', () => {
    it('should throw NotFoundException if client does not exist or tenant mismatch', async () => {
      clientRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('c-none', mockAdminUser)).rejects.toThrow(
        NotFoundException,
      );

      clientRepository.findOne.mockResolvedValue({
        ...sampleDbClient,
        tenantId: 'other-tenant',
      });
      await expect(service.findOne('c-001', mockAdminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return all fields when user has client:manage', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      const res = await service.findOne('client-001', mockAdminUser);

      expect(res.contractNumber).toBe('CONT-2026-001');
      expect(res.councilData).toEqual({ president: 'Maria Lopez' });
      expect((res as any).towers).toHaveLength(1);
      expect((res as any).clientProperties).toBeDefined();
    });

    it('should scrub legal data when user lacks client:read_legal', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      const res = await service.findOne('client-001', mockGeneralUser);

      // Legal fields must be scrubbed (null)
      expect(res.contractNumber).toBeNull();
      expect(res.councilData).toBeNull();
      expect(res.administrationCompanyData).toBeNull();
      expect(res.contractMediaFiles).toBeNull();
      expect(res.administrator).toBeNull();
      expect(res.administratorEmail).toBeNull();
      expect(res.administratorPhone).toBeNull();
      expect(res.contractDate).toBeNull();
    });

    it('should preserve legal data when user has client:read_legal', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      const res = await service.findOne('client-001', mockLegalUser);

      expect(res.contractNumber).toBe('CONT-2026-001');
      expect(res.councilData).toEqual({ president: 'Maria Lopez' });
      expect(res.administrator).toBe('Carlos Gomez');
    });

    it('should scrub operational data when user lacks client:read_operations', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      const res = await service.findOne('client-001', mockGeneralUser);

      // Operations fields must be scrubbed
      expect((res as any).clientProperties).toBeNull();
      expect((res as any).towers).toEqual([]);
      expect((res as any).floors).toEqual([]);
      expect((res as any).units).toEqual([]);
      expect((res as any).geofence).toBeNull();
      expect((res as any).mapboxBaseImageS3Key).toBeNull();
      expect(res.securityStudy).toBeNull();
    });

    it('should preserve operational data when user has client:read_operations', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      const res = await service.findOne('client-001', mockOperationsUser);

      expect((res as any).towers).toHaveLength(1);
      expect((res as any).clientProperties).toBeDefined();
      expect(res.securityStudy).toBe('EST-2026-A');
    });
  });

  describe('updateGeneral (SPEC-UI-002)', () => {
    it('should update general client information and handle coordinator connection', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      clientRepository.update.mockResolvedValue({
        ...sampleDbClient,
        name: 'Nuevo Nombre',
      });

      const res = await service.updateGeneral(
        'client-001',
        {
          name: 'Nuevo Nombre',
          coordinatorInChargeId: 'coord-99',
        },
        mockAdminUser,
      );

      expect(clientRepository.update).toHaveBeenCalledWith('client-001', {
        name: 'Nuevo Nombre',
        coordinatorInCharge: { connect: { id: 'coord-99' } },
        updatedBy: { connect: { id: 'user-admin' } },
      });
      expect(res).toBeDefined();
    });

    it('should disconnect coordinator when coordinatorInChargeId is null', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      clientRepository.update.mockResolvedValue({ ...sampleDbClient });

      await service.updateGeneral(
        'client-001',
        { coordinatorInChargeId: null },
        mockAdminUser,
      );

      expect(clientRepository.update).toHaveBeenCalledWith('client-001', {
        coordinatorInCharge: { disconnect: true },
        updatedBy: { connect: { id: 'user-admin' } },
      });
    });

    it('should handle unique constraint conflict gracefully', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      clientRepository.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['nit'] },
      });

      await expect(
        service.updateGeneral('client-001', { nit: '900123456-7' }, mockAdminUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateOperations & Cascade Safety (SPEC-UI-002)', () => {
    it('should update Mapbox and amenities in clientProperties', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      clientRepository.update.mockResolvedValue({ ...sampleDbClient });

      await service.updateOperations(
        'client-001',
        {
          mapboxZoom: 18,
          hasPool: true,
          poolAmount: 2,
        },
        mockAdminUser,
      );

      expect(clientRepository.update).toHaveBeenCalledWith('client-001', {
        mapboxZoom: 18,
        updatedBy: { connect: { id: 'user-admin' } },
      });

      expect(prisma.clientProperties.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'client-001' },
          update: expect.objectContaining({
            hasPool: true,
            poolAmount: 2,
          }),
        }),
      );
    });

    it('should generate structure directly if client has 0 residents', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.resident.count.mockResolvedValue(0);

      const structureConfig: any = {
        structureType: 'BUILDING_CLUSTER',
        towersAmount: 2,
      };

      await service.updateOperations(
        'client-001',
        { structureConfig },
        mockAdminUser,
      );

      expect(structureGenerator.generateStructure).toHaveBeenCalledWith(
        'client-001',
        'tenant-123',
        structureConfig,
        'user-admin',
      );
    });

    it('should throw BadRequestException if residents exist and confirmationCode is NOT REGENERAR', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.resident.count.mockResolvedValue(15); // 15 active residents exist!

      const structureConfig: any = {
        structureType: 'BUILDING_CLUSTER',
        towersAmount: 2,
      };

      await expect(
        service.updateOperations(
          'client-001',
          { structureConfig, confirmationCode: 'WRONG' },
          mockAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(structureGenerator.generateStructure).not.toHaveBeenCalled();
    });

    it('should allow structure regeneration if residents exist and confirmationCode is REGENERAR', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.resident.count.mockResolvedValue(15);

      const structureConfig: any = {
        structureType: 'BUILDING_CLUSTER',
        towersAmount: 2,
      };

      await service.updateOperations(
        'client-001',
        { structureConfig, confirmationCode: 'REGENERAR' },
        mockAdminUser,
      );

      expect(structureGenerator.generateStructure).toHaveBeenCalledWith(
        'client-001',
        'tenant-123',
        structureConfig,
        'user-admin',
      );
    });
  });

  describe('updateLegal (SPEC-UI-002)', () => {
    it('should update legal, council, and contractual data with parsed dates', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      clientRepository.update.mockResolvedValue({ ...sampleDbClient });

      await service.updateLegal(
        'client-001',
        {
          contractNumber: 'CONT-NEW-2026',
          contractDate: '2026-05-01',
          councilData: { president: 'Nuevo Presidente' },
        },
        mockAdminUser,
      );

      expect(clientRepository.update).toHaveBeenCalledWith(
        'client-001',
        expect.objectContaining({
          contractNumber: 'CONT-NEW-2026',
          contractDate: new Date('2026-05-01'),
          councilData: { president: 'Nuevo Presidente' },
          updatedBy: { connect: { id: 'user-admin' } },
        }),
      );
    });
  });
});
