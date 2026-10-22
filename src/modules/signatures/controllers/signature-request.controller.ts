import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { SignatureRequestService } from '../services/signature-request.service';
import { CreateSignatureRequestDto } from '../dtos/create-signature-request.dto';

@ApiTags('Signature Requests (Noxia Sign)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('signatures/requests')
export class SignatureRequestController {
  constructor(private readonly signatureService: SignatureRequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Emitir nueva solicitud de firma externa con Magic Link',
  })
  @ApiCreatedResponse({ description: 'Solicitud creada y enlace generado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async create(@Req() req: any, @Body() dto: CreateSignatureRequestDto) {
    const tenantId = req.user.tenantId;
    const createdById = req.user.sub;
    return this.signatureService.createRequest(tenantId, createdById, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar estado y trazabilidad de una solicitud de firma',
  })
  @ApiOkResponse({ description: 'Detalle de la solicitud' })
  @ApiNotFoundResponse({ description: 'Solicitud no encontrada' })
  async getById(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.signatureService.getRequestById(id, tenantId);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revocar un enlace de firma pendiente' })
  @ApiOkResponse({ description: 'Solicitud revocada exitosamente' })
  async revoke(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.signatureService.revokeRequest(id, tenantId);
  }
}
