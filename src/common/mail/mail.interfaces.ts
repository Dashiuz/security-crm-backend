export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
}

export interface PqrsNotificationPayload {
  clientName: string;
  contactEmail: string;
  ticketNumber: string;
  subject: string;
  status: string;
  messagePreview: string;
}
