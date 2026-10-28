import { CommercialProposalsService } from './commercial-proposals.service';
import {
  ProposalStatus,
  PnlHealthStatus,
  ShiftScheduleType,
  WeaponModality,
  CommercialSector,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CommercialProposalsService', () => {
  let service: CommercialProposalsService;
  let mockRepository: any;
  let mockPnlCalculator: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockRepository = {
      getNextFolioCode: jest.fn().mockResolvedValue('COT-2026-0001'),
      create: jest.fn().mockImplementation((data) => ({
        id: 'prop-1',
        proposalFolioCode: data.proposalFolioCode,
        status: data.status,
      })),
      findById: jest.fn().mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.DRAFT,
        pnlStatus: PnlHealthStatus.PROFITABLE,
        contractDurationMonths: 12,
        promptPaymentDiscPercent: 0,
        items: [],
        valueAddedItems: [],
      }),
      findPaginated: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { nextCursor: null, take: 20 } }),
      update: jest.fn().mockResolvedValue({ id: 'prop-1' }),
      updateStatus: jest
        .fn()
        .mockImplementation((tId, id, status) => ({ id, status })),
      delete: jest.fn().mockResolvedValue({ id: 'prop-1' }),
    };

    mockPnlCalculator = {
      computePnl: jest.fn().mockReturnValue({
        subtotalMonthlyPreDisc: 10000000,
        promptPaymentDiscPercent: 0,
        promptPaymentDiscAmount: 0,
        subtotalMonthlyAfterDisc: 10000000,
        aiuBaseAmount: 1000000,
        ivaAmount: 190000,
        totalMonthlyWithTax: 10190000,
        totalAnnualContractValue: 122280000,
        estimatedMonthlyRealCost: 8000000,
        monthlyVagAmortization: 0,
        totalMonthlyOperatingCost: 8000000,
        netMonthlyMarginAmount: 2000000,
        netMarginPercentage: 20,
        pnlStatus: PnlHealthStatus.PROFITABLE,
      }),
    };

    mockPrisma = {
      client: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'client-1', name: 'Edificio Los Pinos' }),
      },
      tariffPeriodConfig: {
        findFirst: jest.fn().mockResolvedValue({ id: 'tp-1', year: 2026 }),
      },
      commercialSettings: {
        findUnique: jest.fn().mockResolvedValue({
          defaultAiuRate: 0.1,
          defaultIvaOnAiuRate: 0.19,
        }),
      },
    };

    service = new CommercialProposalsService(
      mockRepository,
      mockPnlCalculator,
      mockPrisma,
    );
  });

  describe('calculatePnlLive', () => {
    it('debe delegar el cálculo al engine de P&L', async () => {
      const dto: any = { contractDurationMonths: 12, items: [] };
      const res = await service.calculatePnlLive(dto, 'ten-1');
      expect(mockPnlCalculator.computePnl).toHaveBeenCalledWith({
        ...dto,
        aiuRate: 0.1,
        ivaOnAiuRate: 0.19,
      });
      expect(res.netMarginPercentage).toBe(20);
    });
  });

  describe('createProposal', () => {
    const validDto: any = {
      clientId: 'client-1',
      tariffPeriodId: 'tp-1',
      contractDurationMonths: 12,
      items: [
        {
          positionTitle: 'Guarda 24H',
          quantity: 1,
          scheduleType: ShiftScheduleType.SCHEDULE_2X2X2,
          weaponModality: WeaponModality.LETHAL_WEAPON,
          tariffCategory: CommercialSector.COMMERCIAL_PUBLIC,
          unitMonthlyBilledPrice: 10000000,
          unitMonthlyRealCost: 8000000,
        },
      ],
    };

    it('debe crear propuesta en estado DRAFT si el semáforo es verde (PROFITABLE)', async () => {
      const res = await service.createProposal('ten-1', 'usr-1', validDto);
      expect(mockPrisma.client.findFirst).toHaveBeenCalled();
      expect(mockPrisma.tariffPeriodConfig.findFirst).toHaveBeenCalled();
      expect(mockRepository.getNextFolioCode).toHaveBeenCalledWith(
        'ten-1',
        2026,
      );
      expect(mockRepository.create).toHaveBeenCalled();
      expect(res.status).toBe(ProposalStatus.DRAFT);
    });

    it('debe crear propuesta en UNDER_REVIEW si el semáforo es ámbar (WARNING_LOW_MARGIN)', async () => {
      mockPnlCalculator.computePnl.mockReturnValueOnce({
        subtotalMonthlyPreDisc: 10000000,
        promptPaymentDiscPercent: 0,
        promptPaymentDiscAmount: 0,
        subtotalMonthlyAfterDisc: 10000000,
        aiuBaseAmount: 1000000,
        ivaAmount: 190000,
        totalMonthlyWithTax: 10190000,
        totalAnnualContractValue: 122280000,
        estimatedMonthlyRealCost: 8800000,
        monthlyVagAmortization: 0,
        totalMonthlyOperatingCost: 8800000,
        netMonthlyMarginAmount: 1200000,
        netMarginPercentage: 12,
        pnlStatus: PnlHealthStatus.WARNING_LOW_MARGIN,
      });

      const res = await service.createProposal('ten-1', 'usr-1', validDto);
      expect(res.status).toBe(ProposalStatus.UNDER_REVIEW);
    });

    it('debe lanzar NotFoundException si cliente no existe', async () => {
      mockPrisma.client.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createProposal('ten-1', 'usr-1', validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si vigencia tarifaria no existe', async () => {
      mockPrisma.tariffPeriodConfig.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createProposal('ten-1', 'usr-1', validDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProposal', () => {
    it('debe actualizar propuesta en borrador', async () => {
      const res = await service.updateProposal('ten-1', 'usr-1', 'prop-1', {
        contractDurationMonths: 24,
      });
      expect(mockRepository.findById).toHaveBeenCalledWith('ten-1', 'prop-1');
      expect(mockRepository.update).toHaveBeenCalled();
      expect(res).toEqual({ id: 'prop-1' });
    });

    it('debe lanzar NotFoundException si la propuesta no existe', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(
        service.updateProposal('ten-1', 'usr-1', 'prop-99', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la propuesta ya fue emitida al cliente', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        status: ProposalStatus.SENT_TO_CLIENT,
      });
      await expect(
        service.updateProposal('ten-1', 'usr-1', 'prop-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProposalById y getProposalsPaginated', () => {
    it('getProposalById debe retornar propuesta', async () => {
      const res = await service.getProposalById('ten-1', 'prop-1');
      expect(res.id).toBe('prop-1');
    });

    it('getProposalById debe lanzar NotFoundException si no existe', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getProposalById('ten-1', 'prop-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getProposalsPaginated debe consultar repositorio', async () => {
      const res = await service.getProposalsPaginated('ten-1', {});
      expect(mockRepository.findPaginated).toHaveBeenCalledWith('ten-1', {});
      expect(res.data).toBeDefined();
    });
  });

  describe('approvePnl', () => {
    it('debe aprobar propuesta si está en semáforo ámbar o verde', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        status: ProposalStatus.UNDER_REVIEW,
        pnlStatus: PnlHealthStatus.WARNING_LOW_MARGIN,
      });

      const res = await service.approvePnl('ten-1', 'usr-boss', 'prop-1');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'ten-1',
        'prop-1',
        ProposalStatus.APPROVED_INTERNAL,
        'usr-boss',
      );
      expect(res.status).toBe(ProposalStatus.APPROVED_INTERNAL);
    });

    it('debe rechazar aprobación si el semáforo es deficitario (DEFICIT_BLOCKED)', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        pnlStatus: PnlHealthStatus.DEFICIT_BLOCKED,
      });

      await expect(
        service.approvePnl('ten-1', 'usr-boss', 'prop-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('issueProposal', () => {
    it('debe emitir propuesta si está verde (PROFITABLE)', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        status: ProposalStatus.DRAFT,
        pnlStatus: PnlHealthStatus.PROFITABLE,
      });

      const res = await service.issueProposal('ten-1', 'usr-1', 'prop-1');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'ten-1',
        'prop-1',
        ProposalStatus.SENT_TO_CLIENT,
        'usr-1',
      );
      expect(res.status).toBe(ProposalStatus.SENT_TO_CLIENT);
    });

    it('debe bloquear emisión si semáforo es rojo (DEFICIT_BLOCKED)', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        pnlStatus: PnlHealthStatus.DEFICIT_BLOCKED,
      });

      await expect(
        service.issueProposal('ten-1', 'usr-1', 'prop-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe bloquear emisión si es ámbar y no ha sido aprobada previamente', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        status: ProposalStatus.UNDER_REVIEW,
        pnlStatus: PnlHealthStatus.WARNING_LOW_MARGIN,
      });

      await expect(
        service.issueProposal('ten-1', 'usr-1', 'prop-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir emisión si es ámbar pero ya fue APPROVED_INTERNAL', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        status: ProposalStatus.APPROVED_INTERNAL,
        pnlStatus: PnlHealthStatus.WARNING_LOW_MARGIN,
      });

      const res = await service.issueProposal('ten-1', 'usr-1', 'prop-1');
      expect(res.status).toBe(ProposalStatus.SENT_TO_CLIENT);
    });
  });

  describe('deleteProposal', () => {
    it('debe eliminar propuesta si está en DRAFT', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        status: ProposalStatus.DRAFT,
      });

      const res = await service.deleteProposal('ten-1', 'prop-1');
      expect(mockRepository.delete).toHaveBeenCalledWith('ten-1', 'prop-1');
      expect(res).toEqual({ id: 'prop-1' });
    });

    it('debe bloquear eliminación si no está en DRAFT', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'prop-1',
        status: ProposalStatus.SENT_TO_CLIENT,
      });

      await expect(service.deleteProposal('ten-1', 'prop-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
