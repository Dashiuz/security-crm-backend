import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RequestContextService } from '../../../../common/context/request-context.service';
import { BadRequestException } from '@nestjs/common';
import { PqrsPriority, ProposalStatus } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;
  let contextService: jest.Mocked<RequestContextService>;

  const mockTenantId = 'tenant-123';

  beforeEach(async () => {
    const mockPrisma = {
      client: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      pqrsTicket: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      employee: {
        count: jest.fn(),
      },
      correspondenceReceivedControl: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      commercialProposal: {
        groupBy: jest.fn(),
      },
    };

    const mockCtx = {
      tenantId: mockTenantId,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RequestContextService, useValue: mockCtx },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get(PrismaService);
    contextService = module.get(RequestContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('debe calcular KPIs, gráficos y tendencia ANS correctamente', async () => {
      // 1. client.count (active)
      // 2. client.count (prospect)
      prisma.client.count
        .mockResolvedValueOnce(35) // active clients
        .mockResolvedValueOnce(12); // prospects

      // 3. pqrsTicket.count (open)
      // 4. pqrsTicket.count (resolved)
      prisma.pqrsTicket.count
        .mockResolvedValueOnce(4) // open
        .mockResolvedValueOnce(46); // resolved

      // 5. employee.count (active guards)
      prisma.employee.count.mockResolvedValueOnce(120);

      // 6. correspondence.count (pending)
      prisma.correspondenceReceivedControl.count.mockResolvedValueOnce(8);

      // 7. commercialProposal.groupBy
      prisma.commercialProposal.groupBy.mockResolvedValueOnce([
        {
          status: ProposalStatus.DRAFT,
          _count: { id: 3 },
          _sum: { totalMonthlyWithTax: 45000000 },
        },
        {
          status: ProposalStatus.WON,
          _count: { id: 5 },
          _sum: { totalMonthlyWithTax: 120000000 },
        },
      ]);

      const result = await service.getOverview({ tenantId: mockTenantId });

      expect(result.kpis.activeClients).toBe(35);
      expect(result.kpis.prospectsInPipeline).toBe(12);
      expect(result.kpis.openPqrs).toBe(4);
      expect(result.kpis.activeGuards).toBe(120);
      expect(result.kpis.pendingPackages).toBe(8);
      expect(result.kpis.ansComplianceRate).toBeGreaterThan(90);
      expect(result.charts.ansWeeklyTrend.length).toBe(6);
      expect(result.charts.commercialFunnel.length).toBe(4);
    });

    it('debe manejar estado sin tickets asignando tasa estándar de 98.5%', async () => {
      prisma.client.count.mockResolvedValue(0);
      prisma.pqrsTicket.count.mockResolvedValue(0);
      prisma.employee.count.mockResolvedValue(0);
      prisma.correspondenceReceivedControl.count.mockResolvedValue(0);
      prisma.commercialProposal.groupBy.mockResolvedValue([]);

      const result = await service.getOverview({ tenantId: mockTenantId });

      expect(result.kpis.openPqrs).toBe(0);
      expect(result.kpis.ansComplianceRate).toBe(98.5);
    });

    it('debe lanzar BadRequestException si no existe tenantId en contexto', async () => {
      (contextService as any).tenantId = undefined;

      await expect(service.getOverview(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getReminders', () => {
    it('debe clasificar y priorizar recordatorios multimodulares', async () => {
      const now = new Date();

      // PQRS críticas
      prisma.pqrsTicket.findMany.mockResolvedValueOnce([
        {
          id: 'ticket-1',
          code: 'PQRS-001',
          subject: 'Falla Sistema Alarma',
          priority: PqrsPriority.CRITICAL,
          createdAt: now,
        },
      ]);

      // Clientes por vencer
      prisma.client.findMany
        .mockResolvedValueOnce([
          {
            id: 'cli-1',
            name: 'Conjunto Residencial El Rosal',
            contractNumber: 'CTR-2025-01',
            internalCode: 'CLI-01',
            contractEndDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 días -> CRITICAL
          },
        ])
        // Prospectos pendientes
        .mockResolvedValueOnce([
          {
            id: 'prosp-1',
            name: 'Centro Comercial La Sierra',
            phone: '3001234567',
            email: 'admin@lasierra.com',
            createdAt: now,
          },
        ]);

      // Paquetes viejos
      prisma.correspondenceReceivedControl.findMany.mockResolvedValueOnce([
        {
          id: 'pkg-1',
          destination: 'Apto 502 Torre A',
          courierCompany: 'Servientrega',
          occurredAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
        },
      ]);

      const result = await service.getReminders({ tenantId: mockTenantId });

      expect(result.reminders.length).toBe(4);
      expect(result.summary.total).toBe(4);
      expect(result.summary.critical).toBe(2); // 1 PQRS + 1 Contrato < 20 días
      expect(result.reminders[0].urgency).toBe('CRITICAL');
      expect(result.reminders.some((r) => r.module === 'PQRS')).toBe(true);
      expect(result.reminders.some((r) => r.module === 'CLIENTS')).toBe(true);
      expect(result.reminders.some((r) => r.module === 'PORTERIA')).toBe(true);
      expect(result.reminders.some((r) => r.module === 'COMMERCIAL')).toBe(
        true,
      );
    });

    it('debe responder ordenadamente ante una base sin recordatorios pendientes', async () => {
      prisma.pqrsTicket.findMany.mockResolvedValue([]);
      prisma.client.findMany.mockResolvedValue([]);
      prisma.correspondenceReceivedControl.findMany.mockResolvedValue([]);

      const result = await service.getReminders({ tenantId: mockTenantId });

      expect(result.reminders).toEqual([]);
      expect(result.summary.total).toBe(0);
      expect(result.summary.critical).toBe(0);
    });

    it('debe lanzar BadRequestException si no existe tenantId en contexto', async () => {
      (contextService as any).tenantId = undefined;

      await expect(service.getReminders(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
