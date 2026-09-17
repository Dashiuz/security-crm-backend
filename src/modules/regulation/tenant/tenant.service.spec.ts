import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { TenantRepositoryService } from '../../../common/repository/tenant/tenant.repository.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanTier, SubscriptionStatus, PasswordPolicy } from '@prisma/client';

describe('TenantService', () => {
  let service: TenantService;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    updateProfile: jest.Mock;
    updateSettings: jest.Mock;
    updateSubscription: jest.Mock;
    remove: jest.Mock;
    getAllFeatures: jest.Mock;
    syncFeatures: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateProfile: jest.fn(),
      updateSettings: jest.fn(),
      updateSubscription: jest.fn(),
      remove: jest.fn(),
      getAllFeatures: jest.fn(),
      syncFeatures: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: TenantRepositoryService,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tenant with default satellite tables if not provided', async () => {
      const mockResult = {
        id: 't-123',
        name: 'New Org',
        slug: 'new-org',
        isActive: true,
        logoUrl: null,
        primaryColor: '#1976d2',
        secondaryColor: '#9c27b0',
        sidebarColor: null,
        profile: {
          id: 'p-1',
          tenantId: 't-123',
          legalName: 'New Org',
          taxId: 'N/A',
          contactEmail: 'contacto@new-org.local',
        },
        subscription: {
          id: 's-1',
          tenantId: 't-123',
          planTier: PlanTier.BASIC,
          status: SubscriptionStatus.TRIAL,
          maxClients: 5,
          maxUsers: 50,
          maxEmployees: 50,
        },
        settings: {
          id: 'cfg-1',
          tenantId: 't-123',
          timezone: 'America/Bogota',
          currency: 'COP',
          dateFormat: 'DD/MM/YYYY',
          mfaRequired: false,
          sessionTimeoutMinutes: 60,
          passwordPolicy: PasswordPolicy.MEDIUM,
        },
        features: [],
      };

      repository.create.mockResolvedValue(mockResult);

      const result = await service.create({
        name: 'New Org',
        slug: 'new-org',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Org',
          slug: 'new-org',
          profile: expect.objectContaining({
            create: expect.objectContaining({
              legalName: 'New Org',
              taxId: 'N/A',
              contactEmail: 'contacto@new-org.local',
            }),
          }),
          subscription: expect.objectContaining({
            create: expect.objectContaining({
              planTier: PlanTier.BASIC,
              status: SubscriptionStatus.TRIAL,
              maxClients: 5,
            }),
          }),
          settings: expect.objectContaining({
            create: expect.objectContaining({
              timezone: 'America/Bogota',
              currency: 'COP',
              sessionTimeoutMinutes: 60,
            }),
          }),
        }),
      );

      expect(result.id).toBe('t-123');
      expect(result.profile?.legalName).toBe('New Org');
      expect(result.subscription?.planTier).toBe(PlanTier.BASIC);
      expect(result.settings?.timezone).toBe('America/Bogota');
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if trying to deactivate system tenant', async () => {
      repository.findById.mockResolvedValue({
        id: 'system',
        slug: 'system',
        name: 'system',
        isActive: true,
      });

      await expect(
        service.update('system', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProfile', () => {
    it('should update the profile of a tenant', async () => {
      repository.findById.mockResolvedValue({
        id: 't-123',
        slug: 'tenant-123',
        name: 'Tenant 123',
      });

      const updatedProfile = {
        id: 'p-1',
        tenantId: 't-123',
        legalName: 'Updated Legal Name',
        taxId: '999888777-1',
        contactEmail: 'legal@tenant123.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.updateProfile.mockResolvedValue(updatedProfile);

      const result = await service.updateProfile('t-123', {
        legalName: 'Updated Legal Name',
        taxId: '999888777-1',
      });

      expect(repository.updateProfile).toHaveBeenCalledWith(
        't-123',
        { legalName: 'Updated Legal Name', taxId: '999888777-1' },
        expect.objectContaining({
          legalName: 'Updated Legal Name',
          taxId: '999888777-1',
        }),
      );
      expect(result.legalName).toBe('Updated Legal Name');
    });
  });

  describe('updateSettings', () => {
    it('should update the settings of a tenant', async () => {
      repository.findById.mockResolvedValue({
        id: 't-123',
        slug: 'tenant-123',
        name: 'Tenant 123',
      });

      const updatedSettings = {
        id: 'cfg-1',
        tenantId: 't-123',
        timezone: 'America/Mexico_City',
        currency: 'MXN',
        dateFormat: 'YYYY-MM-DD',
        mfaRequired: true,
        sessionTimeoutMinutes: 30,
        passwordPolicy: PasswordPolicy.STRICT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.updateSettings.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings('t-123', {
        timezone: 'America/Mexico_City',
        sessionTimeoutMinutes: 30,
      });

      expect(repository.updateSettings).toHaveBeenCalledWith(
        't-123',
        { timezone: 'America/Mexico_City', sessionTimeoutMinutes: 30 },
        expect.objectContaining({
          timezone: 'America/Mexico_City',
          sessionTimeoutMinutes: 30,
        }),
      );
      expect(result.timezone).toBe('America/Mexico_City');
    });
  });
});
