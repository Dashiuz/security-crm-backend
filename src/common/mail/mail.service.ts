import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SendMailOptions, PqrsNotificationPayload } from './mail.interfaces';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resendClient: Resend | null = null;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('MAIL_API_KEY') ||
      process.env.MAIL_API_KEY;
    const fromEmail =
      this.configService.get<string>('MAIL_FROM_ADDRESS') ||
      process.env.MAIL_FROM_ADDRESS ||
      'onboarding@resend.dev';
    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') ||
      process.env.MAIL_FROM_NAME ||
      'Noxia Seguridad';

    this.fromAddress = `${fromName} <${fromEmail}>`;

    if (apiKey && apiKey !== 're_dev_placeholder_key') {
      this.resendClient = new Resend(apiKey);
    } else {
      this.logger.warn(
        'MAIL_API_KEY not configured or using placeholder. Outgoing emails will be logged only.',
      );
    }
  }

  /**
   * Método genérico desacoplado.
   * Si mañana cambias Resend por SendGrid o Nodemailer, solo cambias el interior de este método.
   */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    try {
      if (!this.resendClient) {
        this.logger.log(
          `[MailService Mock/Dev] Sending mail to: ${JSON.stringify(options.to)}, Subject: "${options.subject}"`,
        );
        return true;
      }

      const { error } = await this.resendClient.emails.send({
        from: this.fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error(
          `Error enviando correo a ${JSON.stringify(options.to)}: ${error.message}`,
        );
        return false;
      }

      return true;
    } catch (err: unknown) {
      this.logger.error('Fallo crítico en el proveedor de correo', err);
      return false;
    }
  }

  /**
   * Método de dominio específico para notificar actualizaciones de PQRS al Cliente (Conjunto)
   */
  async sendPqrsUpdateNotification(
    payload: PqrsNotificationPayload,
  ): Promise<boolean> {
    if (!payload.contactEmail) {
      this.logger.warn(
        `No contact email provided for client ${payload.clientName}, skipping email notification.`,
      );
      return false;
    }

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #1976d2;">Actualización en su solicitud PQRS - ${payload.ticketNumber}</h2>
        <p>Hola <strong>${payload.clientName}</strong>,</p>
        <p>Se ha registrado una actualización en el ticket <strong>${payload.subject}</strong>:</p>
        <p><strong>Estado actual:</strong> <span style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${payload.status}</span></p>
        <blockquote style="border-left: 4px solid #1976d2; padding-left: 12px; margin: 16px 0; color: #555;">
          ${payload.messagePreview}
        </blockquote>
        <p style="font-size: 12px; color: #888; margin-top: 24px;">
          Para responder o ver las evidencias adjuntas, ingresa al portal de Noxia.
        </p>
      </div>
    `;

    return this.sendMail({
      to: payload.contactEmail,
      subject: `[${payload.ticketNumber}] Actualización de PQRS: ${payload.subject}`,
      html: htmlTemplate,
    });
  }
}
