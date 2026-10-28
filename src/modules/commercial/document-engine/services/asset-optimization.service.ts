import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedAsset {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
}

@Injectable()
export class AssetOptimizationService {
  private readonly logger = new Logger(AssetOptimizationService.name);

  /**
   * Optimiza el logotipo del tenant:
   * - Redimensiona a máximo 600px de ancho preservando relación de aspecto.
   * - Remueve metadatos EXIF.
   * - Convierte a WebP (calidad 88, peso típico 15KB - 25KB).
   */
  async processLogo(rawBuffer: Buffer): Promise<ProcessedAsset> {
    try {
      if (!rawBuffer || rawBuffer.length === 0) {
        throw new BadRequestException(
          'El buffer de imagen del logotipo no puede estar vacío.',
        );
      }

      const pipeline = sharp(rawBuffer)
        .rotate()
        .resize({ width: 600, withoutEnlargement: true })
        .webp({ quality: 88, effort: 5 });

      const buffer = await pipeline.toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        mimeType: 'image/webp',
        extension: 'webp',
        width: metadata.width ?? 600,
        height: metadata.height ?? 200,
        sizeBytes: buffer.length,
      };
    } catch (error: any) {
      this.logger.error(
        `Error optimizando logotipo corporativo: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'El archivo de imagen del logotipo es inválido o no tiene un formato compatible (PNG/JPG/WEBP).',
      );
    }
  }

  /**
   * Optimiza firmas digitalizadas para su estampación en PDFs:
   * - Recorta bordes transparentes o blancos sobrantes (.trim()).
   * - Limpia canal alfa (transparencia limpia sin recuadros grises).
   * - Escala a máximo 320px de ancho.
   * - Convierte a PNG optimizado (compresión nivel 9, peso típico 8KB - 16KB).
   */
  async processSignature(rawBuffer: Buffer): Promise<ProcessedAsset> {
    try {
      if (!rawBuffer || rawBuffer.length === 0) {
        throw new BadRequestException(
          'El buffer de la firma no puede estar vacío.',
        );
      }

      const pipeline = sharp(rawBuffer)
        .rotate()
        .trim()
        .resize({ width: 320, withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true });

      const buffer = await pipeline.toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        mimeType: 'image/png',
        extension: 'png',
        width: metadata.width ?? 320,
        height: metadata.height ?? 120,
        sizeBytes: buffer.length,
      };
    } catch (error: any) {
      this.logger.error(
        `Error optimizando firma digitalizada: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'El archivo de firma debe ser una imagen válida con fondo transparente o neutro (PNG/JPG).',
      );
    }
  }
}
