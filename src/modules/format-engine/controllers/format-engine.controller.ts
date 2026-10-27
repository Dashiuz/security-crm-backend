import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { FormatEngineService } from '../services/format-engine.service';
import {
  CreateFormatDto,
  UpdateFormatDto,
  CreateVariableDto,
  UpdateVariableDto,
  RenderFormatDto,
} from '../dtos';
import { FormatCategory, FormatVisibilityScope } from '@prisma/client';

@ApiTags('Format Engine')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('format-engine')
export class FormatEngineController {
  constructor(private readonly formatEngineService: FormatEngineService) {}

  // ==========================================
  // FORMATOS UNIVERSALES
  // ==========================================

  @Get('formats')
  @ApiOperation({ summary: 'Listar formatos universales (globales o personales)' })
  @ApiQuery({ name: 'category', enum: FormatCategory, required: false })
  @ApiQuery({ name: 'scope', enum: FormatVisibilityScope, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  async getFormats(
    @Req() req: any,
    @Query('category') category?: FormatCategory,
    @Query('scope') scope?: FormatVisibilityScope,
    @Query('search') search?: string,
  ) {
    return this.formatEngineService.getFormats(req.user, {
      category,
      scope,
      search,
    });
  }

  @Get('formats/next-code')
  @ApiOperation({ summary: 'Generar código consecutivo estandarizado para nuevo formato' })
  @ApiQuery({ name: 'category', enum: FormatCategory, required: false })
  async getNextFormatCode(
    @Req() req: any,
    @Query('category') category?: FormatCategory,
  ) {
    return this.formatEngineService.getNextFormatCode(
      category || FormatCategory.GENERAL,
      req.user,
    );
  }

  @Get('formats/:id')
  @ApiOperation({ summary: 'Obtener detalle de un formato universal por ID' })
  async getFormatById(@Req() req: any, @Param('id') id: string) {
    return this.formatEngineService.getFormatById(id, req.user);
  }

  @Post('formats')
  @ApiOperation({ summary: 'Crear un nuevo formato universal' })
  async createFormat(@Req() req: any, @Body() dto: CreateFormatDto) {
    return this.formatEngineService.createFormat(dto, req.user);
  }

  @Patch('formats/:id')
  @ApiOperation({ summary: 'Actualizar un formato universal existente' })
  async updateFormat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFormatDto,
  ) {
    return this.formatEngineService.updateFormat(id, dto, req.user);
  }

  @Delete('formats/:id')
  @ApiOperation({ summary: 'Desactivar / eliminar un formato universal' })
  async deleteFormat(@Req() req: any, @Param('id') id: string) {
    return this.formatEngineService.deleteFormat(id, req.user);
  }

  // ==========================================
  // VARIABLES DINÁMICAS
  // ==========================================

  @Get('variables')
  @ApiOperation({ summary: 'Listar variables dinámicas disponibles para el usuario' })
  @ApiQuery({ name: 'search', type: String, required: false })
  async getVariables(@Req() req: any, @Query('search') search?: string) {
    return this.formatEngineService.getVariables(req.user, search);
  }

  @Post('variables')
  @ApiOperation({ summary: 'Crear una nueva variable o atajo dinámico' })
  async createVariable(@Req() req: any, @Body() dto: CreateVariableDto) {
    return this.formatEngineService.createVariable(dto, req.user);
  }

  @Patch('variables/:id')
  @ApiOperation({ summary: 'Actualizar una variable o atajo dinámico existente' })
  async updateVariable(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVariableDto,
  ) {
    return this.formatEngineService.updateVariable(id, dto, req.user);
  }

  @Delete('variables/:id')
  @ApiOperation({ summary: 'Eliminar una variable o atajo dinámico' })
  async deleteVariable(@Req() req: any, @Param('id') id: string) {
    return this.formatEngineService.deleteVariable(id, req.user);
  }

  // ==========================================
  // CATÁLOGO DE DATOS DEL SISTEMA
  // ==========================================

  @Get('system-catalog')
  @ApiOperation({ summary: 'Obtener diccionario masivo de variables del sistema' })
  getSystemCatalog() {
    return this.formatEngineService.getSystemCatalog();
  }

  // ==========================================
  // PARSE & DROP (WORD & EXCEL EN MEMORIA)
  // ==========================================

  @Post('parse-file')
  @ApiOperation({
    summary:
      'Procesa un archivo Word (.docx) o Excel (.xlsx) en memoria sin guardar en S3',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async parseUploadedFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Debe proporcionar un archivo válido para procesar.');
    }

    return this.formatEngineService.parseUploadedFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  // ==========================================
  // RENDERIZADO / INTERPOLACIÓN
  // ==========================================

  @Post('render')
  @ApiOperation({
    summary:
      'Interpolar variables en un HTML arbitrario usando contexto de base de datos',
  })
  async renderCustomHtml(@Req() req: any, @Body() dto: RenderFormatDto) {
    return this.formatEngineService.renderFormat(null, dto, req.user);
  }

  @Post('formats/:id/render')
  @ApiOperation({
    summary:
      'Interpolar variables en una plantilla guardada usando contexto de base de datos',
  })
  async renderSavedFormat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RenderFormatDto,
  ) {
    return this.formatEngineService.renderFormat(id, dto, req.user);
  }
}
