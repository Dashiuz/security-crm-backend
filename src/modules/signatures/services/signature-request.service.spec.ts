import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { SignatureRequestService } from './signature-request.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SignatureAuditService } from './signature-audit.service';
import { SignatureGeneratorService } from './signature-generator.service';
import {
  SignatureStatus,
  SignatureDocumentType,
  SignatureCreationMode,
} from '@prisma/client';

describe('SignatureRequestService', () => {
  let service: SignatureRequestService;
  let prisma: any;
  let auditService: any;
  let generatorService: any;

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-1',
    document: '12345678',
    fullName: 'Juan Pérez',
    signatureUrl: 'data:image/png;base64,iVBORw...',
    signatureMethod: SignatureCreationMode.DRAW,
    signatureUpdatedAt: new Date(),
  };

  const mockRequest = {
    id: 'req-001',
    tenantId: 'tenant-1',
    documentType: SignatureDocumentType.SERVICE_ORDER,
    documentId: 'doc-999',
    documentTitle: 'Orden de Servicio OS-01',
    documentVersion: 1,
    draftSnapshot: { total: 1000000 },
    token: 'token-64-hex-value-1234567890abcdef',
    expiresAt: new Date(Date.now() + 15 * 86400000), // 15 days in future
    signerName: 'Carlos Gómez',
    signerEmail: 'carlos@cliente.com',
    signerDocument: '80123456',
    status: SignatureStatus.PENDING,
    originalDocHash: null,
    signedDocHash: null,
    createdAt: new Date(),
    tenant: {
      name: 'Vigilancia Continental',
      slug: 'continental',
      profile: { legalName: 'Vigilancia Continental SAS', taxId: '900123456-1' },
    },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      employee: {
        updateMany: jest.fn(),
      },
      signatureRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    auditService = {
      generateSecureToken: jest.fn().mockReturnValue('mocked-64-char-token'),
      calculateSha256: jest.fn().mockReturnValue('mocked-sha256-hash'),
      generateVerificationQr: jest.fn().mockResolvedValue(Buffer.from('qr-png')),
      formatLegalTimestamp: jest.fn().mockReturnValue({
        utc: '2026-10-21T00:00:00.000Z',
        cot: '21 de octubre de 2026',
        timestamp: Date.now(),
      }),
    };

    generatorService = {
      generateVectorDocument: jest.fn().mockResolvedValue(Buffer.from('base-pdf-buffer')),
      stampSignatureAndAudit: jest.fn().mockResolvedValue({
        signedPdfBuffer: Buffer.from('signed-pdf-buffer'),
        originalDocHash: 'hash-orig-123',
        signedDocHash: 'hash-signed-456',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: SignatureAuditService, useValue: auditService },
        { provide: SignatureGeneratorService, useValue: generatorService },
      ],
    }).compile();

    service = module.get<SignatureRequestService>(SignatureRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveUserSignature', () => {
    it('should save user signature and sync with employee', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        signatureUrl: 'data:image/png;base64,new-signature',
      });
      prisma.employee.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.saveUserSignature('user-123', 'tenant-1', {
        signatureDataUrl: 'data:image/png;base64,new-signature',
        method: SignatureCreationMode.DRAW,
      });

      expect(result.signatureUrl).toBe('data:image/png;base64,new-signature');
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.employee.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', document: mockUser.document },
        data: expect.objectContaining({ signatureUrl: 'data:image/png;base64,new-signature' }),
      });
    });

    it('should throw NotFoundException if user does not exist in tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.saveUserSignature('invalid-user', 'tenant-1', {
          signatureDataUrl: 'data:image/png;base64,...',
          method: SignatureCreationMode.TYPE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserSignature', () => {
    it('should return signature details for existing user', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getUserSignature('user-123', 'tenant-1');
      expect(result).toHaveProperty('signatureUrl');
      expect(result.fullName).toBe('Juan Pérez');
    });

    it('should throw NotFoundException if user is not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getUserSignature('user-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteUserSignature', () => {
    it('should clear signature fields for user', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-123',
        fullName: 'Juan Pérez',
        signatureUrl: null,
      });

      const result = await service.deleteUserSignature('user-123', 'tenant-1');
      expect(result.signatureUrl).toBeNull();
    });
  });

  describe('createRequest', () => {
    it('should revoke previous pending requests and create new request with 15-day TTL', async () => {
      prisma.signatureRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.signatureRequest.create.mockResolvedValue(mockRequest);

      const result = await service.createRequest('tenant-1', 'user-123', {
        documentType: SignatureDocumentType.SERVICE_ORDER,
        documentId: 'doc-999',
        documentTitle: 'Orden de Servicio OS-01',
        signerName: 'Carlos Gómez',
        signerEmail: 'carlos@cliente.com',
      });

      expect(prisma.signatureRequest.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          documentType: SignatureDocumentType.SERVICE_ORDER,
          documentId: 'doc-999',
          status: { in: [SignatureStatus.PENDING, SignatureStatus.VIEWED, SignatureStatus.DRAFT] },
        },
        data: expect.objectContaining({ status: SignatureStatus.REVOKED }),
      });

      expect(prisma.signatureRequest.create).toHaveBeenCalled();
      expect(result).toHaveProperty('signUrl');
      expect(result.signUrl).toContain('/sign/mocked-64-char-token');
    });
  });

  describe('getRequestById and revokeRequest', () => {
    it('should return request if found for tenant', async () => {
      prisma.signatureRequest.findFirst.mockResolvedValue(mockRequest);

      const result = await service.getRequestById('req-001', 'tenant-1');
      expect(result.id).toBe('req-001');
    });

    it('should throw NotFoundException if request is not found', async () => {
      prisma.signatureRequest.findFirst.mockResolvedValue(null);

      await expect(service.getRequestById('req-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should revoke request if not yet signed', async () => {
      prisma.signatureRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.signatureRequest.update.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.REVOKED,
      });

      const result = await service.revokeRequest('req-001', 'tenant-1');
      expect(result.status).toBe(SignatureStatus.REVOKED);
    });

    it('should throw BadRequestException when trying to revoke an already signed document', async () => {
      prisma.signatureRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.SIGNED,
      });

      await expect(service.revokeRequest('req-001', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPublicRequestByToken', () => {
    it('should transition PENDING to VIEWED on first access', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.PENDING,
      });
      prisma.signatureRequest.update.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.VIEWED,
      });

      const result = await service.getPublicRequestByToken(
        'valid-token',
        '190.1.2.3',
        'Test-Browser',
      );

      expect(prisma.signatureRequest.update).toHaveBeenCalledWith({
        where: { id: mockRequest.id },
        data: expect.objectContaining({ status: SignatureStatus.VIEWED }),
      });
      expect(result.status).toBe(SignatureStatus.VIEWED);
    });

    it('should throw NotFoundException if token is invalid', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue(null);

      await expect(service.getPublicRequestByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if request was revoked', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.REVOKED,
      });

      await expect(service.getPublicRequestByToken('revoked-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw GoneException if request is expired', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        expiresAt: new Date(Date.now() - 10000), // Past
      });
      prisma.signatureRequest.update.mockResolvedValue({});

      await expect(service.getPublicRequestByToken('expired-token')).rejects.toThrow(
        GoneException,
      );
    });
  });

  describe('submitPublicSignature', () => {
    const validDto = {
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo...',
      method: SignatureCreationMode.DRAW,
      acceptedTerms: true,
    };

    it('should throw BadRequestException if terms are not accepted', async () => {
      await expect(
        service.submitPublicSignature('token', { ...validDto, acceptedTerms: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if document is already SIGNED', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.SIGNED,
      });

      await expect(service.submitPublicSignature('token', validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully stamp signature and update status to SIGNED', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.VIEWED,
      });
      prisma.signatureRequest.update.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.SIGNED,
        signedAt: new Date(),
      });

      const result = await service.submitPublicSignature('token', validDto, '1.2.3.4', 'UA');

      expect(generatorService.generateVectorDocument).toHaveBeenCalled();
      expect(generatorService.stampSignatureAndAudit).toHaveBeenCalled();
      expect(prisma.signatureRequest.update).toHaveBeenCalledWith({
        where: { id: mockRequest.id },
        data: expect.objectContaining({
          status: SignatureStatus.SIGNED,
          signedDocHash: 'hash-signed-456',
        }),
      });
      expect(result.success).toBe(true);
      expect(result.signedDocHash).toBe('hash-signed-456');
    });
  });

  describe('verifyPublicDocument', () => {
    it('should return verification details for signed authentic document', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: SignatureStatus.SIGNED,
        signedDocHash: 'hash-abc',
        originalDocHash: 'hash-orig',
        signedAt: new Date(),
      });

      const result = await service.verifyPublicDocument('req-001');

      expect(result.isAuthentic).toBe(true);
      expect(result.signedDocHash).toBe('hash-abc');
      expect(result.tenantName).toBe('Vigilancia Continental SAS');
    });

    it('should throw NotFoundException if document id is not found', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue(null);

      await expect(service.verifyPublicDocument('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
