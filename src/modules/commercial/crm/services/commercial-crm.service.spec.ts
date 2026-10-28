import { CommercialCrmService } from './commercial-crm.service';
import {
  FollowUpMilestoneStatus,
  InteractionChannel,
  DealLossReasonCategory,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CommercialCrmService', () => {
  let service: CommercialCrmService;
  let mockRepository: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn().mockImplementation((data) => ({
        id: 'fu-1',
        ...data,
      })),
      findById: jest.fn().mockResolvedValue({
        id: 'fu-1',
        contactPersonName: 'Dora Gómez',
      }),
      findByClientId: jest.fn().mockResolvedValue([{ id: 'fu-1' }]),
      findPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      update: jest.fn().mockResolvedValue({ id: 'fu-1' }),
      delete: jest.fn().mockResolvedValue({ id: 'fu-1' }),
      findClientsForRecaptation: jest.fn().mockResolvedValue([{ id: 'c-1' }]),
    };

    mockPrisma = {
      client: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'client-1', name: 'Edificio Los Pinos' }),
        update: jest.fn().mockResolvedValue({ id: 'client-1' }),
      },
    };

    service = new CommercialCrmService(mockRepository, mockPrisma);
  });

  const validDto: any = {
    clientId: 'client-1',
    contactChannel: InteractionChannel.PHONE_CALL,
    contactPersonName: 'Dora Gómez',
    managementSummary: 'Reunión de seguimiento comercial exitosa',
    statusAfterFollowUp: FollowUpMilestoneStatus.PENDING,
  };

  describe('createFollowUp', () => {
    it('debe registrar seguimiento en estado PENDING', async () => {
      const res = await service.createFollowUp('ten-1', 'usr-1', validDto);
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1', tenantId: 'ten-1' },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(res.id).toBe('fu-1');
    });

    it('debe calcular alerta de recaptación a 335 días cuando se marca como LOST', async () => {
      const lostDto: any = {
        ...validDto,
        statusAfterFollowUp: FollowUpMilestoneStatus.LOST,
        lossReasonCategory: DealLossReasonCategory.COMPETITOR_PRICE,
        winningCompetitorName: 'Seguridad Atlas Ltda.',
        interactionDate: '2026-10-24T00:00:00Z',
      };

      await service.createFollowUp('ten-1', 'usr-1', lostDto);

      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: expect.objectContaining({
          recaptationAlertSent: false,
          recaptationTargetDate: expect.any(Date),
        }),
      });
    });

    it('debe lanzar BadRequestException si se marca LOST sin motivo de pérdida', async () => {
      const invalidLostDto: any = {
        ...validDto,
        statusAfterFollowUp: FollowUpMilestoneStatus.LOST,
      };

      await expect(
        service.createFollowUp('ten-1', 'usr-1', invalidLostDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si cliente no existe', async () => {
      mockPrisma.client.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createFollowUp('ten-1', 'usr-1', validDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFollowUpsByClient y getFollowUpsPaginated', () => {
    it('getFollowUpsByClient debe retornar listado', async () => {
      const res = await service.getFollowUpsByClient('ten-1', 'client-1');
      expect(mockRepository.findByClientId).toHaveBeenCalledWith(
        'ten-1',
        'client-1',
      );
      expect(res).toHaveLength(1);
    });

    it('getFollowUpsPaginated debe consultar repositorio', async () => {
      const res = await service.getFollowUpsPaginated('ten-1', {});
      expect(mockRepository.findPaginated).toHaveBeenCalledWith('ten-1', {});
      expect(res.data).toBeDefined();
    });
  });

  describe('getFollowUpById, updateFollowUp y deleteFollowUp', () => {
    it('getFollowUpById debe retornar detalle', async () => {
      const res = await service.getFollowUpById('ten-1', 'fu-1');
      expect(res.id).toBe('fu-1');
    });

    it('getFollowUpById debe lanzar NotFoundException si no existe', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getFollowUpById('ten-1', 'fu-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updateFollowUp debe actualizar seguimiento', async () => {
      const res = await service.updateFollowUp('ten-1', 'fu-1', {
        ...validDto,
        managementSummary: 'Resumen actualizado',
      });
      expect(mockRepository.update).toHaveBeenCalled();
      expect(res.id).toBe('fu-1');
    });

    it('deleteFollowUp debe eliminar seguimiento', async () => {
      const res = await service.deleteFollowUp('ten-1', 'fu-1');
      expect(mockRepository.delete).toHaveBeenCalledWith('ten-1', 'fu-1');
      expect(res.id).toBe('fu-1');
    });
  });

  describe('getRecaptationAlerts', () => {
    it('debe consultar alertas de clientes para recaptación', async () => {
      const res = await service.getRecaptationAlerts('ten-1');
      expect(mockRepository.findClientsForRecaptation).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });
  });
});
