export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface PqrsNotificationPayload {
  clientName: string;
  contactEmail: string;
  ticketNumber: string;
  subject: string;
  status: string;
  messagePreview: string;
}
