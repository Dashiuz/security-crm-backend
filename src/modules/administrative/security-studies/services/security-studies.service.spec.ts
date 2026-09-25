import { Test, TestingModule } from '@nestjs/testing';
import { SecurityStudiesService } from './security-studies.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { S3Service } from '../../../storage/services/s3.service';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from '../../../../common/context/request-context.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SecurityStudiesService', () => {
  let service: SecurityStudiesService;
  let prisma: any;
  let s3Service: any;
  let configService: any;
  let contextService: any;

  const mockTenantId = 'tenant-123';
  const mockClientId = 'client-456';
  const mockStudyId = 'study-789';

  beforeEach(async () => {
    prisma = {
      client: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      securityStudy: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $executeRawUnsafe: jest.fn(),
    };

    s3Service = {
      generateS3Key: jest.fn().mockReturnValue('tenants/tenant-123/clients/client-456/studies/test.jpg'),
      uploadBuffer: jest.fn().mockResolvedValue({ s3Key: 'test.jpg' }),
      uploadFile: jest.fn().mockResolvedValue({ s3Key: 'doc.pdf' }),
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MAPBOX_ACCESS_TOKEN') return 'mock-pk-token';
        return null;
      }),
    };

    contextService = {
      tenantId: mockTenantId,
      userId: 'user-001',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityStudiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3Service },
        { provide: ConfigService, useValue: configService },
        { provide: RequestContextService, useValue: contextService },
      ],
    }).compile();

    service = module.get<SecurityStudiesService>(SecurityStudiesService);
  });

  describe('create', () => {
    it('should create a new study, archive previous CURRENT studies, and increment version', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: mockClientId, name: 'Conjunto Test' });
      prisma.securityStudy.findFirst.mockResolvedValue({ id: 'old-study', version: 2 });
      prisma.securityStudy.updateMany.mockResolvedValue({ count: 1 });
      prisma.securityStudy.create.mockResolvedValue({
        id: mockStudyId,
        clientId: mockClientId,
        status: 'CURRENT',
        version: 3,
        baseImageS3Key: 'some-key.jpg',
      });

      const res = await service.create({
        clientId: mockClientId,
        name: 'Estudio Fase 3',
        baseImageS3Key: 'some-key.jpg',
        mapboxCenterLat: 4.71,
        mapboxCenterLng: -74.07,
        mapboxZoom: 17,
        mapboxBboxMinLat: 4.70,
        mapboxBboxMinLng: -74.08,
        mapboxBboxMaxLat: 4.72,
        mapboxBboxMaxLng: -74.06,
      });

      expect(prisma.securityStudy.updateMany).toHaveBeenCalledWith({
        where: { clientId: mockClientId, status: 'CURRENT' },
        data: { status: 'DISCONTINUED' },
      });
      expect(prisma.securityStudy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 3,
            status: 'CURRENT',
          }),
        }),
      );
      expect(res.baseImageUrl).toBe('https://s3.example.com/signed-url');
    });

    it('should throw NotFoundException if client does not exist', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          clientId: 'non-existent',
          name: 'Test',
          baseImageS3Key: 'key',
          mapboxCenterLat: 0,
          mapboxCenterLng: 0,
          mapboxZoom: 15,
          mapboxBboxMinLat: 0,
          mapboxBboxMinLng: 0,
          mapboxBboxMaxLat: 0,
          mapboxBboxMaxLng: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCanvas', () => {
    it('should update canvasState for an active CURRENT study', async () => {
      prisma.securityStudy.findFirst.mockResolvedValue({
        id: mockStudyId,
        status: 'CURRENT',
      });
      prisma.securityStudy.update.mockResolvedValue({
        id: mockStudyId,
        canvasState: { layers: [] },
      });

      const res = await service.updateCanvas(mockStudyId, {
        canvasState: { layers: [] },
      });

      expect(prisma.securityStudy.update).toHaveBeenCalledWith({
        where: { id: mockStudyId },
        data: { canvasState: { layers: [] } },
      });
      expect(res.canvasState).toEqual({ layers: [] });
    });

    it('should throw BadRequestException when updating a DISCONTINUED study', async () => {
      prisma.securityStudy.findFirst.mockResolvedValue({
        id: mockStudyId,
        status: 'DISCONTINUED',
      });

      await expect(
        service.updateCanvas(mockStudyId, { canvasState: {} }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update name and description for an existing study', async () => {
      prisma.securityStudy.findFirst.mockResolvedValue({
        id: mockStudyId,
        name: 'Old Name',
        description: 'Old Desc',
        baseImageS3Key: 'base.jpg',
      });
      prisma.securityStudy.update.mockResolvedValue({
        id: mockStudyId,
        name: 'New Name',
        description: 'New Desc',
        baseImageS3Key: 'base.jpg',
      });
      s3Service.getPresignedUrl.mockResolvedValue('https://s3.example.com/base.jpg');

      const res = await service.update(mockStudyId, {
        name: 'New Name',
        description: 'New Desc',
      });

      expect(prisma.securityStudy.update).toHaveBeenCalledWith({
        where: { id: mockStudyId },
        data: { name: 'New Name', description: 'New Desc' },
        include: { createdBy: { select: { id: true, fullName: true, document: true } } },
      });
      expect(res.name).toBe('New Name');
      expect(res.baseImageUrl).toBe('https://s3.example.com/base.jpg');
    });

    it('should throw BadRequestException if name is empty', async () => {
      prisma.securityStudy.findFirst.mockResolvedValue({
        id: mockStudyId,
        name: 'Old Name',
      });

      await expect(
        service.update(mockStudyId, { name: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if study does not exist', async () => {
      prisma.securityStudy.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('discontinue', () => {
    it('should set study status to DISCONTINUED when confirmation is "acepto"', async () => {
      prisma.securityStudy.findFirst.mockResolvedValue({
        id: mockStudyId,
        status: 'CURRENT',
      });
      prisma.securityStudy.update.mockResolvedValue({
        id: mockStudyId,
        status: 'DISCONTINUED',
      });

      const res = await service.discontinue(mockStudyId, {
        confirmation: 'acepto',
      });

      expect(res.status).toBe('DISCONTINUED');
      expect(prisma.securityStudy.update).toHaveBeenCalledWith({
        where: { id: mockStudyId },
        data: { status: 'DISCONTINUED' },
      });
    });

    it('should throw BadRequestException if confirmation is not "acepto"', async () => {
      await expect(
        service.discontinue(mockStudyId, { confirmation: 'si' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('duplicate', () => {
    it('should reject duplication if an active CURRENT study already exists', async () => {
      prisma.securityStudy.findFirst
        .mockResolvedValueOnce({ id: mockStudyId, clientId: mockClientId, status: 'DISCONTINUED' })
        .mockResolvedValueOnce({ id: 'active-study', status: 'CURRENT' });

      await expect(service.duplicate(mockStudyId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should duplicate study when no CURRENT study exists', async () => {
      prisma.securityStudy.findFirst
        .mockResolvedValueOnce({
          id: mockStudyId,
          clientId: mockClientId,
          name: 'Original',
          baseImageS3Key: 'img.jpg',
          version: 1,
          canvasState: {},
          tenantId: mockTenantId,
        })
        .mockResolvedValueOnce(null) // no current active study
        .mockResolvedValueOnce({ version: 1 }); // latest version

      prisma.securityStudy.create.mockResolvedValue({
        id: 'new-copy-id',
        name: 'Original (Copia v2)',
        version: 2,
        status: 'CURRENT',
        baseImageS3Key: 'img.jpg',
      });

      const res = await service.duplicate(mockStudyId);

      expect(res.name).toBe('Original (Copia v2)');
      expect(res.version).toBe(2);
      expect(res.status).toBe('CURRENT');
    });
  });

  describe('approvePerimeter', () => {
    it('should update client SSOT geofence and execute PostGIS query', async () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-74.07, 4.71],
            [-74.06, 4.71],
            [-74.06, 4.72],
            [-74.07, 4.71],
          ],
        ],
      };

      prisma.securityStudy.findFirst.mockResolvedValue({
        id: mockStudyId,
        clientId: mockClientId,
        canvasState: { geofencePolygon: polygon },
      });

      prisma.client.update.mockResolvedValue({ id: mockClientId });
      prisma.$executeRawUnsafe.mockResolvedValue(1);

      const res = await service.approvePerimeter(mockStudyId, {
        perimeterGeoJson: polygon,
      });

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: mockClientId },
        data: { geofence: polygon },
      });
      expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
      expect(res.geofence).toEqual(polygon);
    });
  });
});
