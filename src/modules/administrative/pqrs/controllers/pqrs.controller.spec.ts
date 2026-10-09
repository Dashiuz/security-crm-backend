import { Test, TestingModule } from '@nestjs/testing';
import { PqrsController } from './pqrs.controller';
import { PqrsService } from '../services/pqrs.service';
import { PqrsPriority, PqrsStatus, PqrsType } from '@prisma/client';

describe('PqrsController', () => {
  let controller: PqrsController;
  let service: any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      assign: jest.fn(),
      updateStatus: jest.fn(),
      addMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PqrsController],
      providers: [{ provide: PqrsService, useValue: service }],
    }).compile();

    controller = module.get<PqrsController>(PqrsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debe llamar a service.create con el DTO', async () => {
    const dto = {
      subject: 'Problema en ascensor',
      description: 'Detalle',
      type: PqrsType.RECLAMO,
      priority: PqrsPriority.HIGH,
    };
    service.create.mockResolvedValue({ id: 'ticket-1', ...dto });

    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.id).toBe('ticket-1');
  });

  it('debe llamar a service.findAll con query y permisos del usuario', async () => {
    const req = { user: { permissions: ['pqrs:read'] } };
    const query = { status: PqrsStatus.OPEN };
    service.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

    await controller.findAll(req, query);
    expect(service.findAll).toHaveBeenCalledWith(query, ['pqrs:read']);
  });

  it('debe llamar a service.assign con ticketId y dto', async () => {
    const dto = { assignedToId: 'user-1' };
    service.assign.mockResolvedValue({
      id: 'ticket-1',
      status: PqrsStatus.ASSIGNED,
    });

    const result = await controller.assign('ticket-1', dto);
    expect(service.assign).toHaveBeenCalledWith('ticket-1', dto);
    expect(result.status).toBe(PqrsStatus.ASSIGNED);
  });

  it('debe llamar a service.updateStatus con ticketId, dto y permisos', async () => {
    const req = { user: { permissions: ['pqrs:update'] } };
    const dto = { status: PqrsStatus.IN_PROGRESS };
    service.updateStatus.mockResolvedValue({
      id: 'ticket-1',
      status: PqrsStatus.IN_PROGRESS,
    });

    const result = await controller.updateStatus(req, 'ticket-1', dto);
    expect(service.updateStatus).toHaveBeenCalledWith('ticket-1', dto, [
      'pqrs:update',
    ]);
    expect(result.status).toBe(PqrsStatus.IN_PROGRESS);
  });

  it('debe llamar a service.addMessage con ticketId, dto y permisos', async () => {
    const req = { user: { permissions: ['pqrs:update'] } };
    const dto = { content: 'Novedad atendida' };
    service.addMessage.mockResolvedValue({
      id: 'msg-1',
      content: 'Novedad atendida',
    });

    const result = await controller.addMessage(req, 'ticket-1', dto);
    expect(service.addMessage).toHaveBeenCalledWith('ticket-1', dto, [
      'pqrs:update',
    ]);
    expect(result.id).toBe('msg-1');
  });
});
