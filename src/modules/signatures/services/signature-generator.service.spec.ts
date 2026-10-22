import { Test, TestingModule } from '@nestjs/testing';
import { SignatureGeneratorService } from './signature-generator.service';
import { SignatureAuditService } from './signature-audit.service';
import { PDFDocument } from 'pdf-lib';

describe('SignatureGeneratorService', () => {
  let service: SignatureGeneratorService;
  let auditService: SignatureAuditService;

  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureGeneratorService, SignatureAuditService],
    }).compile();

    service = module.get<SignatureGeneratorService>(SignatureGeneratorService);
    auditService = module.get<SignatureAuditService>(SignatureAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateVectorDocument', () => {
    it('should generate a valid vector PDF buffer with title and content', async () => {
      const title = 'Cotización Comercial COT-2026-001';
      const lines = [
        'Cliente: Seguridad Andina SAS',
        'Puestos de Vigilancia: 4 Turnos 24/7',
        'Valor Total: $12.500.000 COP',
      ];

      const pdfBuffer = await service.generateVectorDocument(title, lines);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(500);

      // Verify it is a valid PDF
      const loadedDoc = await PDFDocument.load(pdfBuffer);
      expect(loadedDoc.getPageCount()).toBe(1);
    });
  });

  describe('stampSignatureAndAudit', () => {
    it('should stamp signature and append audit certificate with QR code', async () => {
      // Create initial base PDF
      const basePdfBuffer = await service.generateVectorDocument('Orden de Servicio OS-01', [
        'Detalle del servicio contratado',
      ]);

      const result = await service.stampSignatureAndAudit({
        basePdfBuffer,
        signaturePngBuffer: validPngBuffer,
        signerName: 'Andrés Camilo Rojas',
        signerEmail: 'andres.rojas@empresa.com',
        signerDocument: '1098765432',
        signerRole: 'Gerente General',
        signerIp: '190.144.20.10',
        signerUa: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        verifyUrl: 'https://crm.noxia.com/verify/test-req-123',
        tenantName: 'Vigilancia Continental Ltda',
        tenantNit: '900.123.456-7',
        documentTitle: 'Orden de Servicio OS-01',
      });

      expect(result).toHaveProperty('signedPdfBuffer');
      expect(result).toHaveProperty('originalDocHash');
      expect(result).toHaveProperty('signedDocHash');

      expect(result.originalDocHash).toHaveLength(64);
      expect(result.signedDocHash).toHaveLength(64);
      expect(result.originalDocHash).not.toBe(result.signedDocHash);

      // Verify resulting PDF has the original page + the appended audit page
      const signedDoc = await PDFDocument.load(result.signedPdfBuffer);
      expect(signedDoc.getPageCount()).toBe(2);
    });

    it('should throw an error if the signature image buffer is completely invalid', async () => {
      const basePdfBuffer = await service.generateVectorDocument('Test Document');
      const invalidImageBuffer = Buffer.from('NOT-AN-IMAGE');

      await expect(
        service.stampSignatureAndAudit({
          basePdfBuffer,
          signaturePngBuffer: invalidImageBuffer,
          signerName: 'Test Signer',
          signerEmail: 'test@email.com',
          verifyUrl: 'https://crm.noxia.com/verify/test',
          tenantName: 'Tenant',
          documentTitle: 'Test Doc',
        }),
      ).rejects.toThrow();
    });
  });
});
