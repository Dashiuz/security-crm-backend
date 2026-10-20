import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from '../services/notifications.service';
import { SseService } from '../sse/sse.service';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { of } from 'rxjs';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<Partial<NotificationsService>>;
  let sseService: jest.Mocked<Partial<SseService>>;

  beforeEach(async () => {
    service = {
      getUnread: jest.fn(),
      findAll: jest.fn(),
      markAllAsRead: jest.fn(),
      markAsRead: jest.fn(),
    };

    sseService = {
      getUserStream: jest
        .fn()
        .mockReturnValue(of({ data: 'mock-event' } as any)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: service },
        { provide: SseService, useValue: sseService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sse', () => {
    it('should delegate to sseService.getUserStream with req user fields', (done) => {
      const mockReq = {
        user: {
          sub: 'user-sub-1',
          tenantId: 'tenant-1',
          clientId: 'client-1',
        },
      };

      const stream$ = controller.sse(mockReq);
      expect(sseService.getUserStream).toHaveBeenCalledWith(
        'user-sub-1',
        'tenant-1',
        'client-1',
      );

      stream$.subscribe((event) => {
        expect(event).toEqual({ data: 'mock-event' });
        done();
      });
    });

    it('should fallback to user.id when sub is absent', () => {
      const mockReq = {
        user: {
          id: 'user-id-2',
          tenantId: 'tenant-2',
        },
      };

      controller.sse(mockReq);
      expect(sseService.getUserStream).toHaveBeenCalledWith(
        'user-id-2',
        'tenant-2',
        undefined,
      );
    });
  });

  describe('getUnread', () => {
    it('should call notificationsService.getUnread', async () => {
      const unreadData = { data: [], unreadCount: 0 };
      (service.getUnread as jest.Mock).mockResolvedValue(unreadData);

      const result = await controller.getUnread();
      expect(service.getUnread).toHaveBeenCalled();
      expect(result).toEqual(unreadData);
    });
  });

  describe('findAll', () => {
    it('should call notificationsService.findAll with parsed pagination', async () => {
      const history = { data: [], total: 0, page: 2, limit: 10 };
      (service.findAll as jest.Mock).mockResolvedValue(history);

      const result = await controller.findAll(2, 10);
      expect(service.findAll).toHaveBeenCalledWith(2, 10);
      expect(result).toEqual(history);
    });

    it('should default pagination to page 1 and limit 20 when parameters are missing', async () => {
      (service.findAll as jest.Mock).mockResolvedValue({ data: [] });

      await controller.findAll(undefined, undefined);
      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('markAllAsRead', () => {
    it('should call notificationsService.markAllAsRead', async () => {
      const response = { success: true, count: 5 };
      (service.markAllAsRead as jest.Mock).mockResolvedValue(response);

      const result = await controller.markAllAsRead();
      expect(service.markAllAsRead).toHaveBeenCalled();
      expect(result).toEqual(response);
    });
  });

  describe('markAsRead', () => {
    it('should call notificationsService.markAsRead with id', async () => {
      const updated = { id: 'notif-1', isRead: true };
      (service.markAsRead as jest.Mock).mockResolvedValue(updated);

      const result = await controller.markAsRead('notif-1');
      expect(service.markAsRead).toHaveBeenCalledWith('notif-1');
      expect(result).toEqual(updated);
    });
  });
});
