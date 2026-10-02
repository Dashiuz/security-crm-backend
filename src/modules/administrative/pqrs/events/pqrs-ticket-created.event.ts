export class PqrsTicketCreatedEvent {
  constructor(
    public readonly ticket: {
      id: string;
      code: string;
      subject: string;
      description: string;
      status: string;
      tenantId: string;
      clientId: string;
      client?: {
        name: string;
        email?: string | null;
        administratorEmail?: string | null;
      };
    },
    public readonly triggeredById?: string,
  ) {}
}
