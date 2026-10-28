import { CommercialCrmRepository } from './commercial-crm.repository';
import { FollowUpMilestoneStatus } from '@prisma/client';

describe('CommercialCrmRepository', () => {
  let repository: CommercialCrmRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      commercialFollowUp: {
        create: jest.fn().mockResolvedValue({ id: 'fu-1' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'fu-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'fu-1' }]),
        update: jest.fn().mockResolvedValue({ id: 'fu-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'fu-1' }),
      },
      client: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'client-1', name: 'Edificio Los Pinos' }]),
        update: jest.fn().mockResolvedValue({ id: 'client-1' }),
      },
    };

    repository = new CommercialCrmRepository(mockPrisma);
  });

  it('create debe llamar a prisma.commercialFollowUp.create', async () => {
    const data: any = { contactPersonName: 'Dora Gómez' };
    const res = await repository.create(data);
    expect(mockPrisma.commercialFollowUp.create).toHaveBeenCalledWith({
      data,
      include: expect.any(Object),
    });
    expect(res).toEqual({ id: 'fu-1' });
  });

  it('findById debe buscar por id y tenantId', async () => {
    const res = await repository.findById('ten-1', 'fu-1');
    expect(mockPrisma.commercialFollowUp.findFirst).toHaveBeenCalledWith({
      where: { id: 'fu-1', tenantId: 'ten-1' },
      include: expect.any(Object),
    });
    expect(res).toEqual({ id: 'fu-1' });
  });

  it('findByClientId debe listar seguimientos del cliente ordenados por fecha', async () => {
    const res = await repository.findByClientId('ten-1', 'client-1');
    expect(mockPrisma.commercialFollowUp.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten-1', clientId: 'client-1' },
      orderBy: { interactionDate: 'desc' },
      include: expect.any(Object),
    });
    expect(res).toHaveLength(1);
  });

  it('findPaginated debe paginar con filtros', async () => {
    const res = await repository.findPaginated('ten-1', {
      clientId: 'client-1',
      status: FollowUpMilestoneStatus.PENDING,
      take: 10,
    });
    expect(mockPrisma.commercialFollowUp.findMany).toHaveBeenCalled();
    expect(res.data).toHaveLength(1);
    expect(res.meta.take).toBe(10);
  });

  it('update y delete deben delegar a prisma', async () => {
    await repository.update('fu-1', { managementSummary: 'Actualizado' });
    expect(mockPrisma.commercialFollowUp.update).toHaveBeenCalledWith({
      where: { id: 'fu-1' },
      data: { managementSummary: 'Actualizado' },
    });

    await repository.delete('ten-1', 'fu-1');
    expect(mockPrisma.commercialFollowUp.delete).toHaveBeenCalledWith({
      where: { id: 'fu-1' },
    });
  });

  it('findClientsForRecaptation debe buscar clientes con recaptationTargetDate vencida', async () => {
    const now = new Date();
    const res = await repository.findClientsForRecaptation('ten-1', now);
    expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten-1',
        recaptationTargetDate: { lte: now },
        recaptationAlertSent: false,
      },
      select: expect.any(Object),
    });
    expect(res).toHaveLength(1);
  });

  it('markRecaptationSent debe actualizar recaptationAlertSent en client', async () => {
    await repository.markRecaptationSent('client-1');
    expect(mockPrisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: { recaptationAlertSent: true },
    });
  });
});
