import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserRepositoryService } from '../../../common/repository/index';
import { PrismaService } from '../../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: any;
  let mockUserRepository: any;
  let mockPrisma: any;

  beforeEach(async () => {
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked-signed-jwt'),
      signAsync: jest.fn().mockResolvedValue('mocked-signed-jwt'),
      verify: jest.fn(),
    };

    mockUserRepository = {
      findActiveByDocument: jest.fn(),
      findById: jest.fn(),
      getUserPermissions: jest.fn().mockResolvedValue(['resident:read']),
      getUserRoles: jest.fn().mockResolvedValue(['residence-manager']),
      getTenantFeatures: jest.fn().mockResolvedValue(['client', 'resident']),
    };

    mockPrisma = {
      userClientAccess: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserRepositoryService,
          useValue: mockUserRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('clears refresh cookie', () => {
    const res = service.clearRefreshCookie();
    expect(res).toBeDefined();
    expect(res.name).toBe('refresh_token');
  });

  describe('switchClient', () => {
    it('should switch active client when access is authorized', async () => {
      mockPrisma.userClientAccess.findFirst.mockResolvedValue({
        id: 'access-1',
        userId: 'user-123',
        clientId: 'client-456',
        isActive: true,
        client: { id: 'client-456', name: 'Conjunto Santa Fe' },
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockUserRepository.findById.mockResolvedValue({
        id: 'user-123',
        tenantId: 'tenant-1',
        userType: 'RESIDENCE_MANAGER',
      });

      const res = await service.switchClient('user-123', 'client-456');

      expect(mockPrisma.userClientAccess.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          clientId: 'client-456',
          isActive: true,
        },
        include: { client: true },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { clientId: 'client-456' },
      });
      expect(res.activeClientId).toBe('client-456');
      expect(res.clientName).toBe('Conjunto Santa Fe');
      expect(res.accessToken).toBe('mocked-signed-jwt');
    });

    it('should throw ForbiddenException if user has no access to target client', async () => {
      mockPrisma.userClientAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.switchClient('user-123', 'client-unauthorized'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user record is missing', async () => {
      mockPrisma.userClientAccess.findFirst.mockResolvedValue({
        id: 'access-1',
        client: { name: 'Conjunto' },
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.switchClient('user-123', 'client-456'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyAccessibleClients', () => {
    it('should return list of accessible clients for user', async () => {
      mockPrisma.userClientAccess.findMany.mockResolvedValue([
        {
          roleName: 'Administrador Titular',
          client: {
            id: 'client-1',
            name: 'Bosques del Norte',
            internalCode: 'CLI-001',
            nit: '900111222',
          },
        },
        {
          roleName: 'Delegado',
          client: {
            id: 'client-2',
            name: 'Torres del Parque',
            internalCode: 'CLI-002',
            nit: '900333444',
          },
        },
      ]);

      const res = await service.getMyAccessibleClients('user-123');

      expect(res).toHaveLength(2);
      expect(res[0].name).toBe('Bosques del Norte');
      expect(res[1].name).toBe('Torres del Parque');
      expect(res[0].roleName).toBe('Administrador Titular');
    });
  });
});
