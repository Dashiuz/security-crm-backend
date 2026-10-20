import { Test, TestingModule } from '@nestjs/testing';
import { MinutaGeneralService } from './minuta-general.service';
import { MinutaRepositoryService } from '../../../../common/repository/minuta/minuta/minuta.repository.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { MailService } from '../../../../common/mail/mail.service';

describe('MinutaGeneralService', () => {
  let service: MinutaGeneralService;
  let repository: any;
  let prisma: any;
  let notificationsService: any;
  let mailService: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };

    prisma = {
      client: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      employee: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      tenantProfile: {
        findUnique: jest.fn(),
      },
      userClientAccess: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    mailService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinutaGeneralService,
        { provide: MinutaRepositoryService, useValue: repository },
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<MinutaGeneralService>(MinutaGeneralService);
  });

  describe('findAll', () => {
    it('debe retornar lista completa envuelta en envelope cuando no se envía paginación', async () => {
      const mockRows = [{ id: 'minuta-1' }, { id: 'minuta-2' }];
      repository.findMany.mockResolvedValue(mockRows);

      const result = await service.findAll({});

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
        }),
        expect.objectContaining({
          cursor: undefined,
          take: undefined,
        }),
      );
      expect(result.data).toEqual(mockRows);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('debe aplicar paginación por cursor y retornar nextCursor cuando data.length === take', async () => {
      const mockRows = [{ id: 'minuta-1' }, { id: 'minuta-2' }];
      repository.findMany.mockResolvedValue(mockRows);

      const result = await service.findAll({
        cursor: 'minuta-prev',
        take: 2,
      });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
        }),
        {
          cursor: 'minuta-prev',
          take: 2,
          skip: 1,
        },
      );
      expect(result.data).toEqual(mockRows);
      expect(result.meta.nextCursor).toBe('minuta-2');
    });

    it('debe retornar nextCursor null cuando hay menos registros que take', async () => {
      const mockRows = [{ id: 'minuta-1' }];
      repository.findMany.mockResolvedValue(mockRows);

      const result = await service.findAll({
        take: 5,
      });

      expect(result.data).toEqual(mockRows);
      expect(result.meta.nextCursor).toBeNull();
    });
  });

  describe('Alert Escalation (SPEC-OPE-010)', () => {
    const baseDto: any = {
      date: '2026-10-16',
      time: '10:00:00',
      occurredAt: '2026-10-16T10:00:00Z',
      annotation: 'Ronda perimetral de rutina sin contratiempos.',
      clientId: 'client-1',
    };

    it('should create minuta with priority <= 3 without triggering escalation notifications', async () => {
      repository.create.mockResolvedValue({
        id: 'minuta-ord-1',
        ...baseDto,
        priority: 2,
      });

      const result = await service.create(
        { ...baseDto, priority: 2 },
        'user-guard',
        'tenant-1',
      );

      expect(result.id).toBe('minuta-ord-1');
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('should trigger SSE notification to coordinator and supervisors when priority is 4 (Alta)', async () => {
      const createdRecord = {
        id: 'minuta-high-1',
        ...baseDto,
        annotation: 'Intento de ingreso no autorizado por sector oriental.',
        priority: 4,
        clientId: 'client-1',
      };
      repository.create.mockResolvedValue(createdRecord);

      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        name: 'Condominio Campestre Los Álamos',
      });

      prisma.userClientAccess.findMany.mockResolvedValue([
        {
          userId: 'coord-user-1',
          roleName: 'COORDINADOR',
          user: {
            id: 'coord-user-1',
            document: '1001',
            fullName: 'Carlos Coordinador',
          },
        },
        {
          userId: 'sup-user-2',
          roleName: 'SUPERVISOR',
          user: {
            id: 'sup-user-2',
            document: '1002',
            fullName: 'Diana Supervisora',
          },
        },
      ]);

      prisma.employee.findMany.mockResolvedValue([
        { document: '1001', email: 'carlos@empresa.com' },
        { document: '1002', email: 'diana@empresa.com' },
      ]);

      const result = await service.create(
        {
          ...baseDto,
          priority: 4,
          annotation: 'Intento de ingreso no autorizado por sector oriental.',
        },
        'user-guard',
        'tenant-1',
      );

      expect(result.id).toBe('minuta-high-1');
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'coord-user-1',
          type: 'HIGH_ALERT',
        }),
      );
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'sup-user-2',
          type: 'HIGH_ALERT',
        }),
      );
      // No critical email for priority 4
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('should trigger SSE notification and send critical email to Director of Operations, Coordinator and Supervisors assigned to client when priority is 5 (Crítica)', async () => {
      const createdRecord = {
        id: 'minuta-crit-1',
        ...baseDto,
        annotation:
          'Activación de alarma de intrusión armada con ruptura perimetral.',
        priority: 5,
        clientId: 'client-1',
      };
      repository.create.mockResolvedValue(createdRecord);

      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        name: 'Edificio Residencial Parque Central',
      });

      prisma.userClientAccess.findMany.mockResolvedValue([
        {
          userId: 'coord-user-1',
          roleName: 'COORDINADOR',
          user: {
            id: 'coord-user-1',
            document: '1001',
            fullName: 'Carlos Coordinador',
          },
        },
        {
          userId: 'sup-user-2',
          roleName: 'SUPERVISOR',
          user: {
            id: 'sup-user-2',
            document: '1002',
            fullName: 'Diana Supervisora',
          },
        },
        {
          userId: 'dir-user-3',
          roleName: 'DIRECTOR_OPERACIONES',
          user: {
            id: 'dir-user-3',
            document: '1003',
            fullName: 'Eduardo Director Ops',
          },
        },
      ]);

      prisma.employee.findMany.mockResolvedValue([
        { document: '1001', email: 'carlos@empresa.com' },
        { document: '1002', email: 'diana@empresa.com' },
        { document: '1003', email: 'eduardo.ops@empresa.com' },
      ]);

      const result = await service.create(
        {
          ...baseDto,
          priority: 5,
          annotation:
            'Activación de alarma de intrusión armada con ruptura perimetral.',
        },
        'user-guard',
        'tenant-1',
      );

      expect(result.id).toBe('minuta-crit-1');
      // 3 notifications dispatched
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(3);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CRITICAL_ALERT',
        }),
      );

      // Email sent strictly to assigned personnel
      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.arrayContaining([
            'carlos@empresa.com',
            'diana@empresa.com',
            'eduardo.ops@empresa.com',
          ]),
          subject: expect.stringContaining(
            '[ALERTA CRÍTICA] Edificio Residencial Parque Central',
          ),
          html: expect.stringContaining(
            'Activación de alarma de intrusión armada',
          ),
        }),
      );
    });

    it('should strictly isolate alert recipients and exclude unassigned staff or technicians with admin roles', async () => {
      const createdRecord = {
        id: 'minuta-crit-suba',
        ...baseDto,
        annotation: 'Intrusión crítica en Las Palmas de Suba.',
        priority: 5,
        clientId: 'client-suba',
      };
      repository.create.mockResolvedValue(createdRecord);

      prisma.client.findUnique.mockResolvedValue({
        id: 'client-suba',
        name: 'Conjunto Cerrado Las Palmas de Suba',
      });

      // ONLY Jorge is assigned to this client
      prisma.userClientAccess.findMany.mockResolvedValue([
        {
          userId: 'user-jorge',
          roleName: 'DIRECTOR_OPERACIONES',
          user: {
            id: 'user-jorge',
            document: '3003003001',
            fullName: 'Jorge Luis Rojas Sanchez',
          },
        },
      ]);

      // Only Jorge matches the document query
      prisma.employee.findMany.mockResolvedValue([
        { document: '3003003001', email: 'josuag2@gmail.com' },
      ]);

      await service.create(
        {
          ...baseDto,
          priority: 5,
          annotation: 'Intrusión crítica en Las Palmas de Suba.',
        },
        'user-guard',
        'tenant-1',
      );

      // Notification sent ONLY to Jorge
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-jorge',
          type: 'CRITICAL_ALERT',
        }),
      );

      // Email sent ONLY to Jorge's verified email, excluding Carolina and Diego
      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['josuag2@gmail.com'],
          subject: expect.stringContaining(
            '[ALERTA CRÍTICA] Conjunto Cerrado Las Palmas de Suba',
          ),
        }),
      );
    });

    it('should gracefully handle mail service failure during priority 5 escalation without throwing or rolling back', async () => {
      const createdRecord = {
        id: 'minuta-crit-2',
        ...baseDto,
        annotation: 'Falla de energía total en subestación principal.',
        priority: 5,
        clientId: 'client-1',
      };
      repository.create.mockResolvedValue(createdRecord);
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        name: 'Planta Industrial',
      });
      prisma.userClientAccess.findMany.mockResolvedValue([
        {
          userId: 'sup-1',
          roleName: 'SUPERVISOR',
          user: { id: 'sup-1', document: '123', fullName: 'Sup 1' },
        },
      ]);
      prisma.employee.findMany.mockResolvedValue([
        { document: '123', email: 'sup1@empresa.com' },
      ]);

      mailService.sendMail.mockRejectedValue(new Error('Resend SMTP timeout'));

      // Should complete without error
      await expect(
        service.create(
          {
            ...baseDto,
            priority: 5,
            annotation: 'Falla de energía total en subestación principal.',
          },
          'user-guard',
          'tenant-1',
        ),
      ).resolves.toEqual(createdRecord);
    });
  });
});
