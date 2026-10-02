import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service';
import { SseService } from '../sse/sse.service';
import { PqrsTicketAssignedEvent } from '../../administrative/pqrs/events/pqrs-ticket-assigned.event';
import { PqrsTicketStatusChangedEvent } from '../../administrative/pqrs/events/pqrs-ticket-status-changed.event';
import { PqrsTicketCreatedEvent } from '../../administrative/pqrs/events/pqrs-ticket-created.event';
import { PqrsTicketRepliedEvent } from '../../administrative/pqrs/events/pqrs-ticket-replied.event';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseService: SseService,
  ) {}

  /**
   * Escucha asignaciones de PQRS y genera una notificación interna al funcionario
   */
  @OnEvent('pqrs.ticket.assigned')
  async handleTicketAssigned(event: PqrsTicketAssignedEvent) {
    try {
      this.logger.log(
        `Ticket [${event.ticket.code}] asignado a usuario [${event.assignedToId}]`,
      );

      // 1. Guardar notificación en base de datos y despachar al usuario
      await this.notificationsService.createNotification({
        tenantId: event.ticket.tenantId,
        userId: event.assignedToId,
        title: 'Nueva PQRS Asignada',
        message: `Se te ha asignado el ticket ${event.ticket.code}: "${event.ticket.subject}"`,
        type: 'PQRS_ASSIGNED',
        link: `/administrative/pqrs/${event.ticket.id}`,
      });

      // 2. Notificar actualización general a la tabla/KPIs del tenant
      this.sseService.emitToTenant(
        event.ticket.tenantId,
        {
          type: 'PQRS_UPDATED',
          ticketId: event.ticket.id,
          code: event.ticket.code,
          triggeredById: event.assignedById,
        },
        event.ticket.clientId,
      );
    } catch (err) {
      this.logger.error('Error procesando evento pqrs.ticket.assigned', err);
    }
  }

  /**
   * Notifica cambios de estado en PQRS
   */
  @OnEvent('pqrs.ticket.status_changed')
  handleTicketStatusChanged(event: PqrsTicketStatusChangedEvent) {
    try {
      this.sseService.emitToTenant(
        event.ticket.tenantId,
        {
          type: 'PQRS_UPDATED',
          ticketId: event.ticket.id,
          code: event.ticket.code,
          status: event.ticket.status,
          triggeredById: event.triggeredById,
        },
        event.ticket.clientId,
      );
    } catch (err) {
      this.logger.error('Error procesando evento pqrs.ticket.status_changed', err);
    }
  }

  /**
   * Notifica radicación de nuevos tickets
   */
  @OnEvent('pqrs.ticket.created')
  handleTicketCreated(event: PqrsTicketCreatedEvent) {
    try {
      this.sseService.emitToTenant(
        event.ticket.tenantId,
        {
          type: 'PQRS_UPDATED',
          ticketId: event.ticket.id,
          code: event.ticket.code,
          status: event.ticket.status,
          triggeredById: event.triggeredById,
        },
        event.ticket.clientId,
      );
    } catch (err) {
      this.logger.error('Error procesando evento pqrs.ticket.created', err);
    }
  }

  /**
   * Notifica respuestas añadidas a tickets
   */
  @OnEvent('pqrs.ticket.replied')
  handleTicketReplied(event: PqrsTicketRepliedEvent) {
    try {
      this.sseService.emitToTenant(
        event.ticket.tenantId,
        {
          type: 'PQRS_MESSAGE_ADDED',
          ticketId: event.ticket.id,
          code: event.ticket.code,
          message: event.message,
          triggeredById: event.triggeredById || event.message.createdById,
        },
        event.ticket.clientId,
      );
    } catch (err) {
      this.logger.error('Error procesando evento pqrs.ticket.replied', err);
    }
  }

  /**
   * Notifica cambios de prioridad en PQRS
   */
  @OnEvent('pqrs.ticket.priority_changed')
  handleTicketPriorityChanged(event: {
    ticket: {
      id: string;
      code: string;
      priority: string;
      tenantId: string;
      clientId: string;
    };
    triggeredById?: string;
  }) {
    try {
      this.sseService.emitToTenant(
        event.ticket.tenantId,
        {
          type: 'PQRS_UPDATED',
          ticketId: event.ticket.id,
          code: event.ticket.code,
          priority: event.ticket.priority,
          triggeredById: event.triggeredById,
        },
        event.ticket.clientId,
      );
    } catch (err) {
      this.logger.error('Error procesando evento pqrs.ticket.priority_changed', err);
    }
  }
}

