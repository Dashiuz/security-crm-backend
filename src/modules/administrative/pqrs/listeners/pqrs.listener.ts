import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../../../common/mail/mail.service';
import { PqrsTicketCreatedEvent } from '../events/pqrs-ticket-created.event';
import { PqrsTicketStatusChangedEvent } from '../events/pqrs-ticket-status-changed.event';
import { PqrsTicketRepliedEvent } from '../events/pqrs-ticket-replied.event';

@Injectable()
export class PqrsListener {
  private readonly logger = new Logger(PqrsListener.name);

  constructor(private readonly mailService: MailService) {}

  @OnEvent('pqrs.ticket.created')
  async handleTicketCreated(event: PqrsTicketCreatedEvent) {
    this.logger.log(
      `Evento recibido [pqrs.ticket.created] para ticket ${event.ticket.code}`,
    );

    const contactEmail =
      event.ticket.client?.administratorEmail || event.ticket.client?.email;

    if (!contactEmail) {
      this.logger.warn(
        `Cliente ${event.ticket.client?.name || event.ticket.clientId} no tiene correo registrado para notificación.`,
      );
      return;
    }

    await this.mailService.sendPqrsUpdateNotification({
      clientName: event.ticket.client?.name || 'Administrador',
      contactEmail,
      ticketNumber: event.ticket.code,
      subject: event.ticket.subject,
      status: event.ticket.status,
      messagePreview: event.ticket.description.slice(0, 150) + '...',
    });
  }

  @OnEvent('pqrs.ticket.status_changed')
  async handleStatusChanged(event: PqrsTicketStatusChangedEvent) {
    this.logger.log(
      `Evento recibido [pqrs.ticket.status_changed] para ticket ${event.ticket.code}: ${event.previousStatus} -> ${event.ticket.status}`,
    );

    const contactEmail =
      event.ticket.client?.administratorEmail || event.ticket.client?.email;

    if (!contactEmail) return;

    await this.mailService.sendPqrsUpdateNotification({
      clientName: event.ticket.client?.name || 'Administrador',
      contactEmail,
      ticketNumber: event.ticket.code,
      subject: event.ticket.subject,
      status: event.ticket.status,
      messagePreview: event.reason
        ? `Estado actualizado a ${event.ticket.status}. Motivo: ${event.reason}`
        : `El estado de su solicitud ha cambiado de ${event.previousStatus} a ${event.ticket.status}.`,
    });
  }

  @OnEvent('pqrs.ticket.replied')
  async handleTicketReplied(event: PqrsTicketRepliedEvent) {
    this.logger.log(
      `Evento recibido [pqrs.ticket.replied] para ticket ${event.ticket.code}`,
    );

    // Si la respuesta proviene de la empresa de seguridad, se le notifica al Administrador del Conjunto
    if (!event.message.isFromClient) {
      const contactEmail =
        event.ticket.client?.administratorEmail || event.ticket.client?.email;

      if (!contactEmail) return;

      await this.mailService.sendPqrsUpdateNotification({
        clientName: event.ticket.client?.name || 'Administrador',
        contactEmail,
        ticketNumber: event.ticket.code,
        subject: event.ticket.subject,
        status: event.ticket.status,
        messagePreview: event.message.content.slice(0, 200),
      });
    }
  }
}
