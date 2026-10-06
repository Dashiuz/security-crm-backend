import { Test, TestingModule } from '@nestjs/testing';
import { PqrsService } from './pqrs.service';
import { PqrsRepository } from '../repositories/pqrs.repository';
import { RequestContextService } from '../../../../common/context/request-context.service';
import { S3Service } from '../../../storage/services/s3.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PqrsPriority, PqrsStatus, PqrsType } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('PqrsService', () => {
  let service: PqrsService;
  let repository: any;
  let contextService: any;
  let eventEmitter: any;
  let s3Service: any;

  const mockTenantId = 'tenant-123';
  const mockClientId = 'client-456';
  const mockUserId = 'user-789';

  beforeEach(async () => {
    repository = {
      countTickets: jest.fn(),
      findClientForTicket: jest.fn(),
      createTicket: jest.fn(),
      findTicketsWithPagination: jest.fn(),
      findTicketById: jest.fn(),
      findAssigneeUser: jest.fn(),
      assignTicket: jest.fn(),
      updateTicketStatus: jest.fn(),
      updateTicketPriority: jest.fn(),
      createMessage: jest.fn(),
    };

    contextService = {
      tenantId: mockTenantId,
      userId: mockUserId,
      clientId: null,
      isGodlike: false,
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    s3Service = {
      getPresignedUrl: jest
        .fn()
        .mockResolvedValue('https://s3.example.com/file.jpg'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PqrsService,
        { provide: PqrsRepository, useValue: repository },
        { provide: RequestContextService, useValue: contextService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<PqrsService>(PqrsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe radicar un ticket exitosamente y emitir evento', async () => {
      repository.findClientForTicket.mockResolvedValue({
        id: mockClientId,
        name: 'Conjunto El Bosque',
        email: 'admin@elbosque.com',
      });
      repository.countTickets.mockResolvedValue(0);
      repository.createTicket.mockResolvedValue({
        id: 'ticket-1',
        code: 'PQRS-2026-0001',
        subject: 'Ruido excesivo',
        description: 'En horas de la noche',
        type: PqrsType.QUEJA,
        priority: PqrsPriority.HIGH,
        status: PqrsStatus.OPEN,
        client: { name: 'Conjunto El Bosque' },
      });

      const result = await service.create({
        subject: 'Ruido excesivo',
        description: 'En horas de la noche',
        type: PqrsType.QUEJA,
        priority: PqrsPriority.HIGH,
        clientId: mockClientId,
      });

      expect(result.code).toBe('PQRS-2026-0001');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pqrs.ticket.created',
        expect.any(Object),
      );
    });

    it('debe lanzar NotFoundException si el cliente no existe o está inactivo', async () => {
      repository.findClientForTicket.mockResolvedValue(null);

      await expect(
        service.create({
          subject: 'Test',
          description: 'Desc',
          type: PqrsType.PETICION,
          clientId: 'non-existing',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe forzar prioridad MEDIA si el usuario es del conjunto residencial (residence manager)', async () => {
      contextService.clientId = mockClientId;
      repository.findClientForTicket.mockResolvedValue({
        id: mockClientId,
        name: 'Conjunto El Bosque',
        email: 'admin@elbosque.com',
      });
      repository.countTickets.mockResolvedValue(0);
      repository.createTicket.mockImplementation(async (data: any) => ({
        id: 'ticket-1',
        ...data,
        client: { name: 'Conjunto El Bosque' },
      }));

      const result = await service.create({
        subject: 'Emergencia',
        description: 'Detalle',
        type: PqrsType.PETICION,
        priority: PqrsPriority.CRITICAL,
      });

      expect(repository.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: PqrsPriority.MEDIUM,
        }),
      );
      expect(result.priority).toBe(PqrsPriority.MEDIUM);
    });
  });

  describe('findAll', () => {
    it('debe filtrar por clientId si el usuario es del conjunto residencial', async () => {
      contextService.clientId = mockClientId;
      repository.findTicketsWithPagination.mockResolvedValue([
        1,
        [{ id: 'ticket-1' }],
      ]);

      const result = await service.findAll({}, []);

      expect(repository.findTicketsWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: mockClientId,
          }),
        }),
      );
      expect(result.meta.total).toBe(1);
    });

    it('debe filtrar por assignedToId si el operador de vigilancia no tiene pqrs:manage', async () => {
      repository.findTicketsWithPagination.mockResolvedValue([
        2,
        [{ id: 'ticket-1' }, { id: 'ticket-2' }],
      ]);

      await service.findAll({}, ['pqrs:read']);

      expect(repository.findTicketsWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: mockUserId,
          }),
        }),
      );
    });

    it('debe permitir ver todos los tickets si tiene pqrs:manage', async () => {
      repository.findTicketsWithPagination.mockResolvedValue([5, []]);

      await service.findAll({}, ['pqrs:read', 'pqrs:manage']);

      expect(repository.findTicketsWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            assignedToId: mockUserId,
          }),
        }),
      );
    });
  });

  describe('assign', () => {
    it('debe asignar ticket y avanzar automáticamente de OPEN a ASSIGNED', async () => {
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        code: 'PQRS-2026-0001',
        status: PqrsStatus.OPEN,
        client: { name: 'Conjunto' },
      });
      repository.findAssigneeUser.mockResolvedValue({
        id: 'operator-1',
        fullName: 'Carlos Guardia',
      });
      repository.assignTicket.mockResolvedValue({
        id: 'ticket-1',
        code: 'PQRS-2026-0001',
        status: PqrsStatus.ASSIGNED,
        assignedToId: 'operator-1',
        client: { name: 'Conjunto' },
      });

      const result = await service.assign('ticket-1', {
        assignedToId: 'operator-1',
      });

      expect(result.status).toBe(PqrsStatus.ASSIGNED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pqrs.ticket.status_changed',
        expect.any(Object),
      );
    });

    it('debe lanzar BadRequestException si el usuario a asignar no existe', async () => {
      repository.findTicketById.mockResolvedValue({ id: 'ticket-1' });
      repository.findAssigneeUser.mockResolvedValue(null);

      await expect(
        service.assign('ticket-1', { assignedToId: 'invalid-user' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si se intenta reasignar un ticket cerrado o rechazado', async () => {
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-closed',
        status: PqrsStatus.CLOSED,
      });

      await expect(
        service.assign('ticket-closed', { assignedToId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus (Máquina Secuencial de Estados)', () => {
    it('debe permitir transiciones válidas (OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)', async () => {
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        status: PqrsStatus.IN_PROGRESS,
        assignedToId: mockUserId,
        client: { name: 'Conjunto' },
      });
      repository.updateTicketStatus.mockResolvedValue({
        id: 'ticket-1',
        status: PqrsStatus.RESOLVED,
        client: { name: 'Conjunto' },
      });

      const result = await service.updateStatus(
        'ticket-1',
        { status: PqrsStatus.RESOLVED },
        ['pqrs:update'],
      );

      expect(result.status).toBe(PqrsStatus.RESOLVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pqrs.ticket.status_changed',
        expect.any(Object),
      );
    });

    it('debe rechazar transiciones que no cumplan la secuencia (ej: OPEN a RESOLVED directamente)', async () => {
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        status: PqrsStatus.OPEN,
        assignedToId: mockUserId,
        client: { name: 'Conjunto' },
      });

      await expect(
        service.updateStatus(
          'ticket-1',
          { status: PqrsStatus.RESOLVED },
          ['pqrs:update'],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe prohibir a un usuario no asignado y sin permiso manage cambiar el estatus', async () => {
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        status: PqrsStatus.OPEN,
        assignedToId: 'other-user',
        client: { name: 'Conjunto' },
      });

      await expect(
        service.updateStatus(
          'ticket-1',
          { status: PqrsStatus.ASSIGNED },
          ['pqrs:update'],
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMessage', () => {
    it('debe agregar respuesta al ticket y emitir evento pqrs.ticket.replied', async () => {
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        code: 'PQRS-2026-0001',
        status: PqrsStatus.IN_PROGRESS,
        assignedToId: mockUserId,
        clientId: mockClientId,
        client: { name: 'Conjunto' },
      });
      repository.createMessage.mockResolvedValue({
        id: 'msg-1',
        content: 'Respuesta en curso',
        isFromClient: false,
        createdAt: new Date(),
      });

      const result = await service.addMessage(
        'ticket-1',
        { content: 'Respuesta en curso' },
        ['pqrs:update'],
      );

      expect(result.content).toBe('Respuesta en curso');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pqrs.ticket.replied',
        expect.any(Object),
      );
    });

    it('debe bloquear mensajes si el ticket se encuentra en estado terminal CLOSED', async () => {
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        status: PqrsStatus.CLOSED,
        assignedToId: mockUserId,
        client: { name: 'Conjunto' },
      });

      await expect(
        service.addMessage(
          'ticket-1',
          { content: 'Intento en cerrado' },
          ['pqrs:update'],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('debe obtener estadísticas filtrando por contextClientId si el usuario es administrador del conjunto', async () => {
      contextService.clientId = 'client-residence-1';
      repository.getStats = jest.fn().mockResolvedValue({
        total: 10,
        pending: 3,
        inProgress: 2,
        resolved: 5,
      });

      const stats = await service.getStats(undefined, ['pqrs:read']);

      expect(stats.total).toBe(10);
      expect(repository.getStats).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        clientId: 'client-residence-1',
      });
    });

    it('debe obtener estadísticas para administrador de tenant pudiendo filtrar por queryClientId', async () => {
      contextService.clientId = null;
      repository.getStats = jest.fn().mockResolvedValue({
        total: 25,
        pending: 8,
        inProgress: 7,
        resolved: 10,
      });

      const stats = await service.getStats('custom-client-id', ['pqrs:manage']);

      expect(stats.total).toBe(25);
      expect(repository.getStats).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        clientId: 'custom-client-id',
      });
    });
  });

  describe('updatePriority', () => {
    it('debe actualizar la prioridad exitosamente si el usuario es operador', async () => {
      contextService.clientId = null;
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        priority: PqrsPriority.MEDIUM,
        status: PqrsStatus.OPEN,
        tenantId: mockTenantId,
        clientId: mockClientId,
      });
      repository.updateTicketPriority.mockResolvedValue({
        id: 'ticket-1',
        code: 'PQRS-2026-0001',
        priority: PqrsPriority.HIGH,
        tenantId: mockTenantId,
        clientId: mockClientId,
      });

      const result = await service.updatePriority(
        'ticket-1',
        { priority: PqrsPriority.HIGH },
        ['pqrs:update'],
      );

      expect(result.priority).toBe(PqrsPriority.HIGH);
      expect(repository.updateTicketPriority).toHaveBeenCalledWith(
        'ticket-1',
        PqrsPriority.HIGH,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pqrs.ticket.priority_changed',
        expect.any(Object),
      );
    });

    it('debe prohibir a un usuario de conjunto residencial actualizar la prioridad', async () => {
      contextService.clientId = mockClientId;

      await expect(
        service.updatePriority(
          'ticket-1',
          { priority: PqrsPriority.HIGH },
          ['pqrs:update'],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe prohibir actualizar la prioridad si el ticket está en estado terminal', async () => {
      contextService.clientId = null;
      repository.findTicketById.mockResolvedValue({
        id: 'ticket-1',
        priority: PqrsPriority.MEDIUM,
        status: PqrsStatus.CLOSED,
        tenantId: mockTenantId,
        clientId: mockClientId,
      });

      await expect(
        service.updatePriority(
          'ticket-1',
          { priority: PqrsPriority.HIGH },
          ['pqrs:update'],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
