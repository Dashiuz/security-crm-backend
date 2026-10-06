export class PqrsTicketStatusChangedEvent {
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
    public readonly previousStatus: string,
    public readonly reason?: string,
    public readonly triggeredById?: string,
  ) {}
}
