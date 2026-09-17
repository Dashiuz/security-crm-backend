import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

describe('TenantController', () => {
  let controller: TenantController;
  let service: {
    create: jest.Mock;
    list: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    updateProfile: jest.Mock;
    updateSettings: jest.Mock;
    remove: jest.Mock;
    syncFeatures: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateProfile: jest.fn(),
      updateSettings: jest.fn(),
      remove: jest.fn(),
      syncFeatures: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        {
          provide: TenantService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TenantController>(TenantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyTenant', () => {
    it('should retrieve the tenant for req.user.tenantId', async () => {
      const mockReq = { user: { tenantId: 'my-tenant-id' } };
      service.findOne.mockResolvedValue({ id: 'my-tenant-id', name: 'My Tenant' });

      const result = await controller.getMyTenant(mockReq);

      expect(service.findOne).toHaveBeenCalledWith('my-tenant-id');
      expect(result).toEqual({ id: 'my-tenant-id', name: 'My Tenant' });
    });
  });

  describe('updateMyProfile', () => {
    it('should update the profile using req.user.tenantId', async () => {
      const mockReq = { user: { tenantId: 'my-tenant-id' } };
      const dto = { legalName: 'New Legal Name' };
      service.updateProfile.mockResolvedValue({ id: 'p1', legalName: 'New Legal Name' });

      const result = await controller.updateMyProfile(mockReq, dto);

      expect(service.updateProfile).toHaveBeenCalledWith('my-tenant-id', dto);
      expect(result).toEqual({ id: 'p1', legalName: 'New Legal Name' });
    });
  });

  describe('updateMySettings', () => {
    it('should update the settings using req.user.tenantId', async () => {
      const mockReq = { user: { tenantId: 'my-tenant-id' } };
      const dto = { timezone: 'America/New_York' };
      service.updateSettings.mockResolvedValue({ id: 'cfg1', timezone: 'America/New_York' });

      const result = await controller.updateMySettings(mockReq, dto);

      expect(service.updateSettings).toHaveBeenCalledWith('my-tenant-id', dto);
      expect(result).toEqual({ id: 'cfg1', timezone: 'America/New_York' });
    });
  });

  describe('GODLIKE routes delegation', () => {
    it('should delegate create', async () => {
      const dto = { name: 'Tenant A', slug: 'tenant-a' };
      service.create.mockResolvedValue({ id: 't1', ...dto });

      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 't1', ...dto });
    });

    it('should delegate findAll', async () => {
      service.list.mockResolvedValue([{ id: 't1' }]);

      const result = await controller.findAll();
      expect(service.list).toHaveBeenCalled();
      expect(result).toEqual([{ id: 't1' }]);
    });

    it('should delegate findOne', async () => {
      service.findOne.mockResolvedValue({ id: 't1' });

      const result = await controller.findOne('t1');
      expect(service.findOne).toHaveBeenCalledWith('t1');
      expect(result).toEqual({ id: 't1' });
    });

    it('should delegate update', async () => {
      const dto = { name: 'Updated' };
      service.update.mockResolvedValue({ id: 't1', name: 'Updated' });

      const result = await controller.update('t1', dto);
      expect(service.update).toHaveBeenCalledWith('t1', dto);
      expect(result).toEqual({ id: 't1', name: 'Updated' });
    });

    it('should delegate remove', async () => {
      service.remove.mockResolvedValue({ id: 't1' });

      const result = await controller.remove('t1');
      expect(service.remove).toHaveBeenCalledWith('t1');
      expect(result).toEqual({ id: 't1' });
    });
  });
});
