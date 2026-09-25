import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';
import { SecurityStudiesService } from '../services/security-studies.service';
import { GenerateBaseMapDto } from '../dtos/generate-base-map.dto';
import { CreateSecurityStudyDto } from '../dtos/create-security-study.dto';
import { UpdateSecurityStudyDto } from '../dtos/update-security-study.dto';
import { UpdateCanvasDto } from '../dtos/update-canvas.dto';
import { ApprovePerimeterDto } from '../dtos/approve-perimeter.dto';
import { DiscontinueStudyDto } from '../dtos/discontinue-study.dto';

@ApiTags('Administrative: Security Studies & Canvas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@Controller('administrative/security-studies')
export class SecurityStudiesController {
  constructor(private readonly service: SecurityStudiesService) {}

  @Post('generate-base')
  @RequireFeature('canva')
  @RequirePermissions('canva:manage', 'canva:create')
  @ApiOperation({
    summary: 'Generar imagen satelital base vía Mapbox API y almacenar en S3',
  })
  @ApiResponse({ status: 201, description: 'Imagen satelital generada y bbox calculado' })
  generateBaseMap(@Body() dto: GenerateBaseMapDto) {
    return this.service.generateBaseMap(dto);
  }

  @Post()
  @RequireFeature('sec_study')
  @RequirePermissions('sec_study:manage', 'sec_study:create')
  @ApiOperation({ summary: 'Crear un nuevo estudio de seguridad' })
  @ApiResponse({ status: 201, description: 'Estudio de seguridad creado' })
  create(@Body() dto: CreateSecurityStudyDto) {
    return this.service.create(dto);
  }

  @Get('by-client/:clientId')
  @RequireFeature('sec_study')
  @RequirePermissions(
    'sec_study:read',
    'canva:read',
    'client:read_all',
    'client:read_assigned',
    'client:read_workplace',
  )
  @ApiOperation({ summary: 'Listar estudios de seguridad asociados a un cliente' })
  findByClient(@Param('clientId') clientId: string) {
    return this.service.findByClient(clientId);
  }

  @Get('client/:clientId/geofence')
  @RequireFeature('canva', 'sec_study')
  @RequirePermissions(
    'canva:read',
    'sec_study:read',
    'client:read_all',
    'client:read_assigned',
    'client:read_workplace',
  )
  @ApiOperation({ summary: 'Obtener geocerca e imagen satelital base del cliente (SSOT)' })
  getClientGeofence(@Param('clientId') clientId: string) {
    return this.service.getClientGeofence(clientId);
  }

  @Patch('client/:clientId/geofence')
  @RequireFeature('canva')
  @RequirePermissions('canva:manage', 'canva:update')
  @ApiOperation({ summary: 'Guardar o actualizar geocerca perimetral directamente en el Cliente' })
  saveClientGeofence(
    @Param('clientId') clientId: string,
    @Body() dto: { geofence: any },
  ) {
    return this.service.saveClientGeofence(clientId, dto.geofence);
  }

  @Get('client/:clientId/image-file')
  @RequireFeature('canva', 'sec_study')
  @RequirePermissions(
    'canva:read',
    'sec_study:read',
    'client:read_all',
    'client:read_assigned',
    'client:read_workplace',
  )
  @ApiOperation({ summary: 'Obtener imagen satelital base del cliente transmitida con CORS' })
  async getClientImageFile(@Param('clientId') clientId: string, @Res() res: Response) {
    const { stream, contentType, contentLength } =
      await this.service.getClientImageStream(clientId);
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength.toString());
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  }


  @Get(':id')
  @RequireFeature('sec_study')
  @RequirePermissions('sec_study:read', 'canva:read')
  @ApiOperation({ summary: 'Obtener detalle de un estudio de seguridad por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireFeature('sec_study')
  @RequirePermissions('sec_study:manage', 'sec_study:update')
  @ApiOperation({ summary: 'Actualizar nombre y descripción de un estudio de seguridad' })
  @ApiResponse({ status: 200, description: 'Estudio de seguridad actualizado exitosamente' })
  update(@Param('id') id: string, @Body() dto: UpdateSecurityStudyDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/canvas')
  @RequireFeature('canva')
  @RequirePermissions('canva:manage', 'canva:update')
  @ApiOperation({
    summary: 'Actualizar estado vectorial del canva (Debounce Autosaver)',
  })
  updateCanvas(@Param('id') id: string, @Body() dto: UpdateCanvasDto) {
    return this.service.updateCanvas(id, dto);
  }

  @Post(':id/discontinue')
  @RequireFeature('sec_study')
  @RequirePermissions('sec_study:manage', 'sec_study:delete', 'canva:delete')
  @ApiOperation({
    summary: 'Descontinuar un estudio de seguridad (requiere confirmación "acepto")',
  })
  discontinue(@Param('id') id: string, @Body() dto: DiscontinueStudyDto) {
    return this.service.discontinue(id, dto);
  }

  @Post(':id/duplicate')
  @RequireFeature('sec_study')
  @RequirePermissions('sec_study:manage', 'sec_study:create', 'canva:create')
  @ApiOperation({
    summary:
      'Duplicar un estudio de seguridad existente (requiere descontinuar el vigente)',
  })
  duplicate(@Param('id') id: string) {
    return this.service.duplicate(id);
  }

  @Post(':id/approve-perimeter')
  @RequireFeature('canva')
  @RequirePermissions('canva:manage')
  @ApiOperation({
    summary:
      'Aprobar perímetro del estudio y sincronizarlo al Cliente como SSOT geofence',
  })
  approvePerimeter(
    @Param('id') id: string,
    @Body() dto: ApprovePerimeterDto,
  ) {
    return this.service.approvePerimeter(id, dto);
  }

  @Post(':id/attachments')
  @RequireFeature('sec_study')
  @RequirePermissions('sec_study:manage', 'sec_study:update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Cargar documento o imagen adjunta a un estudio vigente (CURRENT)',
  })
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const isImage = file.mimetype.startsWith('image/');
    return this.service.uploadAttachment(
      id,
      file,
      isImage ? 'image' : 'document',
    );
  }

  @Get(':id/image-url')
  @RequireFeature('sec_study', 'canva')
  @RequirePermissions('canva:read', 'sec_study:read')
  @ApiOperation({ summary: 'Obtener URL prefirmada fresca de la imagen base' })
  getImageUrl(@Param('id') id: string) {
    return this.service.getImageUrl(id);
  }

  @Get(':id/image-file')
  @RequireFeature('sec_study', 'canva')
  @RequirePermissions('canva:read', 'sec_study:read')
  @ApiOperation({ summary: 'Obtener archivo de imagen base transmitido directamente' })
  async getImageFile(@Param('id') id: string, @Res() res: Response) {
    const { stream, contentType, contentLength } = await this.service.getImageStream(id);
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength.toString());
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  }

  @Delete(':id/attachments/:fileId')
  @RequireFeature('sec_study')
  @RequirePermissions('sec_study:manage', 'sec_study:update')
  @ApiOperation({ summary: 'Eliminar un archivo adjunto del estudio de seguridad' })
  removeAttachment(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return this.service.deleteAttachment(id, fileId);
  }
}
