import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ParkingControlController } from './parking-control.controller';
import { ParkingControlService } from '../services/parking-control.service';
import { PERMISSIONS_KEY } from '../../../regulation/access-control/permissions.decorator';

describe('ParkingControlController (Lifecycle Permissions)', () => {
  let controller: ParkingControlController;
  let service: any;
  let reflector: Reflector;

  beforeEach(async () => {
    service = {
      registerExit: jest
        .fn()
        .mockResolvedValue({ id: 'park-1', exitTimestamp: new Date() }),
      void: jest.fn().mockResolvedValue({ id: 'park-1', status: 'VOIDED' }),
      update: jest.fn().mockResolvedValue({ id: 'park-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingControlController],
      providers: [
        { provide: ParkingControlService, useValue: service },
        Reflector,
      ],
    }).compile();

    controller = module.get<ParkingControlController>(ParkingControlController);
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
      const dto: any = { exitTimestamp: '2026-10-16T12:00:00Z' };

      const result = await controller.registerExit(req, 'park-1', dto);

      expect(service.registerExit).toHaveBeenCalledWith(
        'park-1',
        dto,
        'guard-user-id',
      );
      expect(result).toHaveProperty('exitTimestamp');
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
