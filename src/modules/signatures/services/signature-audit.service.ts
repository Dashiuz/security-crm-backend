import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

export interface LegalTimestampInfo {
  utc: string;
  cot: string;
  timestamp: number;
}

@Injectable()
export class SignatureAuditService {
  private readonly logger = new Logger(SignatureAuditService.name);

  /**
   * Genera un token aleatorio seguro de 64 caracteres hexadecimales (32 bytes de entropía)
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calcula el hash SHA-256 criptográfico de un buffer o string
   */
  calculateSha256(data: Buffer | string): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verifica si los datos provistos coinciden exactamente con el hash SHA-256 esperado
   */
  verifyHash(data: Buffer | string, expectedHash: string): boolean {
    if (!expectedHash) return false;
    const computed = this.calculateSha256(data);
    return crypto.timingSafeEqual(
      Buffer.from(computed.toLowerCase()),
      Buffer.from(expectedHash.toLowerCase()),
    );
  }

  /**
   * Genera el código QR dinámico de verificación pública en formato Buffer PNG
   */
  async generateVerificationQr(url: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(url, {
        errorCorrectionLevel: 'M',
        type: 'png',
        margin: 1,
        width: 200,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      this.logger.error(`Error al generar código QR para URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Retorna la representación formal de fecha/hora en formato UTC y hora colombiana (COT / UTC-5)
   */
  formatLegalTimestamp(date: Date = new Date()): LegalTimestampInfo {
    const utc = date.toISOString();
    let cot = '';

    try {
      cot = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(date);
    } catch {
      // Fallback si no está disponible Intl es-CO
      cot = `${utc} (UTC)`;
    }

    return {
      utc,
      cot,
      timestamp: date.getTime(),
    };
  }
}
