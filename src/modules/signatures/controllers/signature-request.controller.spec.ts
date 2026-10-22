import { Test, TestingModule } from '@nestjs/testing';
import { SignatureRequestController } from './signature-request.controller';
import { SignatureRequestService } from '../services/signature-request.service';
import { SignatureDocumentType, SignatureStatus } from '@prisma/client';

describe('SignatureRequestController', () => {
  let controller: SignatureRequestController;
  let service: any;

  const mockReq = {
    user: {
      sub: 'user-123',
      tenantId: 'tenant-1',
    },
  };

  beforeEach(async () => {
    service = {
      createRequest: jest.fn().mockResolvedValue({
        id: 'req-001',
        status: SignatureStatus.PENDING,
        signUrl: 'http://localhost:3000/sign/token',
      }),
      getRequestById: jest.fn().mockResolvedValue({
        id: 'req-001',
        documentTitle: 'Test Document',
      }),
      revokeRequest: jest.fn().mockResolvedValue({
        id: 'req-001',
        status: SignatureStatus.REVOKED,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignatureRequestController],
      providers: [{ provide: SignatureRequestService, useValue: service }],
    }).compile();

    controller = module.get<SignatureRequestController>(
      SignatureRequestController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create signature request', async () => {
    const dto = {
      documentType: SignatureDocumentType.SERVICE_ORDER,
      documentId: 'doc-123',
      documentTitle: 'Orden de Servicio',
      signerName: 'Test Signer',
      signerEmail: 'signer@test.com',
    };

    const result = await controller.create(mockReq, dto);
    expect(service.createRequest).toHaveBeenCalledWith(
      'tenant-1',
      'user-123',
      dto,
    );
    expect(result).toHaveProperty('signUrl');
  });

  it('should get request by id', async () => {
    const result = await controller.getById(mockReq, 'req-001');
    expect(service.getRequestById).toHaveBeenCalledWith('req-001', 'tenant-1');
    expect(result.id).toBe('req-001');
  });

  it('should revoke request', async () => {
    const result = await controller.revoke(mockReq, 'req-001');
    expect(service.revokeRequest).toHaveBeenCalledWith('req-001', 'tenant-1');
    expect(result.status).toBe(SignatureStatus.REVOKED);
  });
});
