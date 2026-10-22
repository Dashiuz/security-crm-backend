import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { SignatureRequestService } from '../services/signature-request.service';
import { SaveUserSignatureDto } from '../dtos/save-user-signature.dto';

@ApiTags('User Signatures')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users/me/signature')
export class UserSignatureController {
  constructor(private readonly signatureService: SignatureRequestService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener la firma digital configurada del usuario autenticado' })
  @ApiOkResponse({ description: 'Firma digital encontrada o nula' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async getMySignature(@Req() req: any) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.signatureService.getUserSignature(userId, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar o actualizar la firma digital en el perfil del usuario' })
  @ApiCreatedResponse({ description: 'Firma digital guardada exitosamente' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async saveMySignature(@Req() req: any, @Body() dto: SaveUserSignatureDto) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.signatureService.saveUserSignature(userId, tenantId, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Eliminar la firma digital del perfil del usuario' })
  @ApiOkResponse({ description: 'Firma digital removida exitosamente' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async deleteMySignature(@Req() req: any) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.signatureService.deleteUserSignature(userId, tenantId);
  }
}
