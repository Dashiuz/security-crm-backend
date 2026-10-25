import { CommercialServiceOrdersController } from './commercial-service-orders.controller';
import { ServiceOrderStatus } from '@prisma/client';

describe('CommercialServiceOrdersController', () => {
  let controller: CommercialServiceOrdersController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      createServiceOrder: jest.fn().mockResolvedValue({ id: 'so-1' }),
      getServiceOrdersPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getServiceOrderById: jest.fn().mockResolvedValue({ id: 'so-1' }),
      updateServiceOrder: jest.fn().mockResolvedValue({ id: 'so-1' }),
      dispatchOrder: jest.fn().mockResolvedValue({ order: { id: 'so-1', status: ServiceOrderStatus.ISSUED_DISPATCHED }, dispatchedDepartmentsCount: 9 }),
      updateStatus: jest.fn().mockResolvedValue({ id: 'so-1', status: ServiceOrderStatus.IN_OPERATION }),
      deleteServiceOrder: jest.fn().mockResolvedValue({ id: 'so-1' }),
    };

    controller = new CommercialServiceOrdersController(mockService);
  });

  const mockReq = {
    user: { tenantId: 'ten-1', userId: 'usr-1' },
  };

  it('createServiceOrder debe delegar al servicio con tenantId y userId', async () => {
    const dto: any = { clientId: 'client-1' };
    const res = await controller.createServiceOrder(mockReq, dto);
    expect(mockService.createServiceOrder).toHaveBeenCalledWith('ten-1', 'usr-1', dto);
    expect(res).toEqual({ id: 'so-1' });
  });

  it('getServiceOrders debe delegar al servicio con filtros', async () => {
    const filter: any = { take: 10 };
    const res = await controller.getServiceOrders(mockReq, filter);
    expect(mockService.getServiceOrdersPaginated).toHaveBeenCalledWith('ten-1', filter);
    expect(res.data).toBeDefined();
  });

  it('getServiceOrderById debe delegar al servicio', async () => {
    const res = await controller.getServiceOrderById(mockReq, 'so-1');
    expect(mockService.getServiceOrderById).toHaveBeenCalledWith('ten-1', 'so-1');
    expect(res).toEqual({ id: 'so-1' });
  });

  it('updateServiceOrder debe delegar al servicio', async () => {
    const dto: any = { siteAddress: 'Carrera 15' };
    const res = await controller.updateServiceOrder(mockReq, 'so-1', dto);
    expect(mockService.updateServiceOrder).toHaveBeenCalledWith('ten-1', 'so-1', dto);
    expect(res).toEqual({ id: 'so-1' });
  });

  it('dispatchOrder debe delegar al servicio', async () => {
    const dto: any = { dispatchNotes: 'Nota' };
    const res = await controller.dispatchOrder(mockReq, 'so-1', dto);
    expect(mockService.dispatchOrder).toHaveBeenCalledWith('ten-1', 'so-1', dto);
    expect(res.dispatchedDepartmentsCount).toBe(9);
  });

  it('updateStatus debe delegar al servicio', async () => {
    const res = await controller.updateStatus(mockReq, 'so-1', ServiceOrderStatus.IN_OPERATION);
    expect(mockService.updateStatus).toHaveBeenCalledWith('ten-1', 'so-1', ServiceOrderStatus.IN_OPERATION);
    expect(res.status).toBe(ServiceOrderStatus.IN_OPERATION);
  });

  it('deleteServiceOrder debe delegar al servicio', async () => {
    const res = await controller.deleteServiceOrder(mockReq, 'so-1');
    expect(mockService.deleteServiceOrder).toHaveBeenCalledWith('ten-1', 'so-1');
    expect(res).toEqual({ id: 'so-1' });
  });
});
