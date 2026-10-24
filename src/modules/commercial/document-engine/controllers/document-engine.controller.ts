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
import {
  UpdateTenantDocumentSkinDto,
  CreateSnippetDto,
  UpdateSnippetDto,
  InterpolateSnippetDto,
} from '../dtos';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';

@ApiTags('Commercial - Document Engine & Identity')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('commercial')
@Controller('commercial/settings')
export class DocumentEngineController {
  constructor(private readonly chameleonService: ChameleonDocumentService) {}

  // ==========================================
  // Piel Documental de Marca (Skin / Membrete)
  // ==========================================

  @Get('skin')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Consultar piel corporativa y membrete del tenant' })
  @ApiOkResponse({ description: 'Configuración visual y resoluciones' })
  async getSkin(@Request() req: any) {
    return this.chameleonService.getSkin(req.user);
  }

  @Patch('skin')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Actualizar colores de marca, layout y resoluciones SVSP' })
  @ApiOkResponse({ description: 'Piel documental actualizada' })
  async updateSkin(
    @Body() dto: UpdateTenantDocumentSkinDto,
    @Request() req: any,
  ) {
    return this.chameleonService.updateSkin(dto, req.user);
  }

  @Post('skin/logo')
  @RequirePermissions('commercial:settings:manage')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir y optimizar logotipo corporativo con sharp (WebP < 25KB)',
  })
  @ApiCreatedResponse({ description: 'Logotipo optimizado y vinculado al skin' })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.chameleonService.uploadLogo(file, req.user);
  }

  // ==========================================
  // Fragmentos de Texto y Cláusulas TipTap
  // ==========================================

  @Get('snippets')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Listar fragmentos de texto y cláusulas TipTap' })
  @ApiOkResponse({ description: 'Lista de fragmentos' })
  async getSnippets(@Request() req: any) {
    return this.chameleonService.getSnippets(req.user);
  }

  @Get('snippets/:id')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Consultar fragmento de texto por ID' })
  @ApiOkResponse({ description: 'Detalle de fragmento con tokens' })
  async getSnippetById(@Param('id') id: string, @Request() req: any) {
    return this.chameleonService.getSnippetById(id, req.user);
  }

  @Post('snippets')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Crear nueva plantilla de cláusula con variables' })
  @ApiCreatedResponse({ description: 'Fragmento creado' })
  async createSnippet(@Body() dto: CreateSnippetDto, @Request() req: any) {
    return this.chameleonService.createSnippet(dto, req.user);
  }

  @Patch('snippets/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Actualizar plantilla de texto y variables' })
  @ApiOkResponse({ description: 'Fragmento actualizado' })
  async updateSnippet(
    @Param('id') id: string,
    @Body() dto: UpdateSnippetDto,
    @Request() req: any,
  ) {
    return this.chameleonService.updateSnippet(id, dto, req.user);
  }

  @Delete('snippets/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Eliminar fragmento no predeterminado' })
  @ApiOkResponse({ description: 'Fragmento eliminado' })
  async deleteSnippet(@Param('id') id: string, @Request() req: any) {
    return this.chameleonService.deleteSnippet(id, req.user);
  }

  @Post('snippets/:id/interpolate')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Probar interpolación de tokens variables en tiempo real' })
  @ApiOkResponse({ description: 'Texto renderizado con variables sustituidas' })
  async interpolateSnippet(
    @Param('id') id: string,
    @Body() dto: InterpolateSnippetDto,
    @Request() req: any,
  ) {
    return this.chameleonService.interpolateSnippet(id, dto, req.user);
  }
}
