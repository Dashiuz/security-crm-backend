import { Test, TestingModule } from '@nestjs/testing';
import { PublicSignatureController } from './public-signature.controller';
import { SignatureRequestService } from '../services/signature-request.service';
import { SignatureCreationMode, SignatureStatus } from '@prisma/client';

describe('PublicSignatureController', () => {
  let controller: PublicSignatureController;
  let service: any;

  const mockReq = {
    headers: {
      'x-forwarded-for': '181.50.10.2, 10.0.0.1',
      'user-agent': 'Chrome/120.0',
    },
    ip: '181.50.10.2',
  };

  beforeEach(async () => {
    service = {
      getPublicRequestByToken: jest.fn().mockResolvedValue({
        id: 'req-001',
        documentTitle: 'Orden de Servicio',
        status: SignatureStatus.VIEWED,
      }),
      submitPublicSignature: jest.fn().mockResolvedValue({
        success: true,
        status: SignatureStatus.SIGNED,
        signedDocHash: 'hash-123',
      }),
      verifyPublicDocument: jest.fn().mockResolvedValue({
        id: 'req-001',
        isAuthentic: true,
        signedDocHash: 'hash-123',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSignatureController],
      providers: [{ provide: SignatureRequestService, useValue: service }],
    }).compile();

    controller = module.get<PublicSignatureController>(PublicSignatureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get public document by token extracting client IP and UA', async () => {
    const result = await controller.getPublicDocument('test-token', mockReq);
    expect(service.getPublicRequestByToken).toHaveBeenCalledWith(
      'test-token',
      '181.50.10.2',
      'Chrome/120.0',
    );
    expect(result.status).toBe(SignatureStatus.VIEWED);
  });

  it('should submit public signature', async () => {
    const dto = {
      signatureDataUrl: 'data:image/png;base64,data',
      method: SignatureCreationMode.DRAW,
      acceptedTerms: true,
    };

    const result = await controller.submitSignature('test-token', dto, mockReq);
    expect(service.submitPublicSignature).toHaveBeenCalledWith(
      'test-token',
      dto,
      '181.50.10.2',
      'Chrome/120.0',
    );
    expect(result.success).toBe(true);
  });

  it('should verify document by id', async () => {
    const result = await controller.verifyDocument('req-001');
    expect(service.verifyPublicDocument).toHaveBeenCalledWith('req-001');
    expect(result.isAuthentic).toBe(true);
  });
});
