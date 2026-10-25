import { CommercialServiceOrdersService } from './commercial-service-orders.service';
import {
  ServiceOrderStatus,
  ServiceOrderType,
  ProposalStatus,
  ClientStatus,
  ShiftScheduleType,
  WeaponModality,
  InternalDepartment,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CommercialServiceOrdersService', () => {
  let service: CommercialServiceOrdersService;
  let mockRepository: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockRepository = {
      getNextOrderFolioCode: jest.fn().mockResolvedValue('OS-2026-0001'),
      getNextOmegaCode: jest.fn().mockResolvedValue('OMG-001'),
      create: jest.fn().mockImplementation((data) => ({
        id: 'so-1',
        orderFolioCode: data.orderFolioCode,
        omegaCode: data.omegaCode,
        status: data.status,
      })),
      findById: jest.fn().mockResolvedValue({
        id: 'so-1',
        orderFolioCode: 'OS-2026-0001',
        status: ServiceOrderStatus.DRAFT_CONFIGURING,
        positions: [],
        equipment: [],
      }),
      findPaginated: jest.fn().mockResolvedValue({ data: [], meta: { nextCursor: null, take: 20 } }),
      update: jest.fn().mockResolvedValue({ id: 'so-1' }),
      updateStatus: jest.fn().mockImplementation((tId, id, status) => ({ id, status })),
      createDispatchLogs: jest.fn().mockResolvedValue({ count: 9 }),
      delete: jest.fn().mockResolvedValue({ id: 'so-1' }),
    };

    mockPrisma = {
      client: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'client-1',
          name: 'Edificio Los Pinos',
          internalCode: null,
          clientStatus: ClientStatus.PROSPECT,
        }),
        update: jest.fn().mockResolvedValue({ id: 'client-1', clientStatus: ClientStatus.ACTIVE }),
      },
      commercialProposal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'prop-1',
          status: ProposalStatus.SENT_TO_CLIENT,
        }),
        update: jest.fn().mockResolvedValue({ id: 'prop-1', status: ProposalStatus.WON }),
      },
      serviceOrderDistributionRecipient: {
        findMany: jest.fn().mockResolvedValue([
          { department: InternalDepartment.OPERATIONS, recipientEmail: 'operaciones@empresa.com' },
          { department: InternalDepartment.HUMAN_RESOURCES, recipientEmail: 'rrhh@empresa.com' },
        ]),
      },
    };

    service = new CommercialServiceOrdersService(mockRepository, mockPrisma);
  });

  const validDto: any = {
    clientId: 'client-1',
    proposalId: 'prop-1',
    orderType: ServiceOrderType.NEW_SITE,
    installationDate: '2026-11-01',
    contractEndDate: '2027-10-31',
    empalmeDaysPrior: 3,
    siteAddress: 'Calle 100 # 15-20',
    siteCity: 'Bogotá',
    legalRepName: 'Carlos Mendoza',
    administratorName: 'Dora Gómez',
    totalMonthlyBeforeTax: 24000000,
    totalMonthlyWithTax: 24456000,
    positions: [
      {
        positionTitle: 'Guarda Recepción',
        quantityGuards: 2,
        scheduleType: ShiftScheduleType.SCHEDULE_2X2X2,
        weaponModality: WeaponModality.NO_WEAPON,
        netMonthlySalaryToPay: 1800000,
      },
    ],
    equipment: [
      {
        itemName: 'Radio Motorola DGP8550',
        quantity: 2,
      },
    ],
  };

  describe('createServiceOrder', () => {
    it('debe crear orden, marcar propuesta como WON y activar cliente con código OMEGA', async () => {
      const res = await service.createServiceOrder('ten-1', 'usr-1', validDto);

      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1', tenantId: 'ten-1' },
      });
      expect(mockPrisma.commercialProposal.findFirst).toHaveBeenCalledWith({
        where: { id: 'prop-1', tenantId: 'ten-1' },
      });
      expect(mockPrisma.commercialProposal.update).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { status: ProposalStatus.WON, updatedById: 'usr-1' },
      });
      expect(mockRepository.getNextOrderFolioCode).toHaveBeenCalledWith('ten-1', 2026);
      expect(mockRepository.getNextOmegaCode).toHaveBeenCalledWith('ten-1');
      expect(mockRepository.create).toHaveBeenCalled();

      // Cliente sincronizado
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: expect.objectContaining({
          internalCode: 'OMG-001',
          clientStatus: ClientStatus.ACTIVE,
        }),
      });

      expect(res.orderFolioCode).toBe('OS-2026-0001');
      expect(res.omegaCode).toBe('OMG-001');
    });

    it('debe lanzar NotFoundException si cliente no existe', async () => {
      mockPrisma.client.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createServiceOrder('ten-1', 'usr-1', validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si propuesta asociada no existe', async () => {
      mockPrisma.commercialProposal.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createServiceOrder('ten-1', 'usr-1', validDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getServiceOrderById y getServiceOrdersPaginated', () => {
    it('getServiceOrderById debe retornar orden', async () => {
      const res = await service.getServiceOrderById('ten-1', 'so-1');
      expect(res.id).toBe('so-1');
    });

    it('getServiceOrderById debe lanzar NotFoundException si no existe', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getServiceOrderById('ten-1', 'so-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getServiceOrdersPaginated debe consultar repositorio', async () => {
      const res = await service.getServiceOrdersPaginated('ten-1', {});
      expect(mockRepository.findPaginated).toHaveBeenCalledWith('ten-1', {});
      expect(res.data).toBeDefined();
    });
  });

  describe('updateServiceOrder', () => {
    it('debe actualizar orden en borrador', async () => {
      const res = await service.updateServiceOrder('ten-1', 'so-1', {
        siteAddress: 'Calle 101 # 20-30',
      });
      expect(mockRepository.update).toHaveBeenCalled();
      expect(res).toEqual({ id: 'so-1' });
    });

    it('debe lanzar BadRequestException si la orden ya está IN_OPERATION', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'so-1',
        status: ServiceOrderStatus.IN_OPERATION,
      });

      await expect(
        service.updateServiceOrder('ten-1', 'so-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dispatchOrder', () => {
    it('debe despachar formalmente a los 9 departamentos y transicionar a ISSUED_DISPATCHED', async () => {
      const res = await service.dispatchOrder('ten-1', 'so-1', {
        dispatchNotes: 'Despacho de prueba',
      });

      expect(mockRepository.createDispatchLogs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            department: InternalDepartment.OPERATIONS,
            recipientEmail: 'operaciones@empresa.com',
          }),
          expect.objectContaining({
            department: InternalDepartment.HUMAN_RESOURCES,
            recipientEmail: 'rrhh@empresa.com',
          }),
        ]),
      );
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'ten-1',
        'so-1',
        ServiceOrderStatus.ISSUED_DISPATCHED,
      );
      expect(res.dispatchedDepartmentsCount).toBe(9);
      expect(res.order.status).toBe(ServiceOrderStatus.ISSUED_DISPATCHED);
    });

    it('debe rechazar despacho si orden está cancelada', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'so-1',
        status: ServiceOrderStatus.CANCELLED,
      });

      await expect(
        service.dispatchOrder('ten-1', 'so-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus y deleteServiceOrder', () => {
    it('updateStatus debe cambiar estado a IN_OPERATION', async () => {
      const res = await service.updateStatus('ten-1', 'so-1', ServiceOrderStatus.IN_OPERATION);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith('ten-1', 'so-1', ServiceOrderStatus.IN_OPERATION);
      expect(res.status).toBe(ServiceOrderStatus.IN_OPERATION);
    });

    it('deleteServiceOrder debe eliminar si está en DRAFT_CONFIGURING', async () => {
      const res = await service.deleteServiceOrder('ten-1', 'so-1');
      expect(mockRepository.delete).toHaveBeenCalledWith('ten-1', 'so-1');
      expect(res).toEqual({ id: 'so-1' });
    });

    it('deleteServiceOrder debe lanzar BadRequestException si no está en borrador', async () => {
      mockRepository.findById.mockResolvedValueOnce({
        id: 'so-1',
        status: ServiceOrderStatus.ISSUED_DISPATCHED,
      });

      await expect(
        service.deleteServiceOrder('ten-1', 'so-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
