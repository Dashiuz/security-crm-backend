import { BadRequestException } from '@nestjs/common';
import { AssetOptimizationService } from './asset-optimization.service';
import sharp from 'sharp';

describe('AssetOptimizationService', () => {
  let service: AssetOptimizationService;
  let validPngBuffer: Buffer;

  beforeAll(async () => {
    // Generar imagen válida de 50x50 píxeles para pasar validación de trim (mínimo 3x3)
    validPngBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    service = new AssetOptimizationService();
  });

  describe('processLogo', () => {
    it('debe optimizar y convertir un logotipo válido a WebP', async () => {
      const result = await service.processLogo(validPngBuffer);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('debe lanzar BadRequestException si el buffer está vacío', async () => {
      await expect(service.processLogo(Buffer.alloc(0))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException si el buffer contiene datos corruptos', async () => {
      const corruptBuffer = Buffer.from('not-a-valid-image');
      await expect(service.processLogo(corruptBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processSignature', () => {
    it('debe recortar bordes y convertir la firma a PNG optimizado', async () => {
      const result = await service.processSignature(validPngBuffer);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('image/png');
      expect(result.extension).toBe('png');
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('debe lanzar BadRequestException si el buffer está vacío', async () => {
      await expect(service.processSignature(Buffer.alloc(0))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException si el buffer contiene datos corruptos', async () => {
      const corruptBuffer = Buffer.from('invalid-signature-data');
      await expect(service.processSignature(corruptBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
