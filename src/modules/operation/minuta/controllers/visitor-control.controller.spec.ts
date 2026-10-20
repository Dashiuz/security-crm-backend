import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { VisitorControlController } from './visitor-control.controller';
import { VisitorControlService } from '../services/visitor-control.service';
import { PERMISSIONS_KEY } from '../../../regulation/access-control/permissions.decorator';

describe('VisitorControlController (Lifecycle Permissions)', () => {
  let controller: VisitorControlController;
  let service: any;
  let reflector: Reflector;

  beforeEach(async () => {
    service = {
      registerExit: jest
        .fn()
        .mockResolvedValue({ id: 'vis-1', exitTime: new Date() }),
      void: jest.fn().mockResolvedValue({ id: 'vis-1', status: 'VOIDED' }),
      update: jest.fn().mockResolvedValue({ id: 'vis-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitorControlController],
      providers: [
        { provide: VisitorControlService, useValue: service },
        Reflector,
      ],
    }).compile();

    controller = module.get<VisitorControlController>(VisitorControlController);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('registerExit', () => {
    it('should include minuta:create in required permissions alongside minuta:manage and minuta:update', () => {
      const permissions = reflector.get<string[]>(
        PERMISSIONS_KEY,
        controller.registerExit,
      );

      expect(permissions).toBeDefined();
      expect(permissions).toContain('minuta:create');
      expect(permissions).toContain('minuta:manage');
      expect(permissions).toContain('minuta:update');
    });

    it('should delegate registerExit call to service with user sub', async () => {
      const req = { user: { sub: 'guard-user-id' } };
      const dto: any = { exitTime: '2026-10-16T12:00:00Z' };

      const result = await controller.registerExit(req, 'vis-1', dto);

      expect(service.registerExit).toHaveBeenCalledWith(
        'vis-1',
        dto,
        'guard-user-id',
      );
      expect(result).toHaveProperty('exitTime');
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
    });

    it('should strictly NOT include minuta:create on update endpoint', () => {
      const permissions = reflector.get<string[]>(
        PERMISSIONS_KEY,
        controller.update,
      );

      expect(permissions).toBeDefined();
      expect(permissions).not.toContain('minuta:create');
      expect(permissions).toContain('minuta:update');
    });
  });
});
