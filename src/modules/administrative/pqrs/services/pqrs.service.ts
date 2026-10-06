import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RequestContextService } from '../../../../common/context/request-context.service';
import { S3Service } from '../../../storage/services/s3.service';
import { PqrsPriority, PqrsStatus, PqrsType } from '@prisma/client';
import { CreatePqrsTicketDto } from '../dtos/create-pqrs-ticket.dto';
import { UpdatePqrsStatusDto } from '../dtos/update-pqrs-status.dto';
import { UpdatePqrsPriorityDto } from '../dtos/update-pqrs-priority.dto';
import { AssignPqrsTicketDto } from '../dtos/assign-pqrs-ticket.dto';
import { CreatePqrsMessageDto } from '../dtos/create-pqrs-message.dto';
import { QueryPqrsTicketDto } from '../dtos/query-pqrs-ticket.dto';
import { PqrsTicketCreatedEvent } from '../events/pqrs-ticket-created.event';
import { PqrsTicketStatusChangedEvent } from '../events/pqrs-ticket-status-changed.event';
import { PqrsTicketRepliedEvent } from '../events/pqrs-ticket-replied.event';
import { PqrsTicketAssignedEvent } from '../events/pqrs-ticket-assigned.event';
import { PqrsRepository } from '../repositories/pqrs.repository';

const ALLOWED_TRANSITIONS: Record<PqrsStatus, PqrsStatus[]> = {
  [PqrsStatus.OPEN]: [PqrsStatus.ASSIGNED, PqrsStatus.REJECTED],
  [PqrsStatus.ASSIGNED]: [PqrsStatus.IN_PROGRESS, PqrsStatus.REJECTED],
  [PqrsStatus.IN_PROGRESS]: [PqrsStatus.RESOLVED],
  [PqrsStatus.RESOLVED]: [PqrsStatus.CLOSED, PqrsStatus.IN_PROGRESS],
  [PqrsStatus.CLOSED]: [],
  [PqrsStatus.REJECTED]: [],
};

@Injectable()
export class PqrsService {
  private readonly logger = new Logger(PqrsService.name);

