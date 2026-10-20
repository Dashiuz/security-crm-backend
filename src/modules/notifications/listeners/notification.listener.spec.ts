import { NotificationListener } from './notification.listener';
import { NotificationsService } from '../services/notifications.service';
import { SseService } from '../sse/sse.service';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let mockNotificationsService: jest.Mocked<Partial<NotificationsService>>;
  let mockSseService: jest.Mocked<Partial<SseService>>;

  beforeEach(() => {
    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' } as any),
    };

    mockSseService = {
      emitToTenant: jest.fn(),
      emitToUser: jest.fn(),
    };

    listener = new NotificationListener(
      mockNotificationsService as unknown as NotificationsService,
      mockSseService as unknown as SseService,
    );
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleTicketAssigned', () => {
    const event = {
      ticket: {
        id: 'ticket-1',
        code: 'PQR-2026-001',
        subject: 'Fuga de agua',
        tenantId: 'tenant-1',
        clientId: 'client-1',
      },
      assignedToId: 'user-agent-1',
      assignedById: 'user-admin-1',
    } as any;

    it('should create notification and emit SSE to tenant', async () => {
      await listener.handleTicketAssigned(event);

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-agent-1',
        title: 'Nueva PQRS Asignada',
        message: 'Se te ha asignado el ticket PQR-2026-001: "Fuga de agua"',
        type: 'PQRS_ASSIGNED',
        link: '/administrative/pqrs/ticket-1',
      });

      expect(mockSseService.emitToTenant).toHaveBeenCalledWith(
        'tenant-1',
        {
          type: 'PQRS_UPDATED',
          ticketId: 'ticket-1',
          code: 'PQR-2026-001',
          triggeredById: 'user-admin-1',
        },
        'client-1',
      );
    });

    it('should catch error and log without throwing', async () => {
      (
        mockNotificationsService.createNotification as jest.Mock
      ).mockRejectedValue(new Error('Database error'));

      await expect(listener.handleTicketAssigned(event)).resolves.not.toThrow();
    });
  });

  describe('handleTicketStatusChanged', () => {
    const event = {
      ticket: {
        id: 'ticket-1',
        code: 'PQR-2026-001',
        status: 'IN_PROGRESS',
        tenantId: 'tenant-1',
        clientId: 'client-1',
      },
      triggeredById: 'user-admin-1',
    } as any;

    it('should emit SSE to tenant on status change', () => {
      listener.handleTicketStatusChanged(event);

      expect(mockSseService.emitToTenant).toHaveBeenCalledWith(
        'tenant-1',
        {
          type: 'PQRS_UPDATED',
          ticketId: 'ticket-1',
          code: 'PQR-2026-001',
          status: 'IN_PROGRESS',
          triggeredById: 'user-admin-1',
        },
        'client-1',
      );
    });

    it('should catch error and not throw', () => {
      (mockSseService.emitToTenant as jest.Mock).mockImplementation(() => {
        throw new Error('SSE emission error');
      });

      expect(() => listener.handleTicketStatusChanged(event)).not.toThrow();
    });
  });

  describe('handleTicketCreated', () => {
    const event = {
      ticket: {
        id: 'ticket-2',
        code: 'PQR-2026-002',
        status: 'OPEN',
        tenantId: 'tenant-1',
        clientId: 'client-1',
      },
      triggeredById: 'user-resident-1',
    } as any;

    it('should emit SSE to tenant on ticket created', () => {
      listener.handleTicketCreated(event);

      expect(mockSseService.emitToTenant).toHaveBeenCalledWith(
        'tenant-1',
        {
          type: 'PQRS_UPDATED',
          ticketId: 'ticket-2',
          code: 'PQR-2026-002',
          status: 'OPEN',
          triggeredById: 'user-resident-1',
        },
        'client-1',
      );
    });

    it('should catch error and not throw', () => {
      (mockSseService.emitToTenant as jest.Mock).mockImplementation(() => {
        throw new Error('SSE failure');
      });

      expect(() => listener.handleTicketCreated(event)).not.toThrow();
    });
  });

  describe('handleTicketReplied', () => {
    const event = {
      ticket: {
        id: 'ticket-1',
        code: 'PQR-2026-001',
        tenantId: 'tenant-1',
        clientId: 'client-1',
      },
      message: {
        id: 'msg-1',
        text: 'Respuesta al ticket',
        createdById: 'user-agent-1',
      },
      triggeredById: 'user-agent-1',
    } as any;

    it('should emit SSE to tenant on ticket replied', () => {
      listener.handleTicketReplied(event);

      expect(mockSseService.emitToTenant).toHaveBeenCalledWith(
        'tenant-1',
        {
          type: 'PQRS_MESSAGE_ADDED',
          ticketId: 'ticket-1',
          code: 'PQR-2026-001',
          message: event.message,
          triggeredById: 'user-agent-1',
        },
        'client-1',
      );
    });

    it('should catch error and not throw', () => {
      (mockSseService.emitToTenant as jest.Mock).mockImplementation(() => {
        throw new Error('SSE failure');
      });

      expect(() => listener.handleTicketReplied(event)).not.toThrow();
    });
  });

  describe('handleTicketPriorityChanged', () => {
    const event = {
      ticket: {
        id: 'ticket-1',
        code: 'PQR-2026-001',
        priority: 'HIGH',
        tenantId: 'tenant-1',
        clientId: 'client-1',
      },
      triggeredById: 'user-manager-1',
    };

    it('should emit SSE to tenant on priority changed', () => {
      listener.handleTicketPriorityChanged(event);

      expect(mockSseService.emitToTenant).toHaveBeenCalledWith(
        'tenant-1',
        {
          type: 'PQRS_UPDATED',
          ticketId: 'ticket-1',
          code: 'PQR-2026-001',
          priority: 'HIGH',
          triggeredById: 'user-manager-1',
        },
        'client-1',
      );
    });

    it('should catch error and not throw', () => {
      (mockSseService.emitToTenant as jest.Mock).mockImplementation(() => {
        throw new Error('SSE failure');
      });

      expect(() => listener.handleTicketPriorityChanged(event)).not.toThrow();
    });
  });
});
