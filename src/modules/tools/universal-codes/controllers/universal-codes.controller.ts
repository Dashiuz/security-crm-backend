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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';
import { UniversalCodesService } from '../services/universal-codes.service';
import {
  CreateUniversalCodeDto,
  CreateBatchUniversalCodesDto,
  UpdateUniversalCodeDto,
  BatchUpdateUniversalCodesDto,
  QueryUniversalCodesDto,
  UniversalCodeResponseDto,
} from '../dtos/universal-code.dto';

@ApiTags('Herramientas: Códigos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('tools_codes')
@Controller('tools/universal-codes')
export class UniversalCodesController {
  constructor(private readonly service: UniversalCodesService) {}

  @Post()
  @RequirePermissions('tools:codes:create', 'tools:codes:manage')
  @ApiOperation({
    summary: 'Registrar y emitir un nuevo código universal (QR o barras)',
  })
  @ApiCreatedResponse({
    description: 'Código universal creado exitosamente',
    type: UniversalCodeResponseDto,
  })
  create(
    @Body() dto: CreateUniversalCodeDto,
    @Req() req: { user?: { sub?: string; tenantId?: string } },
  ) {
    return this.service.create(dto, req.user);
  }

  @Post('batch')
  @RequirePermissions('tools:codes:create', 'tools:codes:manage')
  @ApiOperation({
    summary: 'Registrar y emitir masivamente un lote de códigos universales',
  })
  @ApiCreatedResponse({
    description: 'Lote de códigos universales creado exitosamente',
    type: [UniversalCodeResponseDto],
  })
  createBatch(
    @Body() dto: CreateBatchUniversalCodesDto,
    @Req() req: { user?: { sub?: string; tenantId?: string } },
  ) {
    return this.service.createBatch(dto, req.user);
  }

  @Patch('batch')
  @RequirePermissions('tools:codes:manage')
  @ApiOperation({
    summary: 'Actualizar masivamente ítems de un lote (seriales, metadatos)',
  })
  @ApiOkResponse({
    description: 'Ítems del lote actualizados exitosamente',
    type: [UniversalCodeResponseDto],
  })
  batchUpdate(
    @Body() dto: BatchUpdateUniversalCodesDto,
    @Req() req: { user?: { tenantId?: string } },
  ) {
    return this.service.batchUpdate(dto, req.user);
  }

  @Get('batches')
  @RequirePermissions('tools:codes:read', 'tools:codes:manage')
  @ApiOperation({
    summary: 'Consultar listado de lotes emitidos en la empresa',
  })
  @ApiOkResponse({ description: 'Listado de lotes con conteos' })
  getBatches(@Req() req: { user?: { tenantId?: string } }) {
    return this.service.listBatches(req.user);
  }

  @Get('stats')
  @RequirePermissions('tools:codes:read', 'tools:codes:manage')
  @ApiOperation({
    summary: 'Consultar métricas consolidadas y KPIs de códigos universales',
  })
  @ApiOkResponse({
    description:
      'Estadísticas agregadas de códigos (totales, activos, inactivos, lotes)',
  })
  getStats(@Req() req: { user?: { tenantId?: string } }) {
    return this.service.getStats(req.user);
  }

  @Get()
  @RequirePermissions('tools:codes:read', 'tools:codes:manage')
  @ApiOperation({
    summary: 'Consultar listado paginado y filtrable de códigos universales',
  })
  @ApiOkResponse({ description: 'Listado de códigos universales' })
  findAll(
    @Query() query: QueryUniversalCodesDto,
    @Req() req: { user?: { tenantId?: string } },
  ) {
    return this.service.findAll(query, req.user);
  }

  @Get('resolve/:code')
  @RequirePermissions('tools:codes:read', 'tools:codes:manage')
  @ApiOperation({
    summary: 'Resolver y escanear un código por su identificador canónico',
  })
  @ApiOkResponse({
    description: 'Ficha resuelta del código y activo/punto asociado',
    type: UniversalCodeResponseDto,
  })
  resolve(
    @Param('code') code: string,
    @Req() req: { user?: { tenantId?: string } },
  ) {
    return this.service.resolveCode(code, req.user);
  }

  @Get(':id')
  @RequirePermissions('tools:codes:read', 'tools:codes:manage')
  @ApiOperation({ summary: 'Consultar detalle de un código universal por ID' })
  @ApiOkResponse({
    description: 'Detalle del código universal',
    type: UniversalCodeResponseDto,
  })
  findById(
    @Param('id') id: string,
    @Req() req: { user?: { tenantId?: string } },
  ) {
    return this.service.findById(id, req.user);
  }

  @Patch(':id')
  @RequirePermissions('tools:codes:manage')
  @ApiOperation({
    summary: 'Actualizar metadatos, título o estado de un código universal',
  })
  @ApiOkResponse({
    description: 'Código universal actualizado',
    type: UniversalCodeResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUniversalCodeDto,
    @Req() req: { user?: { tenantId?: string } },
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermissions('tools:codes:manage')
  @ApiOperation({ summary: 'Eliminar lógicamente un código universal' })
  @ApiOkResponse({ description: 'Código universal eliminado exitosamente' })
  remove(
    @Param('id') id: string,
    @Req() req: { user?: { tenantId?: string } },
  ) {
    return this.service.remove(id, req.user);
  }
}
