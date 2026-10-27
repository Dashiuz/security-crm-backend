import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ChameleonDocumentService } from '../services/chameleon-document.service';
import { CreateAuthorizedSignerDto, UpdateAuthorizedSignerDto } from '../dtos';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';

@ApiTags('Commercial - Authorized Signers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('commercial')
@Controller('commercial/settings/signers')
export class SignersController {
  constructor(private readonly chameleonService: ChameleonDocumentService) {}

  @Get()
  @RequirePermissions('commercial:settings:read', 'commercial:proposals:read')
  @ApiOperation({ summary: 'Listar firmantes autorizados de la empresa' })
  @ApiOkResponse({ description: 'Lista de firmantes activos' })
  async getSigners(@Request() req: any) {
    return this.chameleonService.getSigners(req.user);
  }

  @Get('system-users')
  @RequirePermissions('commercial:settings:read', 'commercial:proposals:read')
  @ApiOperation({ summary: 'Listar usuarios internos del sistema elegibles como firmantes' })
  @ApiOkResponse({ description: 'Lista de usuarios del tenant con estado de firma digital' })
  async getSystemUsersAsSigners(@Request() req: any) {
    return this.chameleonService.getSystemUsersAsSigners(req.user);
  }

  @Get(':id')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Consultar detalle de un firmante por ID' })
  @ApiOkResponse({ description: 'Detalle del firmante' })
  async getSignerById(@Param('id') id: string, @Request() req: any) {
    return this.chameleonService.getSignerById(id, req.user);
  }

  @Post()
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Registrar nuevo firmante autorizado' })
  @ApiCreatedResponse({ description: 'Firmante registrado exitosamente' })
  async createSigner(
    @Body() dto: CreateAuthorizedSignerDto,
    @Request() req: any,
  ) {
    return this.chameleonService.createSigner(dto, req.user);
  }

  @Patch(':id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Actualizar datos de un firmante autorizado' })
  @ApiOkResponse({ description: 'Firmante actualizado' })
  async updateSigner(
    @Param('id') id: string,
    @Body() dto: UpdateAuthorizedSignerDto,
    @Request() req: any,
  ) {
    return this.chameleonService.updateSigner(id, dto, req.user);
  }

  @Post(':id/signature')
  @RequirePermissions('commercial:settings:manage')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir y optimizar firma digitalizada con sharp (PNG < 18KB)',
  })
  @ApiCreatedResponse({ description: 'Firma procesada y subida a AWS S3' })
  async uploadSignature(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.chameleonService.uploadSignerSignature(id, file, req.user);
  }

  @Delete(':id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Inhabilitar firmante autorizado (soft-delete)' })
  @ApiOkResponse({ description: 'Firmante inhabilitado' })
  async deleteSigner(@Param('id') id: string, @Request() req: any) {
    return this.chameleonService.deleteSigner(id, req.user);
  }
}
