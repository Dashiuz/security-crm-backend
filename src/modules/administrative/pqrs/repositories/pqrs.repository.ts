import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, PqrsStatus, PqrsPriority, PqrsTicket, PqrsMessage } from '@prisma/client';

@Injectable()
export class PqrsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cuenta tickets por filtro
   */
  async countTickets(where: Prisma.PqrsTicketWhereInput): Promise<number> {
    return this.prisma.pqrsTicket.count({ where });
  }

  /**
   * Busca un cliente activo para verificar la radicación de un ticket
   */
  async findClientForTicket(clientId: string, tenantId: string) {
    return this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        administratorEmail: true,
      },
    });
  }

  /**
   * Crea un nuevo ticket de PQRS
   */
  async createTicket(
    data: Prisma.PqrsTicketUncheckedCreateInput,
  ): Promise<PqrsTicket> {
    return this.prisma.pqrsTicket.create({
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            nit: true,
            email: true,
            administratorEmail: true,
          },
        },
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
      },
    });
  }

  /**
   * Consulta tickets paginados con sus relaciones y conteos
   */
  async findTicketsWithPagination(params: {
    where: Prisma.PqrsTicketWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.PqrsTicketOrderByWithRelationInput;
  }): Promise<[number, any[]]> {
    const { where, skip, take, orderBy = { createdAt: 'desc' } } = params;

    return Promise.all([
      this.prisma.pqrsTicket.count({ where }),
      this.prisma.pqrsTicket.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          client: { select: { id: true, name: true, nit: true } },
          assignedTo: { select: { id: true, fullName: true, document: true } },
          createdBy: { select: { id: true, fullName: true, document: true } },
          _count: {
            select: {
              messages: true,
              attachments: true,
            },
          },
        },
      }),
    ]);
  }

  /**
   * Consulta un ticket detallado por ID con su hilo de mensajes y adjuntos
   */
  async findTicketById(id: string, tenantId?: string): Promise<any> {
    return this.prisma.pqrsTicket.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            nit: true,
            email: true,
            administratorEmail: true,
            administratorPhone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            document: true,
            department: true,
            position: true,
          },
        },
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
                document: true,
                userType: true,
              },
            },
            attachments: true,
          },
        },
      },
    });
  }

  /**
   * Valida existencia y estado activo de un usuario para asignación
   */
  async findAssigneeUser(userId: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        isActive: true,
        isRetired: false,
      },
      select: {
        id: true,
        fullName: true,
        userType: true,
        department: true,
        position: true,
      },
    });
  }

  /**
   * Asigna un ticket y opcionalmente avanza su estado a ASSIGNED o ajusta prioridad
   */
  async assignTicket(
    id: string,
    assignedToId: string,
    nextStatus?: PqrsStatus,
    priority?: PqrsPriority,
  ): Promise<any> {
    return this.prisma.pqrsTicket.update({
      where: { id },
      data: {
        ...(assignedToId
          ? { assignedTo: { connect: { id: assignedToId } } }
          : { assignedTo: { disconnect: true } }),
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(priority ? { priority } : {}),
      },
      include: {
        client: {
          select: { name: true, email: true, administratorEmail: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, document: true },
        },
      },
    });
  }

  /**
   * Actualiza la prioridad de un ticket
   */
  async updateTicketPriority(id: string, priority: PqrsPriority): Promise<any> {
    return this.prisma.pqrsTicket.update({
      where: { id },
      data: { priority },
      include: {
        client: {
          select: { name: true, email: true, administratorEmail: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, document: true },
        },
      },
    });
  }

  /**
   * Actualiza el estado de un ticket
   */
  async updateTicketStatus(id: string, status: PqrsStatus): Promise<any> {
    return this.prisma.pqrsTicket.update({
      where: { id },
      data: { status },
      include: {
        client: {
          select: { name: true, email: true, administratorEmail: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, document: true },
        },
      },
    });
  }

  /**
   * Inserta un mensaje en el hilo del ticket
   */
  async createMessage(
    data: Prisma.PqrsMessageUncheckedCreateInput,
  ): Promise<PqrsMessage> {
    return this.prisma.pqrsMessage.create({
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true, userType: true },
        },
      },
    });
  }

  /**
   * Obtiene estadísticas agregadas de tickets para KPIs
   */
  async getStats(where: Prisma.PqrsTicketWhereInput): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  }> {
    const [total, pending, inProgress, resolved] = await Promise.all([
      this.prisma.pqrsTicket.count({ where }),
      this.prisma.pqrsTicket.count({
        where: {
          ...where,
          status: { in: [PqrsStatus.OPEN, PqrsStatus.ASSIGNED] },
        },
      }),
      this.prisma.pqrsTicket.count({
        where: {
          ...where,
          status: PqrsStatus.IN_PROGRESS,
        },
      }),
      this.prisma.pqrsTicket.count({
        where: {
          ...where,
          status: { in: [PqrsStatus.RESOLVED, PqrsStatus.CLOSED] },
        },
      }),
    ]);

    return { total, pending, inProgress, resolved };
  }
}

