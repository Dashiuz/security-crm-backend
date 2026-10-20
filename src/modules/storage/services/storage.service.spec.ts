import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { S3Service } from './s3.service';
import { MediaTypeCategory } from '../dtos/upload-media.dto';

describe('StorageService', () => {
  let service: StorageService;
  let mockPrisma: any;
  let mockS3Service: jest.Mocked<Partial<S3Service>>;

  beforeEach(() => {
    mockPrisma = {
      mediaAttachment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockS3Service = {
      generateS3Key: jest.fn().mockReturnValue('tenants/t-1/test.jpg'),
      uploadFile: jest.fn().mockResolvedValue({
        url: 'https://s3.amazonaws.com/test.jpg',
        s3Key: 'tenants/t-1/test.jpg',
        sizeBytes: 1024,
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
      }),
      getPresignedUrl: jest
        .fn()
        .mockResolvedValue('https://presigned-url.com/test.jpg'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    service = new StorageService(
      mockPrisma as unknown as PrismaService,
      mockS3Service as unknown as S3Service,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadMedia', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('data'),
    } as Express.Multer.File;

    it('should throw BadRequestException if file is missing', async () => {
      await expect(
        service.uploadMedia(
          null as any,
          { entityType: MediaTypeCategory.MINUTA, entityId: 'min-1' },
          'user-1',
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload media and attach to MINUTA', async () => {
      const dto = {
        entityType: MediaTypeCategory.MINUTA,
        entityId: 'min-1',
        clientId: 'client-1',
      };

      const createdMedia = {
        id: 'media-1',
        s3Key: 'tenants/t-1/test.jpg',
        url: 'https://s3.amazonaws.com/test.jpg',
      };
      mockPrisma.mediaAttachment.create.mockResolvedValue(createdMedia);

      const result = await service.uploadMedia(
        mockFile,
        dto,
        'user-1',
        'tenant-1',
      );

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'tenants/t-1/test.jpg',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant: { connect: { id: 'tenant-1' } },
          client: { connect: { id: 'client-1' } },
          minuta: { connect: { id: 'min-1' } },
          uploadedById: 'user-1',
        }),
      });
      expect(result.presignedUrl).toBe('https://presigned-url.com/test.jpg');
    });

    it('should handle VISITOR, CORRESPONDENCE, PARKING, and EMPLOYEE attachments', async () => {
      mockPrisma.mediaAttachment.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'med-id', ...data }),
      );

      // VISITOR
      await service.uploadMedia(
        mockFile,
        { entityType: MediaTypeCategory.VISITOR, entityId: 'vis-1' },
        'user-1',
        'tenant-1',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visitorEntry: { connect: { id: 'vis-1' } },
          }),
        }),
      );

      // CORRESPONDENCE
      await service.uploadMedia(
        mockFile,
        { entityType: MediaTypeCategory.CORRESPONDENCE, entityId: 'corr-1' },
        'user-1',
        'tenant-1',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            correspondence: { connect: { id: 'corr-1' } },
          }),
        }),
      );

      // PARKING
      await service.uploadMedia(
        mockFile,
        { entityType: MediaTypeCategory.PARKING, entityId: 'park-1' },
        'user-1',
        'tenant-1',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parkingVehicle: { connect: { id: 'park-1' } },
          }),
        }),
      );

      // EMPLOYEE
      await service.uploadMedia(
        mockFile,
        { entityType: MediaTypeCategory.EMPLOYEE, entityId: 'emp-1' },
        'user-1',
        'tenant-1',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employee: { connect: { id: 'emp-1' } },
          }),
        }),
      );
    });

    it('should handle CLIENT entity and PQRS entity attachments', async () => {
      mockPrisma.mediaAttachment.create.mockResolvedValue({ id: 'm-1' });

      // CLIENT
      await service.uploadMedia(
        mockFile,
        { entityType: MediaTypeCategory.CLIENT, entityId: 'cl-1' },
        'user-1',
        'tenant-1',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            client: { connect: { id: 'cl-1' } },
          }),
        }),
      );

      // PQRS ticket
      await service.uploadMedia(
        mockFile,
        { entityType: MediaTypeCategory.PQRS, entityId: 'ticket-1' },
        'user-1',
        'tenant-1',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pqrsTicket: { connect: { id: 'ticket-1' } },
          }),
        }),
      );

      // PQRS message
      await service.uploadMedia(
        mockFile,
        {
          entityType: MediaTypeCategory.PQRS,
          entityId: 'msg-1',
          subType: 'message',
        },
        'user-1',
        'tenant-1',
      );
      expect(mockPrisma.mediaAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pqrsMessage: { connect: { id: 'msg-1' } },
          }),
        }),
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should return presigned URL for found media attachment', async () => {
      mockPrisma.mediaAttachment.findFirst.mockResolvedValue({
        id: 'med-1',
        tenantId: 'tenant-1',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        s3Key: 'tenants/tenant-1/doc.pdf',
        createdAt: new Date(),
      });

      const result = await service.getPresignedUrl('med-1', 'tenant-1');
      expect(result.id).toBe('med-1');
      expect(result.presignedUrl).toBe('https://presigned-url.com/test.jpg');
    });

    it('should throw NotFoundException if media attachment not found', async () => {
      mockPrisma.mediaAttachment.findFirst.mockResolvedValue(null);

      await expect(
        service.getPresignedUrl('non-existent', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEntity', () => {
    it('should query attachments by entity and generate presigned URLs', async () => {
      mockPrisma.mediaAttachment.findMany.mockResolvedValue([
        { id: 'med-1', s3Key: 'key-1' },
        { id: 'med-2', s3Key: 'key-2' },
      ]);

      const result = await service.findByEntity(
        MediaTypeCategory.MINUTA,
        'min-100',
        'tenant-1',
      );

      expect(mockPrisma.mediaAttachment.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', minutaId: 'min-100' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].presignedUrl).toBe('https://presigned-url.com/test.jpg');
    });

    it('should map query filters for VISITOR, CORRESPONDENCE, PARKING, EMPLOYEE, CLIENT, and PQRS', async () => {
      mockPrisma.mediaAttachment.findMany.mockResolvedValue([]);

      await service.findByEntity(MediaTypeCategory.VISITOR, 'vis-1', 't-1');
      expect(mockPrisma.mediaAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', visitorEntryId: 'vis-1' },
        }),
      );

      await service.findByEntity(
        MediaTypeCategory.CORRESPONDENCE,
        'corr-1',
        't-1',
      );
      expect(mockPrisma.mediaAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', correspondenceId: 'corr-1' },
        }),
      );

      await service.findByEntity(MediaTypeCategory.PARKING, 'park-1', 't-1');
      expect(mockPrisma.mediaAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', parkingVehicleId: 'park-1' },
        }),
      );

      await service.findByEntity(MediaTypeCategory.EMPLOYEE, 'emp-1', 't-1');
      expect(mockPrisma.mediaAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', employeeId: 'emp-1' },
        }),
      );

      await service.findByEntity(MediaTypeCategory.CLIENT, 'cl-1', 't-1');
      expect(mockPrisma.mediaAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', clientId: 'cl-1' },
        }),
      );

      await service.findByEntity(MediaTypeCategory.PQRS, 'pqr-1', 't-1');
      expect(mockPrisma.mediaAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', pqrsTicketId: 'pqr-1' },
        }),
      );
    });
  });

  describe('deleteMedia', () => {
    it('should delete S3 file and database attachment', async () => {
      mockPrisma.mediaAttachment.findFirst.mockResolvedValue({
        id: 'med-1',
        s3Key: 'tenants/t-1/test.jpg',
      });
      mockPrisma.mediaAttachment.delete.mockResolvedValue({ id: 'med-1' });

      const result = await service.deleteMedia('med-1', 'tenant-1');
      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(
        'tenants/t-1/test.jpg',
      );
      expect(mockPrisma.mediaAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'med-1' },
      });
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException if media does not exist', async () => {
      mockPrisma.mediaAttachment.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMedia('non-existent', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
