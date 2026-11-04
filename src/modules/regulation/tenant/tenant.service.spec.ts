import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { TenantRepositoryService } from '../../../common/repository/tenant/tenant.repository.service';
import { S3Service } from '../../storage/services/s3.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanTier, SubscriptionStatus, PasswordPolicy } from '@prisma/client';

describe('TenantService', () => {
  let service: TenantService;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    update: jest.Mock;
    updateProfile: jest.Mock;
    updateSettings: jest.Mock;
    updateSubscription: jest.Mock;
    remove: jest.Mock;
    getAllFeatures: jest.Mock;
    syncFeatures: jest.Mock;
  };
  let s3Service: {
    uploadFile: jest.Mock;
    getPresignedUrl: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn(),
      updateProfile: jest.fn(),
      updateSettings: jest.fn(),
      updateSubscription: jest.fn(),
      remove: jest.fn(),
      getAllFeatures: jest.fn(),
      syncFeatures: jest.fn(),
    };

    s3Service = {
      uploadFile: jest.fn(),
      getPresignedUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: TenantRepositoryService,
          useValue: repository,
        },
        {
          provide: S3Service,
          useValue: s3Service,
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

  describe('uploadLogo', () => {
    it('should upload image file to S3 and update tenant logoUrl', async () => {
      const mockTenant = { id: 't-123', name: 'Test Org', slug: 'test-org' };
      repository.findById.mockResolvedValue(mockTenant);
      s3Service.uploadFile.mockResolvedValue({
        url: 'https://bucket.s3.amazonaws.com/tenants/t-123/brand/logo.png',
        s3Key: 'tenants/t-123/brand/logo.png',
      });
      repository.update.mockResolvedValue({
        ...mockTenant,
        logoUrl: 'https://bucket.s3.amazonaws.com/tenants/t-123/brand/logo.png',
      });

      const mockFile = {
        buffer: Buffer.from('fake-image-bytes'),
        originalname: 'logo.png',
        mimetype: 'image/png',
      } as Express.Multer.File;

      const result = await service.uploadLogo('t-123', mockFile);

      expect(s3Service.uploadFile).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith('t-123', {
        logoUrl: 'https://bucket.s3.amazonaws.com/tenants/t-123/brand/logo.png',
      });
      expect(result).toEqual({
        success: true,
        logoUrl: '/api/tenants/t-123/logo',
      });
    });

    it('should throw BadRequestException if file has no buffer', async () => {
      repository.findById.mockResolvedValue({ id: 't-123', name: 'Test' });
      await expect(
        service.uploadLogo('t-123', {} as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLogoStreamOrUrl', () => {
    it('should return redirect with presigned URL for S3 logos', async () => {
      repository.findById.mockResolvedValue({
        id: 't-123',
        logoUrl: 'https://bucket.s3.amazonaws.com/tenants/t-123/brand/logo.png',
      });
      s3Service.getPresignedUrl.mockResolvedValue(
        'https://signed-url.com/logo.png',
      );

      const result = await service.getLogoStreamOrUrl('t-123');

      expect(s3Service.getPresignedUrl).toHaveBeenCalledWith(
        'tenants/t-123/brand/logo.png',
      );
      expect(result).toEqual({
        type: 'redirect',
        url: 'https://signed-url.com/logo.png',
      });
    });

    it('should return buffer for data URL logos', async () => {
      const dataUrl = 'data:image/png;base64,aGVsbG8=';
      repository.findById.mockResolvedValue({ id: 't-123', logoUrl: dataUrl });

      const result = await service.getLogoStreamOrUrl('t-123');

      expect(result).toEqual({
        type: 'buffer',
        mimeType: 'image/png',
        buffer: Buffer.from('aGVsbG8=', 'base64'),
      });
    });

    it('should throw NotFoundException if tenant or logoUrl not found', async () => {
      repository.findById.mockResolvedValue(null);
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.getLogoStreamOrUrl('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
