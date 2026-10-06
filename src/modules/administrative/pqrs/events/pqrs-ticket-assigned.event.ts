export class PqrsTicketAssignedEvent {
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
      };
    },
    public readonly assignedToId: string,
    public readonly assigneeName: string,
    public readonly assignedById?: string,
  ) {}
}
