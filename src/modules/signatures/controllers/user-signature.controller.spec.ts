import { Test, TestingModule } from '@nestjs/testing';
import { UserSignatureController } from './user-signature.controller';
import { SignatureRequestService } from '../services/signature-request.service';
import { SignatureCreationMode } from '@prisma/client';

describe('UserSignatureController', () => {
  let controller: UserSignatureController;
  let service: any;

  const mockReq = {
    user: {
      sub: 'user-123',
      tenantId: 'tenant-1',
    },
  };

  beforeEach(async () => {
    service = {
      getUserSignature: jest.fn().mockResolvedValue({
        id: 'user-123',
        fullName: 'Test User',
        signatureUrl: 'data:image/png;base64,...',
      }),
      saveUserSignature: jest.fn().mockResolvedValue({
        id: 'user-123',
        signatureUrl: 'data:image/png;base64,...',
      }),
      deleteUserSignature: jest.fn().mockResolvedValue({
        id: 'user-123',
        signatureUrl: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSignatureController],
      providers: [{ provide: SignatureRequestService, useValue: service }],
    }).compile();

    controller = module.get<UserSignatureController>(UserSignatureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get current user signature', async () => {
    const result = await controller.getMySignature(mockReq);
    expect(service.getUserSignature).toHaveBeenCalledWith('user-123', 'tenant-1');
    expect(result).toHaveProperty('signatureUrl');
  });

  it('should save user signature', async () => {
    const dto = {
      signatureDataUrl: 'data:image/png;base64,abc',
      method: SignatureCreationMode.DRAW,
    };
    const result = await controller.saveMySignature(mockReq, dto);
    expect(service.saveUserSignature).toHaveBeenCalledWith('user-123', 'tenant-1', dto);
    expect(result).toHaveProperty('signatureUrl');
  });

  it('should delete user signature', async () => {
    const result = await controller.deleteMySignature(mockReq);
    expect(service.deleteUserSignature).toHaveBeenCalledWith('user-123', 'tenant-1');
    expect(result.signatureUrl).toBeNull();
  });
});
