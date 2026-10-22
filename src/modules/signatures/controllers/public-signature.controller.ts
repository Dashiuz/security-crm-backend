import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { SignatureRequestService } from '../services/signature-request.service';
import { SubmitPublicSignatureDto } from '../dtos/submit-public-signature.dto';

@ApiTags('Public Signature Portal (Client-Facing & Verification)')
@Controller('public/signatures')
export class PublicSignatureController {
  constructor(private readonly signatureService: SignatureRequestService) {}

  @Get(':token')
  @ApiOperation({
    summary: 'Obtener documento y datos de firma para portal público',
  })
  @ApiOkResponse({
    description: 'Datos del documento disponibles para revisión',
  })
  @ApiNotFoundResponse({ description: 'Enlace no válido o expirado' })
  async getPublicDocument(@Param('token') token: string, @Req() req: any) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    const clientUa = req.headers['user-agent'] as string;

    return this.signatureService.getPublicRequestByToken(
      token,
      clientIp,
      clientUa,
    );
  }

  @Post(':token/sign')
  @ApiOperation({
    summary:
      'Firmar electrónicamente el documento y generar Hoja de Evidencias',
  })
  @ApiCreatedResponse({ description: 'Documento sellado y firmado con éxito' })
  @ApiBadRequestResponse({
    description: 'Datos incompletos o términos no aceptados',
  })
  async submitSignature(
    @Param('token') token: string,
    @Body() dto: SubmitPublicSignatureDto,
    @Req() req: any,
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    const clientUa = req.headers['user-agent'] as string;

    return this.signatureService.submitPublicSignature(
      token,
      dto,
      clientIp,
      clientUa,
    );
  }

  @Get('verify/:id')
  @ApiOperation({
    summary:
      'Verificación pública de autenticidad e integridad mediante Código QR',
  })
  @ApiOkResponse({ description: 'Metadatos de autenticidad y hashes SHA-256' })
  @ApiNotFoundResponse({ description: 'Documento no registrado o inexistente' })
  async verifyDocument(@Param('id') id: string) {
    return this.signatureService.verifyPublicDocument(id);
  }
}
