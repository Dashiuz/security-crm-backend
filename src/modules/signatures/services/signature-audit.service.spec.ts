import { Test, TestingModule } from '@nestjs/testing';
import { SignatureAuditService } from './signature-audit.service';

describe('SignatureAuditService', () => {
  let service: SignatureAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureAuditService],
    }).compile();

    service = module.get<SignatureAuditService>(SignatureAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSecureToken', () => {
    it('should generate a 64-character hexadecimal token', () => {
      const token = service.generateSecureToken();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it('should generate unique tokens across invocations', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('calculateSha256 and verifyHash', () => {
    it('should calculate deterministic SHA-256 hash for string', () => {
      const data = 'NOXIA-DOCUMENT-TEST-123';
      const hash1 = service.calculateSha256(data);
      const hash2 = service.calculateSha256(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should calculate deterministic SHA-256 hash for buffer', () => {
      const buffer = Buffer.from('BINARY-BUFFER-DATA', 'utf-8');
      const hash = service.calculateSha256(buffer);

      expect(hash).toHaveLength(64);
      expect(service.verifyHash(buffer, hash)).toBe(true);
    });

    it('should return false when verifying with an altered hash', () => {
      const buffer = Buffer.from('DATA-ORIGINAL', 'utf-8');
      const hash = service.calculateSha256(buffer);
      const fakeHash = hash.replace(hash[0], hash[0] === 'a' ? 'b' : 'a');

      expect(service.verifyHash(buffer, fakeHash)).toBe(false);
    });

    it('should return false when expectedHash is empty or undefined', () => {
      const buffer = Buffer.from('DATA', 'utf-8');
      expect(service.verifyHash(buffer, '')).toBe(false);
      expect(service.verifyHash(buffer, null as any)).toBe(false);
    });
  });

  describe('generateVerificationQr', () => {
    it('should generate a valid PNG QR buffer from a URL', async () => {
      const url = 'https://crm.noxia.com/verify/test-uuid-123';
      const qrBuffer = await service.generateVerificationQr(url);

      expect(qrBuffer).toBeInstanceOf(Buffer);
      expect(qrBuffer.length).toBeGreaterThan(100);
      // Check PNG magic bytes (0x89, 'P', 'N', 'G')
      expect(qrBuffer[0]).toBe(0x89);
      expect(qrBuffer[1]).toBe(0x50);
      expect(qrBuffer[2]).toBe(0x4e);
      expect(qrBuffer[3]).toBe(0x47);
    });
  });

  describe('formatLegalTimestamp', () => {
    it('should format timestamps with UTC and COT representations', () => {
      const now = new Date('2026-10-21T15:30:00Z');
      const result = service.formatLegalTimestamp(now);

      expect(result).toHaveProperty('utc', '2026-10-21T15:30:00.000Z');
      expect(result).toHaveProperty('cot');
      expect(result.cot).toBeDefined();
      expect(result.timestamp).toBe(now.getTime());
    });
  });
});