  constructor(
    private readonly repository: PqrsRepository,
    private readonly contextService: RequestContextService,
    private readonly eventEmitter: EventEmitter2,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Genera un código consecutivo amigable para el ticket
   * Ej: PQRS-2026-0001
   */
  private async generateTicketCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.countTickets({ tenantId });
    return `PQRS-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Radica una nueva solicitud PQRS
   */
  async create(dto: CreatePqrsTicketDto) {
    const tenantId = this.contextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto de empresa (tenant) no identificado');
    }

    const contextClientId = this.contextService.clientId;
    const targetClientId = contextClientId || dto.clientId;

    if (!targetClientId) {
      throw new BadRequestException(
        'El cliente/conjunto residencial es obligatorio para radicar la PQRS',
      );
    }

    // Validar que el cliente exista y pertenezca al tenant
    const client = await this.repository.findClientForTicket(targetClientId, tenantId);

    if (!client) {
      throw new NotFoundException(
        'El cliente o conjunto residencial especificado no existe o está inactivo',
      );
    }

    const code = await this.generateTicketCode(tenantId);

    const ticket = await this.repository.createTicket({
      tenantId,
      clientId: targetClientId,
      createdById: this.contextService.userId || undefined,
      code,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      type: dto.type,
      priority: contextClientId
        ? PqrsPriority.MEDIUM
        : dto.priority || PqrsPriority.MEDIUM,
      status: PqrsStatus.OPEN,
    });

    // Emitir evento de creación (desacoplado)
    this.eventEmitter.emit(
      'pqrs.ticket.created',
      new PqrsTicketCreatedEvent(
        {
          id: ticket.id,
          code: ticket.code,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          tenantId,
          clientId: targetClientId,
          client: (ticket as any).client,
        },
        this.contextService.userId,
      ),
    );

    return ticket;
  }

  /**
   * Consulta el listado de tickets con filtros y control de acceso granular
   */
  async findAll(query: QueryPqrsTicketDto, userPermissions: string[]) {
    const tenantId = this.contextService.tenantId;
    const contextClientId = this.contextService.clientId;
    const userId = this.contextService.userId;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    // Regla de Visibilidad:
    if (contextClientId) {
      // 1. Administrador del Conjunto (Client): solo ve los suyos
      where.clientId = contextClientId;
    } else {
      // 2. Usuario de la Empresa de Seguridad (Tenant):
      const hasManage =
        userPermissions.includes('pqrs:manage') ||
        userPermissions.includes('godlike:manage') ||
        this.contextService.isGodlike;

      if (!hasManage) {
        // Operador/Empleado sin 'manage': solo ve los tickets asignados a él
        where.assignedToId = userId;
      } else if (query.clientId) {
        // Administrador de tenant filtrando por cliente específico
        where.clientId = query.clientId;
      }
    }

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;

    if (query.search) {
      const searchTerm = query.search.trim();
      where.OR = [
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { subject: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await this.repository.findTicketsWithPagination({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene el detalle de un ticket con su hilo de mensajes y evidencias adjuntas
   */
  async findOne(id: string, userPermissions: string[]) {
    const tenantId = this.contextService.tenantId;
    const contextClientId = this.contextService.clientId;
    const userId = this.contextService.userId;

    const ticket = await this.repository.findTicketById(id, tenantId);

    if (!ticket) {
      throw new NotFoundException(`Ticket PQRS [${id}] no encontrado`);
    }

    // Validación de acceso estricto
    if (contextClientId && ticket.clientId !== contextClientId) {
      throw new ForbiddenException('No tiene permisos para consultar este ticket');
    }

    const hasManage =
      userPermissions.includes('pqrs:manage') ||
      userPermissions.includes('godlike:manage') ||
      this.contextService.isGodlike;

    if (!contextClientId && !hasManage && ticket.assignedToId !== userId) {
      throw new ForbiddenException(
        'Solo tiene acceso a tickets que le hayan sido asignados directamente',
      );
    }

    // Enriquecer adjuntos con URLs prefirmadas de S3
    const enrichedAttachments = await Promise.all(
      ticket.attachments.map(async (att: any) => ({
        ...att,
        presignedUrl: await this.s3Service.getPresignedUrl(att.s3Key),
      })),
    );

    const enrichedMessages = await Promise.all(
      ticket.messages.map(async (msg: any) => {
        const msgAttachments = await Promise.all(
          msg.attachments.map(async (att: any) => ({
            ...att,
            presignedUrl: await this.s3Service.getPresignedUrl(att.s3Key),
          })),
        );
        return {
          ...msg,
          attachments: msgAttachments,
        };
      }),
    );

    return {
      ...ticket,
      attachments: enrichedAttachments,
      messages: enrichedMessages,
    };
  }

  /**
   * Asigna un ticket de PQRS a un usuario/operador del tenant
   */
  async assign(id: string, dto: AssignPqrsTicketDto) {
    const tenantId = this.contextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Contexto de empresa (tenant) no identificado');
    }

    const ticket = await this.repository.findTicketById(id, tenantId);

    if (!ticket) {
      throw new NotFoundException(`Ticket PQRS [${id}] no encontrado`);
    }

    // Bloquear reasignación en tickets cerrados o rechazados
    if (ticket.status === PqrsStatus.CLOSED || ticket.status === PqrsStatus.REJECTED) {
      throw new BadRequestException(
        `No es posible reasignar un ticket en estado terminal (${ticket.status})`,
      );
    }

    // Validar usuario a asignar
    const targetUser = await this.repository.findAssigneeUser(dto.assignedToId, tenantId);

    if (!targetUser) {
      throw new BadRequestException(
        'El usuario a asignar no existe, no pertenece a la empresa o está inactivo',
      );
    }

    // Si el ticket está en estado OPEN, al asignarse avanza automáticamente a ASSIGNED
    const shouldTransitionToAssigned = ticket.status === PqrsStatus.OPEN;
    const newStatus = shouldTransitionToAssigned
      ? PqrsStatus.ASSIGNED
      : ticket.status;

    const updated = await this.repository.assignTicket(
      id,
      dto.assignedToId,
      shouldTransitionToAssigned ? newStatus : undefined,
      dto.priority,
    );

    // Si la prioridad cambió en la asignación, emitir evento de actualización
    if (dto.priority && dto.priority !== ticket.priority) {
      this.eventEmitter.emit('pqrs.ticket.priority_changed', {
        ticket: {
          id: updated.id,
          code: updated.code,
          priority: updated.priority,
          tenantId: updated.tenantId,
          clientId: updated.clientId,
        },
        triggeredById: this.contextService.userId,
      });
    }

    if (shouldTransitionToAssigned) {
      this.eventEmitter.emit(
        'pqrs.ticket.status_changed',
        new PqrsTicketStatusChangedEvent(
          {
            id: updated.id,
            code: updated.code,
            subject: updated.subject,
            status: updated.status,
            tenantId: updated.tenantId,
            clientId: updated.clientId,
            client: updated.client,
          },
          PqrsStatus.OPEN,
          `Ticket asignado al funcionario: ${targetUser.fullName}`,
          this.contextService.userId,
        ),
      );
    }

    // Emitir evento de asignación de ticket para notificaciones en tiempo real
    this.eventEmitter.emit(
      'pqrs.ticket.assigned',
      new PqrsTicketAssignedEvent(
        {
          id: updated.id,
          code: updated.code,
          subject: updated.subject,
          status: updated.status,
          tenantId: updated.tenantId,
          clientId: updated.clientId,
          client: updated.client,
        },
        dto.assignedToId,
        targetUser.fullName,
        this.contextService.userId,
      ),
    );

    return updated;
  }

  /**
   * Actualiza el estado de un ticket según la máquina secuencial de estados
   */
  async updateStatus(
    id: string,
    dto: UpdatePqrsStatusDto,
    userPermissions: string[],
  ) {
    const tenantId = this.contextService.tenantId;
    const userId = this.contextService.userId;

    const ticket = await this.repository.findTicketById(id, tenantId);

    if (!ticket) {
      throw new NotFoundException(`Ticket PQRS [${id}] no encontrado`);
    }

    const hasManage =
      userPermissions.includes('pqrs:manage') ||
      userPermissions.includes('godlike:manage') ||
      this.contextService.isGodlike;

    // Solo el usuario asignado o un usuario con permisos de gestión puede cambiar el estatus
    if (!hasManage && ticket.assignedToId !== userId) {
      throw new ForbiddenException(
        'Solo el usuario asignado a este ticket o un administrador puede modificar su estado',
      );
    }

    // Validación de la máquina secuencial de estados
    const currentStatus = ticket.status;
    const nextStatus = dto.status;

    if (currentStatus === nextStatus) {
      return ticket;
    }

    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        `Transición de estado no permitida de [${currentStatus}] a [${nextStatus}]. Las opciones válidas son: [${
          allowedNextStatuses.join(', ') || 'Ninguna (Estado Terminal)'
        }]`,
      );
    }

    const updated = await this.repository.updateTicketStatus(id, nextStatus);

    // Emitir evento de cambio de estado
    this.eventEmitter.emit(
      'pqrs.ticket.status_changed',
      new PqrsTicketStatusChangedEvent(
        {
          id: updated.id,
          code: updated.code,
          subject: updated.subject,
          status: updated.status,
          tenantId: updated.tenantId,
          clientId: updated.clientId,
          client: updated.client,
        },
        currentStatus,
        dto.reason,
        userId,
      ),
    );

    return updated;
  }

  /**
   * Actualiza la prioridad de un ticket por parte de un operador/administrador
   */
  async updatePriority(
    id: string,
    dto: UpdatePqrsPriorityDto,
    userPermissions: string[],
  ) {
    const tenantId = this.contextService.tenantId;
    const contextClientId = this.contextService.clientId;
    const userId = this.contextService.userId;

    if (contextClientId) {
      throw new ForbiddenException(
        'Los administradores del conjunto residencial no pueden modificar la prioridad del ticket',
      );
    }

    const ticket = await this.repository.findTicketById(id, tenantId);

    if (!ticket) {
      throw new NotFoundException(`Ticket PQRS [${id}] no encontrado`);
    }

    const hasManage =
      userPermissions.includes('pqrs:manage') ||
      userPermissions.includes('godlike:manage') ||
      this.contextService.isGodlike;
    const canUpdate = userPermissions.includes('pqrs:update');

    if (!hasManage && !canUpdate) {
      throw new ForbiddenException(
        'No tienes permisos para modificar la prioridad de esta solicitud',
      );
    }

    if (ticket.status === PqrsStatus.CLOSED || ticket.status === PqrsStatus.REJECTED) {
      throw new BadRequestException(
        `No es posible modificar la prioridad de un ticket en estado [${ticket.status}]`,
      );
    }

    if (ticket.priority === dto.priority) {
      return ticket;
    }

    const updated = await this.repository.updateTicketPriority(id, dto.priority);

    // Emitir evento de cambio de prioridad para sincronización en tiempo real vía SSE
    this.eventEmitter.emit('pqrs.ticket.priority_changed', {
      ticket: {
        id: updated.id,
        code: updated.code,
        priority: updated.priority,
        tenantId: updated.tenantId,
        clientId: updated.clientId,
      },
      triggeredById: userId,
    });

    return updated;
  }

  /**
   * Agrega un mensaje o respuesta al hilo de un ticket existente
   */
  async addMessage(id: string, dto: CreatePqrsMessageDto, userPermissions: string[]) {
    const tenantId = this.contextService.tenantId;
    const contextClientId = this.contextService.clientId;
    const userId = this.contextService.userId;

    const ticket = await this.repository.findTicketById(id, tenantId);

    if (!ticket) {
      throw new NotFoundException(`Ticket PQRS [${id}] no encontrado`);
    }

    // Validar acceso
    if (contextClientId && ticket.clientId !== contextClientId) {
      throw new ForbiddenException(
        'No tiene permisos para responder en este ticket',
      );
    }

    const hasManage =
      userPermissions.includes('pqrs:manage') ||
      userPermissions.includes('godlike:manage') ||
      this.contextService.isGodlike;

    if (!contextClientId && !hasManage && ticket.assignedToId !== userId) {
      throw new ForbiddenException(
        'Solo el usuario asignado a este ticket o un administrador puede responder en este hilo',
      );
    }

    if (ticket.status === PqrsStatus.CLOSED || ticket.status === PqrsStatus.REJECTED) {
      throw new BadRequestException(
        `No es posible agregar mensajes a un ticket en estado [${ticket.status}]`,
      );
    }

    const isFromClient = Boolean(contextClientId);

    const message = await this.repository.createMessage({
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      clientId: ticket.clientId,
      content: dto.content.trim(),
      isFromClient,
      createdById: userId || undefined,
    });

    // Emitir evento para notificación
    this.eventEmitter.emit(
      'pqrs.ticket.replied',
      new PqrsTicketRepliedEvent(
        {
          id: ticket.id,
          code: ticket.code,
          subject: ticket.subject,
          status: ticket.status,
          tenantId: ticket.tenantId,
          clientId: ticket.clientId,
          client: ticket.client,
        },
        {
          id: message.id,
          content: message.content,
          isFromClient: message.isFromClient,
          createdAt: message.createdAt,
          createdBy: (message as any).createdBy,
          createdById: (message as any).createdById || userId,
          attachments: (message as any).attachments || [],
        },
        userId,
      ),
    );

    return message;
  }

  /**
   * Obtiene métricas y KPIs de PQRS con aislamiento multitenant y por cliente
   */
  async getStats(queryClientId?: string, userPermissions: string[] = []) {
    const tenantId = this.contextService.tenantId;
    const contextClientId = this.contextService.clientId;
    const userId = this.contextService.userId;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    if (contextClientId) {
      // 1. Administrador del Conjunto (Client): solo sus tickets
      where.clientId = contextClientId;
    } else {
      // 2. Empresa de Seguridad (Tenant):
      const hasManage =
        userPermissions.includes('pqrs:manage') ||
        userPermissions.includes('godlike:manage') ||
        this.contextService.isGodlike;

      if (!hasManage) {
        // Operador/Funcionario asignado: solo los asignados a él
        where.assignedToId = userId;
      } else if (queryClientId) {
        where.clientId = queryClientId;
      }
    }

    return this.repository.getStats(where);
  }
}
