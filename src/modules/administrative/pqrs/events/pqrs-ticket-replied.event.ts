export class PqrsTicketRepliedEvent {
  constructor(
    public readonly ticket: {
      id: string;
      code: string;
      subject: string;
      status: string;
      tenantId: string;
      clientId: string;
      client?: {
        name: string;
        email?: string | null;
        administratorEmail?: string | null;
      };
    },
    public readonly message: {
      id: string;
      content: string;
      isFromClient: boolean;
      createdAt: Date;
      createdBy?: any;
      createdById?: string | null;
      attachments?: any[];
    },
    public readonly triggeredById?: string,
  ) {}
}
