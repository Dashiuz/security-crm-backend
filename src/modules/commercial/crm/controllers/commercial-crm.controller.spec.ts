import { CommercialCrmController } from './commercial-crm.controller';

describe('CommercialCrmController', () => {
  let controller: CommercialCrmController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      createFollowUp: jest.fn().mockResolvedValue({ id: 'fu-1' }),
      getFollowUpsPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getFollowUpsByClient: jest.fn().mockResolvedValue([{ id: 'fu-1' }]),
      getRecaptationAlerts: jest.fn().mockResolvedValue([{ id: 'c-1' }]),
      getFollowUpById: jest.fn().mockResolvedValue({ id: 'fu-1' }),
      updateFollowUp: jest.fn().mockResolvedValue({ id: 'fu-1' }),
      deleteFollowUp: jest.fn().mockResolvedValue({ id: 'fu-1' }),
    };

    controller = new CommercialCrmController(mockService);
  });

  const mockReq = {
    user: { tenantId: 'ten-1', userId: 'usr-1' },
  };

  it('createFollowUp debe delegar al servicio con tenantId y userId', async () => {
    const dto: any = { clientId: 'c-1' };
    const res = await controller.createFollowUp(mockReq, dto);
    expect(mockService.createFollowUp).toHaveBeenCalledWith('ten-1', 'usr-1', dto);
    expect(res).toEqual({ id: 'fu-1' });
  });

  it('getFollowUps debe delegar al servicio con filtros', async () => {
    const filter: any = { take: 10 };
    const res = await controller.getFollowUps(mockReq, filter);
    expect(mockService.getFollowUpsPaginated).toHaveBeenCalledWith('ten-1', filter);
    expect(res.data).toBeDefined();
  });

  it('getFollowUpsByClient debe delegar al servicio con clientId', async () => {
    const res = await controller.getFollowUpsByClient(mockReq, 'client-1');
    expect(mockService.getFollowUpsByClient).toHaveBeenCalledWith('ten-1', 'client-1');
    expect(res).toHaveLength(1);
  });

  it('getRecaptationAlerts debe delegar al servicio', async () => {
    const res = await controller.getRecaptationAlerts(mockReq);
    expect(mockService.getRecaptationAlerts).toHaveBeenCalledWith('ten-1');
    expect(res).toHaveLength(1);
  });

  it('getFollowUpById debe delegar al servicio', async () => {
    const res = await controller.getFollowUpById(mockReq, 'fu-1');
    expect(mockService.getFollowUpById).toHaveBeenCalledWith('ten-1', 'fu-1');
    expect(res).toEqual({ id: 'fu-1' });
  });

  it('updateFollowUp debe delegar al servicio', async () => {
    const dto: any = { managementSummary: 'Actualizado' };
    const res = await controller.updateFollowUp(mockReq, 'fu-1', dto);
    expect(mockService.updateFollowUp).toHaveBeenCalledWith('ten-1', 'fu-1', dto);
    expect(res).toEqual({ id: 'fu-1' });
  });

  it('deleteFollowUp debe delegar al servicio', async () => {
    const res = await controller.deleteFollowUp(mockReq, 'fu-1');
    expect(mockService.deleteFollowUp).toHaveBeenCalledWith('ten-1', 'fu-1');
    expect(res).toEqual({ id: 'fu-1' });
  });
});
