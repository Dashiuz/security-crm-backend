import { Test, TestingModule } from '@nestjs/testing';
import { SecurityStudiesController } from './security-studies.controller';
import { SecurityStudiesService } from '../services/security-studies.service';

describe('SecurityStudiesController', () => {
  let controller: SecurityStudiesController;
  let service: any;

  beforeEach(async () => {
    service = {
      generateBaseMap: jest.fn().mockResolvedValue({ baseImageS3Key: 'base.jpg' }),
      create: jest.fn().mockResolvedValue({ id: 'study-1' }),
      findByClient: jest.fn().mockResolvedValue({ studies: [] }),
      findOne: jest.fn().mockResolvedValue({ id: 'study-1' }),
      update: jest.fn().mockResolvedValue({ id: 'study-1', name: 'Updated' }),
      updateCanvas: jest.fn().mockResolvedValue({ id: 'study-1' }),
      discontinue: jest.fn().mockResolvedValue({ id: 'study-1', status: 'DISCONTINUED' }),
      duplicate: jest.fn().mockResolvedValue({ id: 'study-copy' }),
      approvePerimeter: jest.fn().mockResolvedValue({ message: 'OK' }),
      uploadAttachment: jest.fn().mockResolvedValue({ file: {} }),
      getImageUrl: jest.fn().mockResolvedValue({ url: 'https://img.jpg' }),
      getClientGeofence: jest.fn().mockResolvedValue({ hasGeofence: true }),
      saveClientGeofence: jest.fn().mockResolvedValue({ id: 'c1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityStudiesController],
      providers: [{ provide: SecurityStudiesService, useValue: service }],
    }).compile();

    controller = module.get<SecurityStudiesController>(SecurityStudiesController);
  });

  it('should call generateBaseMap', async () => {
    const dto = { clientId: 'c1', lat: 4.7, lng: -74.0, zoom: 17 };
    await controller.generateBaseMap(dto as any);
    expect(service.generateBaseMap).toHaveBeenCalledWith(dto);
  });

  it('should call create', async () => {
    const dto = { clientId: 'c1', name: 'Estudio 1' } as any;
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should call findByClient', async () => {
    await controller.findByClient('c1');
    expect(service.findByClient).toHaveBeenCalledWith('c1');
  });

  it('should call getClientGeofence', async () => {
    await controller.getClientGeofence('c1');
    expect(service.getClientGeofence).toHaveBeenCalledWith('c1');
  });

  it('should call saveClientGeofence', async () => {
    const dto = { geofence: { type: 'Polygon', coordinates: [] } };
    await controller.saveClientGeofence('c1', dto);
    expect(service.saveClientGeofence).toHaveBeenCalledWith('c1', dto.geofence);
  });

  it('should call update', async () => {
    const dto = { name: 'Nuevo Nombre', description: 'Nueva Descripcion' };
    await controller.update('s1', dto);
    expect(service.update).toHaveBeenCalledWith('s1', dto);
  });

  it('should call updateCanvas', async () => {
    const dto = { canvasState: {} };
    await controller.updateCanvas('s1', dto);
    expect(service.updateCanvas).toHaveBeenCalledWith('s1', dto);
  });

  it('should call discontinue', async () => {
    const dto = { confirmation: 'acepto' };
    await controller.discontinue('s1', dto);
    expect(service.discontinue).toHaveBeenCalledWith('s1', dto);
  });

  it('should call duplicate', async () => {
    await controller.duplicate('s1');
    expect(service.duplicate).toHaveBeenCalledWith('s1');
  });

  it('should call approvePerimeter', async () => {
    const dto = { perimeterGeoJson: {} } as any;
    await controller.approvePerimeter('s1', dto);
    expect(service.approvePerimeter).toHaveBeenCalledWith('s1', dto);
  });
});

