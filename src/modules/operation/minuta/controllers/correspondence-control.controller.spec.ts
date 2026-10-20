import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CorrespondenceControlController } from './correspondence-control.controller';
import { CorrespondenceControlService } from '../services/correspondence-control.service';
import { PERMISSIONS_KEY } from '../../../regulation/access-control/permissions.decorator';

describe('CorrespondenceControlController (Lifecycle Permissions)', () => {
  let controller: CorrespondenceControlController;
  let service: any;
  let reflector: Reflector;

  beforeEach(async () => {
    service = {
      deliver: jest.fn().mockResolvedValue({ id: 'pkg-1', isDelivered: true }),
      void: jest.fn().mockResolvedValue({ id: 'pkg-1', status: 'VOIDED' }),
      update: jest.fn().mockResolvedValue({ id: 'pkg-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorrespondenceControlController],
      providers: [
        { provide: CorrespondenceControlService, useValue: service },
        Reflector,
      ],
    }).compile();

    controller = module.get<CorrespondenceControlController>(
      CorrespondenceControlController,
    );
    reflector = module.get<Reflector>(Reflector);
  });

  describe('deliver', () => {
    it('should include minuta:create in required permissions alongside minuta:manage and minuta:update', () => {
      const permissions = reflector.get<string[]>(
        PERMISSIONS_KEY,
        controller.deliver,
      );

      expect(permissions).toBeDefined();
      expect(permissions).toContain('minuta:create');
      expect(permissions).toContain('minuta:manage');
      expect(permissions).toContain('minuta:update');
    });

    it('should delegate deliver call to service with user sub', async () => {
      const req = { user: { sub: 'guard-user-id' } };
      const dto: any = { receiverName: 'Juan Perez' };

      const result = await controller.deliver(req, 'pkg-1', dto);

      expect(service.deliver).toHaveBeenCalledWith(
        'pkg-1',
        dto,
        'guard-user-id',
      );
      expect(result).toEqual({ id: 'pkg-1', isDelivered: true });
    });
  });

  describe('void & update security boundary', () => {
    it('should strictly NOT include minuta:create on void endpoint', () => {
      const permissions = reflector.get<string[]>(
        PERMISSIONS_KEY,
        controller.void,
      );

      expect(permissions).toBeDefined();
      expect(permissions).not.toContain('minuta:create');
      expect(permissions).toContain('minuta:update');
      expect(permissions).toContain('minuta:manage');
    });

    it('should strictly NOT include minuta:create on update endpoint', () => {
      const permissions = reflector.get<string[]>(
        PERMISSIONS_KEY,
        controller.update,
      );

      expect(permissions).toBeDefined();
      expect(permissions).not.toContain('minuta:create');
      expect(permissions).toContain('minuta:update');
      expect(permissions).toContain('minuta:manage');
    });
  });
});
