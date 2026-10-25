import { CommercialServiceOrdersRepository } from './commercial-service-orders.repository';
import { ServiceOrderStatus } from '@prisma/client';

describe('CommercialServiceOrdersRepository', () => {
  let repository: CommercialServiceOrdersRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      serviceOrder: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({ id: 'so-1', orderFolioCode: 'OS-2026-0001' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'so-1' }]),
        create: jest.fn().mockResolvedValue({ id: 'so-1' }),
        update: jest.fn().mockResolvedValue({ id: 'so-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'so-1' }),
      },
      serviceOrderPosition: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      serviceOrderEquipmentItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      serviceOrderDispatchLog: {
        createMany: jest.fn().mockResolvedValue({ count: 9 }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback(mockPrisma);
        }
        return callback;
      }),
    };

    repository = new CommercialServiceOrdersRepository(mockPrisma);
  });

  describe('getNextOrderFolioCode', () => {
    it('debe generar OS-YYYY-0001 si count es 0', async () => {
      const folio = await repository.getNextOrderFolioCode('ten-1', 2026);
      expect(folio).toBe('OS-2026-0001');
      expect(mockPrisma.serviceOrder.count).toHaveBeenCalledWith({
        where: {
          tenantId: 'ten-1',
          orderFolioCode: { startsWith: 'OS-2026-' },
        },
      });
    });

    it('debe incrementar según el count', async () => {
      mockPrisma.serviceOrder.count.mockResolvedValueOnce(17);
      const folio = await repository.getNextOrderFolioCode('ten-1', 2026);
      expect(folio).toBe('OS-2026-0018');
    });
  });

  describe('getNextOmegaCode', () => {
    it('debe generar OMG-001 si count es 0', async () => {
      const omega = await repository.getNextOmegaCode('ten-1');
      expect(omega).toBe('OMG-001');
    });

    it('debe incrementar código omega según el count', async () => {
      mockPrisma.serviceOrder.count.mockResolvedValueOnce(41);
      const omega = await repository.getNextOmegaCode('ten-1');
      expect(omega).toBe('OMG-042');
    });
  });

  describe('findById', () => {
    it('debe buscar orden con puestos y dotación', async () => {
      const res = await repository.findById('ten-1', 'so-1');
      expect(mockPrisma.serviceOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'so-1', tenantId: 'ten-1' },
          include: expect.any(Object),
        }),
      );
      expect(res).toEqual({ id: 'so-1', orderFolioCode: 'OS-2026-0001' });
    });
  });

  describe('findPaginated', () => {
    it('debe listar órdenes con cursor y filtro', async () => {
      const res = await repository.findPaginated('ten-1', {
        clientId: 'client-1',
        status: ServiceOrderStatus.DRAFT_CONFIGURING,
        search: 'OS-2026',
        cursor: 'so-0',
        take: 10,
      });

      expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalled();
      expect(res.data).toHaveLength(1);
      expect(res.meta.take).toBe(10);
    });
  });

  describe('create y update', () => {
    it('create debe registrar orden', async () => {
      const createData: any = { orderFolioCode: 'OS-2026-0001' };
      const res = await repository.create(createData);
      expect(mockPrisma.serviceOrder.create).toHaveBeenCalledWith({
        data: createData,
        include: expect.any(Object),
      });
      expect(res).toEqual({ id: 'so-1' });
    });

    it('update debe ejecutar transacción al actualizar puestos y dotación', async () => {
      const updateData: any = { siteAddress: 'Nueva Carrera 7' };
      const newPos: any[] = [{ positionTitle: 'Supervisor' }];
      const newEq: any[] = [{ itemName: 'Radio' }];

      await repository.update('so-1', updateData, newPos, newEq);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.serviceOrderPosition.deleteMany).toHaveBeenCalledWith({
        where: { serviceOrderId: 'so-1' },
      });
      expect(mockPrisma.serviceOrderEquipmentItem.deleteMany).toHaveBeenCalledWith({
        where: { serviceOrderId: 'so-1' },
      });
      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'so-1' },
        }),
      );
    });
  });

  describe('updateStatus, createDispatchLogs y delete', () => {
    it('updateStatus debe cambiar el estado', async () => {
      await repository.updateStatus('ten-1', 'so-1', ServiceOrderStatus.ISSUED_DISPATCHED);
      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
        where: { id: 'so-1' },
        data: { status: ServiceOrderStatus.ISSUED_DISPATCHED },
      });
    });

    it('createDispatchLogs debe registrar los logs en lote', async () => {
      const logs: any[] = [{ tenantId: 'ten-1', serviceOrderId: 'so-1', department: 'OPERATIONS', recipientEmail: 'ops@noxia.com' }];
      await repository.createDispatchLogs(logs);
      expect(mockPrisma.serviceOrderDispatchLog.createMany).toHaveBeenCalledWith({
        data: logs,
      });
    });

    it('delete debe eliminar por id', async () => {
      await repository.delete('ten-1', 'so-1');
      expect(mockPrisma.serviceOrder.delete).toHaveBeenCalledWith({
        where: { id: 'so-1' },
      });
    });
  });
});
