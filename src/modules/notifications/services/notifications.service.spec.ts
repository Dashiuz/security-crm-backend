import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { RequestContextService } from '../../../common/context/request-context.service';
import { SseService } from '../sse/sse.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: any;
  let contextService: any;
  let sseService: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findUnread: jest.fn(),
      countUnread: jest.fn(),
      findMany: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    contextService = {
      userId: 'user-123',
      tenantId: 'tenant-456',
    };

    sseService = {
      emitToUser: jest.fn(),
      emitToTenant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationRepository, useValue: repository },
        { provide: RequestContextService, useValue: contextService },
        { provide: SseService, useValue: sseService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('debe crear una notificación y emitirla por SSE al usuario', async () => {
    const mockCreated = {
      id: 'notif-1',
      tenantId: 'tenant-456',
      userId: 'user-123',
      title: 'Nueva PQRS',
      message: 'Se te ha asignado una PQRS',
      type: 'PQRS_ASSIGNED',
      isRead: false,
    };
    repository.create.mockResolvedValue(mockCreated);

    const result = await service.createNotification({
      tenantId: 'tenant-456',
      userId: 'user-123',
      title: 'Nueva PQRS',
      message: 'Se te ha asignado una PQRS',
      type: 'PQRS_ASSIGNED',
    });

    expect(result).toEqual(mockCreated);
    expect(repository.create).toHaveBeenCalled();
    expect(sseService.emitToUser).toHaveBeenCalledWith('user-123', {
      type: 'NOTIFICATION',
      notification: mockCreated,
    });
  });

  it('debe obtener el conteo de no leídas y la lista reciente', async () => {
    repository.findUnread.mockResolvedValue([{ id: 'notif-1' }]);
    repository.countUnread.mockResolvedValue(1);

    const res = await service.getUnread();

    expect(res.unreadCount).toBe(1);
    expect(res.data).toHaveLength(1);
    expect(repository.findUnread).toHaveBeenCalledWith(
      'user-123',
      'tenant-456',
      15,
    );
  });

  it('debe marcar una notificación como leída', async () => {
    repository.markAsRead.mockResolvedValue({ id: 'notif-1', isRead: true });

    const res = await service.markAsRead('notif-1');
    expect(res.isRead).toBe(true);
    expect(repository.markAsRead).toHaveBeenCalledWith(
      'notif-1',
      'user-123',
      'tenant-456',
    );
  });

  it('debe marcar todas las notificaciones como leídas', async () => {
    repository.markAllAsRead.mockResolvedValue({ count: 5 });

    const res = await service.markAllAsRead();
    expect(res.success).toBe(true);
    expect(res.count).toBe(5);
    expect(repository.markAllAsRead).toHaveBeenCalledWith(
      'user-123',
      'tenant-456',
    );
  });
});
