import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RequestContextService } from '../../../common/context/request-context.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { SseService } from '../sse/sse.service';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly contextService: RequestContextService,
    private readonly sseService: SseService,
  ) {}

  /**
   * Crea y despacha una notificación en base de datos y por SSE
   */
  async createNotification(payload: {
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }): Promise<Notification> {
    const notification = await this.repository.create({
      tenantId: payload.tenantId,
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      link: payload.link,
    });

    // Despachar en tiempo real al usuario destinatario
    this.sseService.emitToUser(payload.userId, {
      type: 'NOTIFICATION',
      notification,
    });

    return notification;
  }

  /**
   * Obtiene la lista de notificaciones no leídas y conteo total para el usuario autenticado
   */
  async getUnread(): Promise<{ data: Notification[]; unreadCount: number }> {
    const userId = this.contextService.userId;
    const tenantId = this.contextService.tenantId;

    if (!userId || !tenantId) {
      throw new BadRequestException(
        'Contexto de usuario o empresa no disponible',
      );
    }

    const [data, unreadCount] = await Promise.all([
      this.repository.findUnread(userId, tenantId, 15),
      this.repository.countUnread(userId, tenantId),
    ]);

    return {
      data,
      unreadCount,
    };
  }

  /**
   * Obtiene el historial de notificaciones con paginación
   */
  async findAll(page = 1, limit = 20) {
    const userId = this.contextService.userId;
    const tenantId = this.contextService.tenantId;

    if (!userId || !tenantId) {
      throw new BadRequestException(
        'Contexto de usuario o empresa no disponible',
      );
    }

    const p = Math.max(1, page);
    const l = Math.max(1, Math.min(50, limit));
    const skip = (p - 1) * l;

    const [total, data] = await this.repository.findMany(
      {
        userId,
        tenantId,
      },
      skip,
      l,
    );

    return {
      data,
      meta: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
    };
  }

  /**
   * Marca una notificación específica como leída
   */
  async markAsRead(id: string): Promise<Notification> {
    const userId = this.contextService.userId;
    const tenantId = this.contextService.tenantId;

    if (!userId || !tenantId) {
      throw new BadRequestException(
        'Contexto de usuario o empresa no disponible',
      );
    }

    try {
      return await this.repository.markAsRead(id, userId, tenantId);
    } catch {
      throw new NotFoundException(`Notificación [${id}] no encontrada`);
    }
  }

  /**
   * Marca todas las notificaciones del usuario como leídas
   */
  async markAllAsRead(): Promise<{ success: boolean; count: number }> {
    const userId = this.contextService.userId;
    const tenantId = this.contextService.tenantId;

    if (!userId || !tenantId) {
      throw new BadRequestException(
        'Contexto de usuario o empresa no disponible',
      );
    }

    const result = await this.repository.markAllAsRead(userId, tenantId);
    return {
      success: true,
      count: result.count,
    };
  }
}
