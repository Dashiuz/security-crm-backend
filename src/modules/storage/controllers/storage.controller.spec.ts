import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from '../services/storage.service';
import { MediaTypeCategory } from '../dtos/upload-media.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';

describe('StorageController', () => {
  let controller: StorageController;
  let service: jest.Mocked<Partial<StorageService>>;

  const mockUser = {
    sub: 'user-sub-1',
    tenantId: 'tenant-1',
  };
  const mockReq = { user: mockUser };

  beforeEach(async () => {
    service = {
      uploadMedia: jest.fn(),
      getPresignedUrl: jest.fn(),
      findByEntity: jest.fn(),
      deleteMedia: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StorageController>(StorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should delegate upload to storageService.uploadMedia', async () => {
      const file = {
        originalname: 'doc.pdf',
        size: 2048,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const dto = {
        entityType: MediaTypeCategory.MINUTA,
        entityId: 'min-1',
      };

      const expectedResponse = {
        id: 'media-1',
        url: 'https://s3.com/doc.pdf',
      } as any;
      (service.uploadMedia as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.uploadFile(mockReq, file, dto);
      expect(service.uploadMedia).toHaveBeenCalledWith(
        file,
        dto,
        'user-sub-1',
        'tenant-1',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should fallback to req.user.userId when sub is absent', async () => {
      const file = { originalname: 'avatar.png' } as Express.Multer.File;
      const dto = {
        entityType: MediaTypeCategory.EMPLOYEE,
        entityId: 'emp-1',
      };
      const reqWithoutSub = {
        user: { userId: 'fallback-user-id', tenantId: 'tenant-1' },
      };

      await controller.uploadFile(reqWithoutSub, file, dto);
      expect(service.uploadMedia).toHaveBeenCalledWith(
        file,
        dto,
        'fallback-user-id',
        'tenant-1',
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should delegate getPresignedUrl to service', async () => {
      const expectedUrl = {
        presignedUrl: 'https://presigned.com/file.jpg',
      } as any;
      (service.getPresignedUrl as jest.Mock).mockResolvedValue(expectedUrl);

      const result = await controller.getPresignedUrl(mockReq, 'med-1');
      expect(service.getPresignedUrl).toHaveBeenCalledWith('med-1', 'tenant-1');
      expect(result).toEqual(expectedUrl);
    });
  });

  describe('findByEntity', () => {
    it('should delegate findByEntity to service', async () => {
      const expectedItems = [{ id: 'med-1' }] as any;
      (service.findByEntity as jest.Mock).mockResolvedValue(expectedItems);

      const result = await controller.findByEntity(
        mockReq,
        MediaTypeCategory.MINUTA,
        'min-100',
      );
      expect(service.findByEntity).toHaveBeenCalledWith(
        MediaTypeCategory.MINUTA,
        'min-100',
        'tenant-1',
      );
      expect(result).toEqual(expectedItems);
    });
  });

  describe('deleteMedia', () => {
    it('should delegate deleteMedia to service', async () => {
      const expectedResult = { id: 'med-1', deleted: true } as any;
      (service.deleteMedia as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.deleteMedia(mockReq, 'med-1');
      expect(service.deleteMedia).toHaveBeenCalledWith('med-1', 'tenant-1');
      expect(result).toEqual(expectedResult);
    });
  });
});
