import { S3Service } from './s3.service';
import { ConfigService } from '@nestjs/config';
import { MediaTypeCategory } from '../dtos/upload-media.dto';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
    PutObjectCommand: jest.fn().mockImplementation((args) => args),
    DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
    GetObjectCommand: jest.fn().mockImplementation((args) => args),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: jest
      .fn()
      .mockResolvedValue('https://mock-presigned-url.com/asset.jpg'),
  };
});

describe('S3Service', () => {
  let service: S3Service;
  let mockConfig: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'AWS_REGION') return 'us-east-1';
        if (key === 'AWS_S3_BUCKET_NAME') return 'test-bucket';
        if (key === 'AWS_ACCESS_KEY_ID') return 'mock-key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'mock-secret';
        return undefined;
      }),
    };

    service = new S3Service(mockConfig as unknown as ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateS3Key', () => {
    it('should generate structured key for MINUTA with clientId', () => {
      const key = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.MINUTA,
        entityId: 'minuta-100',
        clientId: 'client-1',
        fileName: 'report file.pdf',
      });

      expect(key).toMatch(
        /^tenants\/tenant-1\/clients\/client-1\/minutas\/general\/minuta-100\/[a-f0-9]{8}-report_file\.pdf$/,
      );
    });

    it('should generate structured key for VISITOR without clientId', () => {
      const key = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.VISITOR,
        entityId: 'vis-1',
        fileName: 'id_card.png',
      });

      expect(key).toMatch(
        /^tenants\/tenant-1\/minutas\/visitor\/vis-1\/[a-f0-9]{8}-id_card\.png$/,
      );
    });

    it('should generate structured key for CORRESPONDENCE and PARKING', () => {
      const corrKey = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.CORRESPONDENCE,
        entityId: 'corr-1',
        fileName: 'package.jpg',
      });
      expect(corrKey).toContain('minutas/correspondence/corr-1');

      const parkingKey = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.PARKING,
        entityId: 'park-1',
        fileName: 'car.jpg',
      });
      expect(parkingKey).toContain('minutas/parking/park-1');
    });

    it('should generate structured key for EMPLOYEE (avatar)', () => {
      const key = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.EMPLOYEE,
        entityId: 'emp-1',
        fileName: 'avatar.jpg',
      });

      expect(key).toMatch(
        /^tenants\/tenant-1\/employees\/emp-1\/avatar\/.*avatar\.jpg$/,
      );
    });

    it('should generate structured key for CLIENT (documents)', () => {
      const key = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.CLIENT,
        entityId: 'client-1',
        fileName: 'rut.pdf',
      });

      expect(key).toMatch(
        /^tenants\/tenant-1\/clients\/client-1\/documents\/.*rut\.pdf$/,
      );
    });

    it('should generate structured key for INVENTORY', () => {
      const key = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.INVENTORY,
        entityId: 'inv-1',
        fileName: 'radio.jpg',
      });

      expect(key).toMatch(
        /^tenants\/tenant-1\/inventories\/inv-1\/.*radio\.jpg$/,
      );
    });

    it('should generate structured key for SECURITY_STUDY with clientId and without', () => {
      const keyWithClient = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.SECURITY_STUDY,
        entityId: 'study-1',
        clientId: 'client-1',
        fileName: 'map.geojson',
      });
      expect(keyWithClient).toContain('clients/client-1/studies/');

      const keyWithoutClient = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.SECURITY_STUDY,
        entityId: 'study-1',
        fileName: 'map.geojson',
      });
      expect(keyWithoutClient).toContain('studies/study-1/');
    });

    it('should generate structured key for PQRS with clientId and without', () => {
      const keyWithClient = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.PQRS,
        entityId: 'pqr-1',
        clientId: 'client-1',
        fileName: 'ticket.pdf',
      });
      expect(keyWithClient).toContain('clients/client-1/pqrs/pqr-1/');

      const keyWithoutClient = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: MediaTypeCategory.PQRS,
        entityId: 'pqr-1',
        fileName: 'ticket.pdf',
      });
      expect(keyWithoutClient).toContain('pqrs/pqr-1/');
    });

    it('should fallback to misc / category for unspecified entity types', () => {
      const key = service.generateS3Key({
        tenantId: 'tenant-1',
        entityType: 'OTHER' as any,
        entityId: 'other-1',
        category: 'contracts',
        fileName: 'doc.pdf',
      });

      expect(key).toMatch(
        /^tenants\/tenant-1\/documents\/contracts\/.*doc\.pdf$/,
      );
    });
  });

  describe('uploadBuffer', () => {
    it('should upload buffer and return metadata with directUrl', async () => {
      const buffer = Buffer.from('hello-world');
      const s3Key = 'tenants/t-1/test.txt';
      const result = await service.uploadBuffer(buffer, s3Key, 'text/plain');

      expect(result.s3Key).toBe(s3Key);
      expect(result.sizeBytes).toBe(buffer.length);
      expect(result.mimeType).toBe('text/plain');
      expect(result.url).toBe(
        'https://test-bucket.s3.us-east-1.amazonaws.com/tenants/t-1/test.txt',
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload multer file and return metadata', async () => {
      const file = {
        buffer: Buffer.from('binary-image'),
        mimetype: 'image/jpeg',
        size: 1234,
        originalname: 'photo.jpg',
      } as Express.Multer.File;

      const s3Key = 'tenants/t-1/photo.jpg';
      const result = await service.uploadFile(file, s3Key);

      expect(result.fileName).toBe('photo.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.sizeBytes).toBe(1234);
    });
  });

  describe('deleteFile', () => {
    it('should send delete command to S3', async () => {
      await expect(
        service.deleteFile('tenants/t-1/photo.jpg'),
      ).resolves.not.toThrow();
    });

    it('should rethrow error and log when deletion fails', async () => {
      const s3Client = (service as any).s3Client;
      jest
        .spyOn(s3Client, 'send')
        .mockRejectedValueOnce(new Error('S3 access denied'));

      await expect(service.deleteFile('tenants/t-1/photo.jpg')).rejects.toThrow(
        'S3 access denied',
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned url using getSignedUrl helper', async () => {
      const url = await service.getPresignedUrl('tenants/t-1/file.pdf', 300);
      expect(url).toBe('https://mock-presigned-url.com/asset.jpg');
    });
  });

  describe('getObjectStream', () => {
    it('should retrieve object stream, contentType, and contentLength', async () => {
      const mockStream = { pipe: jest.fn() };
      const s3Client = (service as any).s3Client;
      jest.spyOn(s3Client, 'send').mockResolvedValueOnce({
        Body: mockStream,
        ContentType: 'image/png',
        ContentLength: 5678,
      });

      const res = await service.getObjectStream('tenants/t-1/file.png');
      expect(res.stream).toBe(mockStream);
      expect(res.contentType).toBe('image/png');
      expect(res.contentLength).toBe(5678);
    });
  });
});
