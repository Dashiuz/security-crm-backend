import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SignatureAuditService } from './signature-audit.service';

export interface StampSignatureParams {
  basePdfBuffer: Buffer;
  signaturePngBuffer: Buffer;
  signerName: string;
  signerEmail: string;
  signerDocument?: string;
  signerRole?: string;
  signerIp?: string;
  signerUa?: string;
  verifyUrl: string;
  tenantName: string;
  tenantNit?: string;
  documentTitle: string;
}

export interface StampSignatureResult {
  signedPdfBuffer: Buffer;
  originalDocHash: string;
  signedDocHash: string;
}

@Injectable()
export class SignatureGeneratorService {
  private readonly logger = new Logger(SignatureGeneratorService.name);

  constructor(private readonly auditService: SignatureAuditService) {}

  /**
   * Genera un PDF base vectorial inicial en memoria a partir de metadatos o snapshot estructurado
   */
  async generateVectorDocument(title: string, contentLines: string[] = []): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Encabezado
    page.drawText('NOXIA ERP - DOCUMENTO OFICIAL', {
      x: 50,
      y: 800,
      size: 14,
      font: helveticaBold,
      color: rgb(0.12, 0.11, 0.29),
    });

    page.drawText(title, {
      x: 50,
      y: 775,
      size: 18,
      font: helveticaBold,
      color: rgb(0.48, 0.23, 0.93), // Violet
    });

    page.drawLine({
      start: { x: 50, y: 760 },
      end: { x: 545, y: 760 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.88),
    });

