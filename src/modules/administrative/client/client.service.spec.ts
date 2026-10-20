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
import { DigitalAccountStatus } from './dtos/client.dto';

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
        findFirst: jest.fn(),
      },
      client: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      fileImportLog: {
        create: jest.fn(),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      userClientAccess: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: 'uca-1',
          userId: 'coord-99',
          clientId: 'client-001',
        }),
        upsert: jest.fn().mockResolvedValue({
          id: 'uca-1',
          userId: 'coord-99',
          clientId: 'client-001',
        }),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: ClientRepositoryService, useValue: clientRepository },
        {
          provide: ClientStructureGeneratorService,
          useValue: structureGenerator,
        },
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
    it('should update general client information and sync coordinator in userClientAccess', async () => {
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
        updatedBy: { connect: { id: 'user-admin' } },
      });
      expect(prisma.userClientAccess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_clientId: {
              userId: 'coord-99',
              clientId: 'client-001',
            },
          },
        }),
      );
      expect(res).toBeDefined();
    });

    it('should not include coordinator in clientRepository update when coordinatorInChargeId is null', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      clientRepository.update.mockResolvedValue({ ...sampleDbClient });

      await service.updateGeneral(
        'client-001',
        { coordinatorInChargeId: null },
        mockAdminUser,
      );

      expect(clientRepository.update).toHaveBeenCalledWith('client-001', {
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
        service.updateGeneral(
          'client-001',
          { nit: '900123456-7' },
          mockAdminUser,
        ),
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

  describe('getClientAdministrators', () => {
    it('should return individual administrator with roleName Administrador Titular', async () => {
      clientRepository.findOne.mockResolvedValue({
        ...sampleDbClient,
        administrationType: 'INDIVIDUAL',
        administrator: 'Juan Carlos Administrador',
        administratorPhone: '3001112233',
        administratorEmail: 'juan@conjunto.com',
        administrationCompanyData: {
          identificationNumber: '12345678',
        },
      });

      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getClientAdministrators(
        'client-001',
        mockAdminUser,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Juan Carlos Administrador',
        document: '12345678',
        phone: '3001112233',
        email: 'juan@conjunto.com',
        roleName: 'Administrador Titular',
        administrationType: 'INDIVIDUAL',
        isAlreadyUser: false,
        hasAccessToThisClient: false,
      });
    });

    it('should return enterprise administrators including legal rep and additional contacts', async () => {
      clientRepository.findOne.mockResolvedValue({
        ...sampleDbClient,
        administrationType: 'ENTERPRISE',
        administrator: 'Inmobiliaria Los Andes SAS',
        administratorPhone: '6019998877',
        administratorEmail: 'contacto@losandes.com',
        administrationCompanyData: {
          legalRepName: 'Pedro Perez',
          legalRepId: '98765432',
          legalRepPhone: '3109998877',
          additionalContacts: [
            {
              name: 'Ana Gomez',
              document: '55566677',
              roleName: 'Administradora Delegada',
              phone: '3123456789',
              email: 'ana@losandes.com',
            },
            {
              name: 'Carlos Ruiz',
              document: '44433322',
              roleName: 'Contador General',
            },
          ],
        },
      });

      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.document === '55566677') {
          return Promise.resolve({
            id: 'user-ana',
            clientId: 'client-other',
            clientAccesses: [{ clientId: 'client-001', isActive: true }],
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.getClientAdministrators(
        'client-001',
        mockAdminUser,
      );

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Pedro Perez');
      expect(result[0].roleName).toBe('Representante Legal');
      expect(result[0].isAlreadyUser).toBe(false);

      expect(result[1].name).toBe('Ana Gomez');
      expect(result[1].roleName).toBe('Administradora Delegada');
      expect(result[1].isAlreadyUser).toBe(true);
      expect(result[1].hasAccessToThisClient).toBe(true);

      expect(result[2].name).toBe('Carlos Ruiz');
      expect(result[2].roleName).toBe('Contador General');
    });

    it('should return empty array if client has no administrators configured', async () => {
      clientRepository.findOne.mockResolvedValue({
        ...sampleDbClient,
        administrationType: 'INDIVIDUAL',
        administrator: null,
        administrationCompanyData: null,
      });

      const result = await service.getClientAdministrators(
        'client-001',
        mockAdminUser,
      );

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if client not found or tenant mismatch', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getClientAdministrators('client-999', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Client User Management (SPEC-ADM-017)', () => {
    it('getClientUsers should return unified workforce including guards without digital user', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.userClientAccess.findMany.mockResolvedValue([
        {
          id: 'uca-1',
          userId: 'user-coord',
          employeeId: 'emp-coord',
          clientId: 'client-001',
          roleName: 'COORDINADOR',
          isActive: true,
          createdAt: new Date('2026-10-17'),
          user: {
            id: 'user-coord',
            fullName: 'Carlos Coord',
            document: '123456',
            department: 'Operaciones',
            position: 'Coordinador',
            userType: 'EMPLOYEE',
            isActive: true,
            roles: [{ role: { id: 'r1', name: 'COORDINATOR' } }],
          },
          employee: {
            id: 'emp-coord',
            fullName: 'Carlos Coord',
            document: '123456',
            email: 'carlos@empresa.com',
            phone: '3001234567',
            isActive: true,
            positionRef: { name: 'COORDINADOR' },
          },
        },
        {
          id: 'uca-2',
          userId: null,
          employeeId: 'emp-guard',
          clientId: 'client-001',
          roleName: 'GUARDIA DE SEGURIDAD',
          isActive: true,
          createdAt: new Date('2026-10-18'),
          user: null,
          employee: {
            id: 'emp-guard',
            fullName: 'Andres Felipe Ramirez',
            document: '1001001009',
            email: 'andres@empresa.com',
            phone: '3009998877',
            isActive: true,
            positionRef: { name: 'GUARDIA DE SEGURIDAD' },
          },
        },
      ]);

      const result = await service.getClientUsers('client-001', mockAdminUser);
      expect(result).toHaveLength(2);

      // Coordinator (Active Digital Access)
      expect(result[0].id).toBe('uca-1');
      expect(result[0].hasDigitalAccess).toBe(true);
      expect(result[0].digitalAccountStatus).toBe(DigitalAccountStatus.ACTIVE);
      expect(result[0].user.fullName).toBe('Carlos Coord');
      expect(result[0].employeeId).toBe('emp-coord');
      expect(result[0].user.email).toBe('carlos@empresa.com');

      // Guard (Physical Guard Without Digital Account)
      expect(result[1].id).toBe('uca-2');
      expect(result[1].hasDigitalAccess).toBe(false);
      expect(result[1].digitalAccountStatus).toBe(
        DigitalAccountStatus.NO_ACCOUNT,
      );
      expect(result[1].user.fullName).toBe('Andres Felipe Ramirez');
      expect(result[1].user.document).toBe('1001001009');
      expect(result[1].employeeId).toBe('emp-guard');
      expect(result[1].user.email).toBe('andres@empresa.com');
      expect(result[1].roleName).toBe('GUARDIA DE SEGURIDAD');
    });

    it('assignUser should create userClientAccess and link user and employee when access does not exist', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-coord',
        document: '123456',
        position: 'Coordinador',
      });
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-coord',
        document: '123456',
        positionRef: { name: 'COORDINADOR' },
      });
      prisma.userClientAccess.findFirst.mockResolvedValue(null);
      prisma.userClientAccess.create.mockResolvedValue({
        id: 'uca-1',
        userId: 'user-coord',
        employeeId: 'emp-coord',
        clientId: 'client-001',
        roleName: 'COORDINADOR',
        isActive: true,
        createdAt: new Date('2026-10-17'),
        user: { id: 'user-coord', fullName: 'Carlos Coord' },
      });

      const result = await service.assignUser(
        'client-001',
        { userId: 'user-coord', roleName: 'COORDINADOR' },
        mockAdminUser,
      );

      expect(prisma.userClientAccess.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-coord',
            employeeId: 'emp-coord',
            clientId: 'client-001',
            roleName: 'COORDINADOR',
          }),
        }),
      );
      expect(result.userId).toBe('user-coord');
      expect(result.employeeId).toBe('emp-coord');
    });

    it('assignUser should update userClientAccess when existing access is found', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-coord',
        document: '123456',
        position: 'Coordinador',
      });
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-coord',
        document: '123456',
        positionRef: { name: 'COORDINADOR' },
      });
      prisma.userClientAccess.findFirst.mockResolvedValue({
        id: 'existing-uca',
        userId: null,
        employeeId: 'emp-coord',
        clientId: 'client-001',
      });
      prisma.userClientAccess.update.mockResolvedValue({
        id: 'existing-uca',
        userId: 'user-coord',
        employeeId: 'emp-coord',
        clientId: 'client-001',
        roleName: 'COORDINADOR',
        isActive: true,
        createdAt: new Date('2026-10-17'),
        user: { id: 'user-coord', fullName: 'Carlos Coord' },
      });

      const result = await service.assignUser(
        'client-001',
        { userId: 'user-coord' },
        mockAdminUser,
      );

      expect(prisma.userClientAccess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-uca' },
          data: expect.objectContaining({
            userId: 'user-coord',
            employeeId: 'emp-coord',
            isActive: true,
          }),
        }),
      );
      expect(result.id).toBe('existing-uca');
    });

    it('assignUser should throw NotFoundException if user not found', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assignUser(
          'client-001',
          { userId: 'non-existent' },
          mockAdminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('unassignUser should deactivate userClientAccess by accessId and close employee history', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.userClientAccess.findFirst.mockResolvedValue({
        id: 'uca-1',
        userId: 'user-coord',
        employeeId: 'emp-coord',
        clientId: 'client-001',
      });
      prisma.userClientAccess.update.mockResolvedValue({
        id: 'uca-1',
        isActive: false,
      });
      prisma.employee.findUnique.mockResolvedValue({
        id: 'emp-coord',
        clientId: 'client-001',
        clientHistory: [
          {
            clientId: 'client-001',
            clientName: 'Conjunto Paraiso',
            assignedAt: '2026-01-01',
            unassignedAt: null,
          },
        ],
      });

      const result = await service.unassignUser(
        'client-001',
        'uca-1',
        mockAdminUser,
      );

      expect(prisma.userClientAccess.update).toHaveBeenCalledWith({
        where: { id: 'uca-1' },
        data: { isActive: false },
      });
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-coord' },
        data: expect.objectContaining({
          clientId: null,
          clientHistory: expect.arrayContaining([
            expect.objectContaining({
              clientId: 'client-001',
              unassignedAt: expect.any(String),
            }),
          ]),
        }),
      });
      expect(result.success).toBe(true);
    });

    it('unassignUser should fallback to finding access by userId or employeeId', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      // First call (by id) returns null, second call (by OR) returns access
      prisma.userClientAccess.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'uca-guard-1',
          userId: null,
          employeeId: 'emp-guard',
          clientId: 'client-001',
        });
      prisma.userClientAccess.update.mockResolvedValue({
        id: 'uca-guard-1',
        isActive: false,
      });
      prisma.employee.findUnique.mockResolvedValue({
        id: 'emp-guard',
        clientId: 'client-001',
        clientHistory: [
          {
            clientId: 'client-001',
            clientName: 'Conjunto Paraiso',
            assignedAt: '2026-01-01',
            unassignedAt: null,
          },
        ],
      });

      const result = await service.unassignUser(
        'client-001',
        'emp-guard',
        mockAdminUser,
      );

      expect(prisma.userClientAccess.update).toHaveBeenCalledWith({
        where: { id: 'uca-guard-1' },
        data: { isActive: false },
      });
      expect(result.success).toBe(true);
    });

    it('assignUser should sync employee clientHistory bidirectionally', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-coord',
        document: '123456',
        position: 'Coordinador',
      });
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-coord',
        document: '123456',
        clientHistory: [],
        positionRef: { name: 'COORDINADOR' },
      });
      prisma.client.findUnique = jest.fn().mockResolvedValue({
        id: 'client-001',
        name: 'Conjunto Paraiso',
        internalCode: 'CLI-1001',
      });
      prisma.userClientAccess.findFirst.mockResolvedValue(null);
      prisma.userClientAccess.create.mockResolvedValue({
        id: 'uca-1',
        userId: 'user-coord',
        employeeId: 'emp-coord',
        clientId: 'client-001',
        roleName: 'COORDINADOR',
        isActive: true,
        createdAt: new Date('2026-10-17'),
        user: { id: 'user-coord', fullName: 'Carlos Coord' },
      });

      const result = await service.assignUser(
        'client-001',
        { userId: 'user-coord' },
        mockAdminUser,
      );

      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-coord' },
        data: expect.objectContaining({
          clientId: 'client-001',
          clientHistory: expect.arrayContaining([
            expect.objectContaining({
              clientId: 'client-001',
              clientName: 'Conjunto Paraiso',
              unassignedAt: null,
            }),
          ]),
        }),
      });
      expect(result.id).toBe('uca-1');
    });

    it('unassignUser should sync employee history when employeeId is null on access but userId exists', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.userClientAccess.findFirst.mockResolvedValue({
        id: 'uca-legacy',
        userId: 'user-coord',
        employeeId: null,
        clientId: 'client-001',
      });
      prisma.userClientAccess.update.mockResolvedValue({
        id: 'uca-legacy',
        isActive: false,
      });
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-coord',
        document: '123456',
        tenantId: 'tenant-123',
      });
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-coord',
        document: '123456',
        clientId: 'client-001',
        clientHistory: [
          {
            clientId: 'client-001',
            clientName: 'Conjunto Paraiso',
            assignedAt: '2026-01-01',
            unassignedAt: null,
          },
        ],
      });

      const result = await service.unassignUser(
        'client-001',
        'uca-legacy',
        mockAdminUser,
      );

      expect(prisma.employee.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('unassignUser should throw NotFoundException if access not found', async () => {
      clientRepository.findOne.mockResolvedValue({ ...sampleDbClient });
      prisma.userClientAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.unassignUser('client-001', 'non-existent', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Scoped View & Autocomplete methods', () => {
    it('autocomplete should query active clients in prisma', async () => {
      prisma.client.findMany = jest.fn().mockResolvedValue([
        {
          id: 'c-1',
          name: 'Conjunto Uno',
          internalCode: 'CLI-1',
          nit: '123',
        },
      ]);
      const list = await service.autocomplete('Conjunto', mockAdminUser, 5);
      expect(prisma.client.findMany).toHaveBeenCalled();
      expect(list).toHaveLength(1);
    });

    it('autocompleteUnits should query units in prisma', async () => {
      prisma.unit = {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u-1',
            unitName: '101',
            tower: { id: 't-1', towerName: 'Torre 1' },
          },
        ]),
      };
      const list = await service.autocompleteUnits(
        'client-001',
        '101',
        mockAdminUser,
        5,
      );
      expect(prisma.unit.findMany).toHaveBeenCalled();
      expect(list).toHaveLength(1);
    });
  });

  describe('create and update methods', () => {
    it('create should create a client and auto-generate internalCode if not provided', async () => {
      clientRepository.create.mockResolvedValue({
        ...sampleDbClient,
        id: 'client-new',
        internalCode: 'CLI-5555',
      });
      clientRepository.findOne.mockResolvedValue({
        ...sampleDbClient,
        id: 'client-new',
        internalCode: 'CLI-5555',
      });

      const dto = {
        name: 'Cliente Nuevo',
        nit: '999888777-1',
        sector: 'RESIDENTIAL' as any,
      };

      const result = await service.create(dto, mockAdminUser);
      expect(clientRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('create should throw ConflictException if P2002 error occurs', async () => {
      clientRepository.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['nit'] },
      });

      await expect(
        service.create(
          { name: 'Dup', nit: '999', sector: 'RESIDENTIAL' as any },
          mockAdminUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('update should update client fields and return mapped response', async () => {
      clientRepository.findOne
        .mockResolvedValueOnce({ ...sampleDbClient })
        .mockResolvedValueOnce({ ...sampleDbClient, name: 'Actualizado' });
      clientRepository.update.mockResolvedValue({
        ...sampleDbClient,
        name: 'Actualizado',
      });

      const result = await service.update(
        'client-001',
        { name: 'Actualizado' },
        mockAdminUser,
      );
      expect(clientRepository.update).toHaveBeenCalled();
      expect(result.name).toBe('Actualizado');
    });

    it('update should throw NotFoundException if client does not exist', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Nuevo' }, mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll and filtering', () => {
    it('findAll should return clients for admin with client:manage', async () => {
      clientRepository.findMany.mockResolvedValue([{ ...sampleDbClient }]);

      const result = await service.findAll(mockAdminUser, { take: 10 });
      const list = Array.isArray(result) ? result : result.data;
      expect(clientRepository.findMany).toHaveBeenCalled();
      expect(list.length).toBe(1);
    });

    it('findAll should filter by allowedClientIds if user has restricted assigned permissions', async () => {
      clientRepository.findMany.mockResolvedValue([{ ...sampleDbClient }]);
      prisma.userClientAccess.findMany.mockResolvedValue([
        { clientId: 'client-001' },
      ]);

      const restrictedUser: UserContext = {
        sub: 'user-assigned',
        tenantId: 'tenant-001',
        permissions: ['client:read_assigned'],
        roles: ['GUARD'],
      };

      const result = await service.findAll(restrictedUser);
      const list = Array.isArray(result) ? result : result.data;
      expect(clientRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['client-001'] },
          }),
        }),
      );
      expect(list.length).toBe(1);
    });
  });

  describe('remove and reactivate', () => {
    it('remove should soft-delete client by setting isActive false', async () => {
      clientRepository.findOne
        .mockResolvedValueOnce({ ...sampleDbClient, isActive: true })
        .mockResolvedValueOnce({ ...sampleDbClient, isActive: false });
      clientRepository.update.mockResolvedValue({
        ...sampleDbClient,
        isActive: false,
      });

      const result = await service.remove('client-001', mockAdminUser);
      expect(clientRepository.update).toHaveBeenCalledWith(
        'client-001',
        expect.objectContaining({
          isActive: false,
          deletedBy: { connect: { id: 'user-admin' } },
        }),
      );
      expect(result.isActive).toBe(false);
    });

    it('remove should throw NotFoundException if client does not exist', async () => {
      clientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('reactivate should set isActive true', async () => {
      clientRepository.findOne
        .mockResolvedValueOnce({ ...sampleDbClient, isActive: false })
        .mockResolvedValueOnce({ ...sampleDbClient, isActive: true });
      clientRepository.update.mockResolvedValue({
        ...sampleDbClient,
        isActive: true,
      });

      const result = await service.reactivate('client-001', mockAdminUser);
      expect(clientRepository.update).toHaveBeenCalledWith(
        'client-001',
        expect.objectContaining({
          isActive: true,
          deletedAt: null,
          deletedBy: { disconnect: true },
          updatedBy: { connect: { id: 'user-admin' } },
        }),
      );
      expect(result.isActive).toBe(true);
    });
  });
});