    let currentY = 730;
    for (const line of contentLines) {
      if (currentY < 100) break;
      page.drawText(line, {
        x: 50,
        y: currentY,
        size: 10,
        font: helvetica,
        color: rgb(0.06, 0.09, 0.16),
      });
      currentY -= 18;
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Estampa la firma del cliente en el PDF y adjunta la Hoja de Evidencias con QR y Pista de Auditoría
   */
  async stampSignatureAndAudit(params: StampSignatureParams): Promise<StampSignatureResult> {
    // 1. Calcular Hash SHA-256 del documento original
    const originalDocHash = this.auditService.calculateSha256(params.basePdfBuffer);

    // 2. Cargar el documento PDF base
    const pdfDoc = await PDFDocument.load(params.basePdfBuffer);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // 3. Incrustar la imagen de la firma PNG
    let signatureImage;
    try {
      signatureImage = await pdfDoc.embedPng(params.signaturePngBuffer);
    } catch {
      // Fallback si viene como JPEG u otro formato
      try {
        signatureImage = await pdfDoc.embedJpg(params.signaturePngBuffer);
      } catch (e) {
        this.logger.error('Error al incrustar imagen de firma en PDF:', e);
        throw new Error('El formato de imagen de firma no es compatible con el motor PDF');
      }
    }

    // 4. Estampar la firma en la última página del contenido original
    const pages = pdfDoc.getPages();
    const lastContentPage = pages[pages.length - 1];
    const { width: pageWidth } = lastContentPage.getSize();

    // Dibujar bloque de firma del cliente al pie o en posición estándar
    const sigDims = signatureImage.scale(0.35);
    const sigX = pageWidth - sigDims.width - 60;
    const sigY = 90;

    lastContentPage.drawImage(signatureImage, {
      x: sigX,
      y: sigY,
      width: sigDims.width,
      height: sigDims.height,
    });

    lastContentPage.drawLine({
      start: { x: sigX - 10, y: sigY - 5 },
      end: { x: sigX + sigDims.width + 10, y: sigY - 5 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    });

    lastContentPage.drawText(`FIRMADO ELECTRÓNICAMENTE`, {
      x: sigX,
      y: sigY - 18,
      size: 7,
      font: helveticaBold,
      color: rgb(0.48, 0.23, 0.93),
    });

    lastContentPage.drawText(`${params.signerName}`, {
      x: sigX,
      y: sigY - 28,
      size: 8,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    });

    // 5. Generar Código QR de Verificación
    const qrBuffer = await this.auditService.generateVerificationQr(params.verifyUrl);
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    // 6. Adicionar la Hoja de Evidencias (Certificado de Firma y Pista de Auditoría)
    const auditPage = pdfDoc.addPage([595.28, 841.89]); // A4
    const legalTimestamp = this.auditService.formatLegalTimestamp();

    // Fondo decorativo de cabecera
    auditPage.drawRectangle({
      x: 0,
      y: 770,
      width: 595.28,
      height: 72,
      color: rgb(0.12, 0.11, 0.29), // Midnight Obsidian
    });

    auditPage.drawText('CERTIFICADO DE FIRMA ELECTRÓNICA Y PISTA DE AUDITORÍA', {
      x: 40,
      y: 805,
      size: 12,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    auditPage.drawText('NOXIA ERP • Sistema de Gestión de Seguridad Privada e Integridad Documental', {
      x: 40,
      y: 785,
      size: 8,
      font: helvetica,
      color: rgb(0.8, 0.8, 0.9),
    });

    // Marco de advertencia legal
    auditPage.drawRectangle({
      x: 40,
      y: 690,
      width: 515,
      height: 65,
      borderColor: rgb(0.85, 0.85, 0.88),
      borderWidth: 1,
      color: rgb(0.98, 0.98, 1.0),
    });

    auditPage.drawText('MARCO LEGAL Y VALIDEZ PROBATORIA (REPÚBLICA DE COLOMBIA):', {
      x: 50,
      y: 738,
      size: 8,
      font: helveticaBold,
      color: rgb(0.12, 0.11, 0.29),
    });

    const legalNotice =
      'El presente documento ha sido firmado electrónicamente de conformidad con la Ley 527 de 1999 y el Decreto 2364\n' +
      'de 2012. Cuenta con plena validez jurídica, integridad inalterable acreditada por huella digital criptográfica SHA-256\n' +
      'y trazabilidad fehaciente de identidad, dirección IP, hora legal UTC y aceptación expresa.';

    auditPage.drawText(legalNotice, {
      x: 50,
      y: 723,
      size: 7.5,
      lineHeight: 11,
      font: helvetica,
      color: rgb(0.2, 0.25, 0.35),
    });

    // Sección 1: Datos del Documento y Emisor
    let yPos = 650;
    auditPage.drawText('1. DATOS DEL DOCUMENTO Y EMISOR', {
      x: 40,
      y: yPos,
      size: 9,
      font: helveticaBold,
      color: rgb(0.48, 0.23, 0.93),
    });

    yPos -= 18;
    auditPage.drawText(`Documento: ${params.documentTitle}`, { x: 50, y: yPos, size: 8, font: helvetica });
    yPos -= 14;
    auditPage.drawText(`Empresa Emisora: ${params.tenantName} ${params.tenantNit ? `(NIT: ${params.tenantNit})` : ''}`, {
      x: 50,
      y: yPos,
      size: 8,
      font: helvetica,
    });

    // Sección 2: Identidad del Firmante
    yPos -= 28;
    auditPage.drawText('2. IDENTIDAD Y CONSENTIMIENTO DEL FIRMANTE', {
      x: 40,
      y: yPos,
      size: 9,
      font: helveticaBold,
      color: rgb(0.48, 0.23, 0.93),
    });

    yPos -= 18;
    auditPage.drawText(`Nombre Completo: ${params.signerName}`, { x: 50, y: yPos, size: 8, font: helveticaBold });
    yPos -= 14;
    auditPage.drawText(`Correo Electrónico: ${params.signerEmail}`, { x: 50, y: yPos, size: 8, font: helvetica });
    if (params.signerDocument) {
      yPos -= 14;
      auditPage.drawText(`Identificación / Cédula / NIT: ${params.signerDocument}`, { x: 50, y: yPos, size: 8, font: helvetica });
    }
    if (params.signerRole) {
      yPos -= 14;
      auditPage.drawText(`Rol / Calidad: ${params.signerRole}`, { x: 50, y: yPos, size: 8, font: helvetica });
    }

    // Sección 3: Evidencias Técnicas de Firma
    yPos -= 28;
    auditPage.drawText('3. EVIDENCIAS TÉCNICAS Y SELLADO DE TIEMPO', {
      x: 40,
      y: yPos,
      size: 9,
      font: helveticaBold,
      color: rgb(0.48, 0.23, 0.93),
    });

    yPos -= 18;
    auditPage.drawText(`Fecha y Hora (UTC): ${legalTimestamp.utc}`, { x: 50, y: yPos, size: 8, font: helvetica });
    yPos -= 14;
    auditPage.drawText(`Fecha y Hora Oficial Colombia (COT): ${legalTimestamp.cot}`, { x: 50, y: yPos, size: 8, font: helveticaBold });
    yPos -= 14;
    auditPage.drawText(`Dirección IP de Firma: ${params.signerIp || 'No registrada / Proxy'}`, { x: 50, y: yPos, size: 8, font: helvetica });
    yPos -= 14;
    auditPage.drawText(`Navegador / Dispositivo (User-Agent):`, { x: 50, y: yPos, size: 8, font: helvetica });
    yPos -= 12;
    auditPage.drawText(`${params.signerUa ? params.signerUa.substring(0, 85) : 'Cliente Web Estándar'}`, {
      x: 50,
      y: yPos,
      size: 7,
      font: helveticaOblique,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Sección 4: Trazabilidad Criptográfica SHA-256
    yPos -= 28;
    auditPage.drawText('4. HUELLAS DIGITALES CRIPTOGRÁFICAS (SHA-256)', {
      x: 40,
      y: yPos,
      size: 9,
      font: helveticaBold,
      color: rgb(0.48, 0.23, 0.93),
    });

    yPos -= 18;
    auditPage.drawText('Hash SHA-256 Documento Original (Pre-firma):', { x: 50, y: yPos, size: 7.5, font: helveticaBold });
    yPos -= 12;
    auditPage.drawText(originalDocHash, { x: 50, y: yPos, size: 7, font: helvetica, color: rgb(0.2, 0.2, 0.2) });

    // Pre-guardar para calcular el hash final
    // Incrustamos el QR de verificación pública
    const qrSize = 110;
    auditPage.drawImage(qrImage, {
      x: 440,
      y: 120,
      width: qrSize,
      height: qrSize,
    });

    auditPage.drawText('Escanea para verificar', {
      x: 442,
      y: 105,
      size: 7,
      font: helveticaBold,
      color: rgb(0.12, 0.11, 0.29),
    });

    auditPage.drawText('integridad en tiempo real', {
      x: 442,
      y: 95,
      size: 6.5,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Línea divisoria de pie de página
    auditPage.drawLine({
      start: { x: 40, y: 70 },
      end: { x: 555, y: 70 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.88),
    });

    auditPage.drawText(`Noxia Sign Engine • Verificación disponible en: ${params.verifyUrl}`, {
      x: 40,
      y: 55,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Guardar el PDF final
    const finalPdfBytes = await pdfDoc.save();
    const signedPdfBuffer = Buffer.from(finalPdfBytes);
    const signedDocHash = this.auditService.calculateSha256(signedPdfBuffer);

    return {
      signedPdfBuffer,
      originalDocHash,
      signedDocHash,
    };
  }
}
