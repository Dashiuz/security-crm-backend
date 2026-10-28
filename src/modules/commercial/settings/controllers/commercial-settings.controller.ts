import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommercialSettingsService } from '../services/commercial-settings.service';
import {
  CreateTariffPeriodDto,
  UpdateTariffPeriodDto,
  SimulateTariffDto,
  SimulateSalaryDto,
  CreateServiceCatalogDto,
  UpdateServiceCatalogDto,
  UpsertSalaryMatrixDto,
  CreateValueAddedDto,
  UpdateValueAddedDto,
  UpdateDocumentSkinDto,
  UpdateDistributionMatrixDto,
  CreateTextSnippetDto,
  UpdateTextSnippetDto,
  UpdateCommercialSettingsDto,
} from '../dtos';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';

@ApiTags('Commercial Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('commercial')
@Controller('commercial/settings')
export class CommercialSettingsController {
  constructor(
    private readonly commercialSettingsService: CommercialSettingsService,
  ) {}

  // ==========================================
  // Configuración Global Commercial
  // ==========================================

  @Get()
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({
    summary: 'Obtener configuración comercial integral del tenant',
  })
  getSettings(@Request() req: any) {
    return this.commercialSettingsService.getSettings(req.user);
  }

  @Patch()
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({
    summary: 'Actualizar parámetros tributarios y topes de reinversión',
  })
  updateSettings(
    @Body() dto: UpdateCommercialSettingsDto,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.updateSettings(dto, req.user);
  }

  // ==========================================
  // Tramos Tarifarios (TariffPeriodConfig)
  // ==========================================

  @Post('tariff-periods')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Registrar un nuevo tramo de vigencia tarifaria' })
  createTariffPeriod(@Body() dto: CreateTariffPeriodDto, @Request() req: any) {
    return this.commercialSettingsService.createTariffPeriod(dto, req.user);
  }

  @Patch('tariff-periods/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Actualizar un tramo tarifario existente' })
  updateTariffPeriod(
    @Param('id') id: string,
    @Body() dto: UpdateTariffPeriodDto,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.updateTariffPeriod(id, dto, req.user);
  }

  @Delete('tariff-periods/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Eliminar un tramo tarifario' })
  deleteTariffPeriod(@Param('id') id: string, @Request() req: any) {
    return this.commercialSettingsService.deleteTariffPeriod(id, req.user);
  }

  // ==========================================
  // Simuladores de Tarifas y Salarios
  // ==========================================

  @Post('simulate-rate')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({
    summary: 'Simular tarifa mensual de un servicio de seguridad en vivo',
  })
  simulateTariff(@Body() dto: SimulateTariffDto, @Request() req: any) {
    return this.commercialSettingsService.simulateTariff(dto, req.user);
  }

  @Post('simulate-salary')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({
    summary:
      'Simular nómina de guarda consumiendo vigencia tarifaria activa de la BD',
  })
  simulateSalary(@Body() dto: SimulateSalaryDto, @Request() req: any) {
    return this.commercialSettingsService.simulateSalary(dto, req.user);
  }

  // ==========================================
  // Catálogo de Servicios (SecurityServiceCatalog)
  // ==========================================

  @Get('service-catalog')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Listar servicios configurados en el catálogo' })
  getServiceCatalog(@Request() req: any) {
    return this.commercialSettingsService.getServiceCatalog(req.user);
  }

  @Post('service-catalog')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Agregar un nuevo servicio al catálogo' })
  createServiceCatalog(
    @Body() dto: CreateServiceCatalogDto,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.createServiceCatalog(dto, req.user);
  }

  @Patch('service-catalog/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Modificar un servicio existente del catálogo' })
  updateServiceCatalog(
    @Param('id') id: string,
    @Body() dto: UpdateServiceCatalogDto,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.updateServiceCatalog(
      id,
      dto,
      req.user,
    );
  }

  @Delete('service-catalog/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Eliminar un servicio del catálogo' })
  deleteServiceCatalog(@Param('id') id: string, @Request() req: any) {
    return this.commercialSettingsService.deleteServiceCatalog(id, req.user);
  }

  // ==========================================
  // Matriz Salarial (PositionSalaryMatrix)
  // ==========================================

  @Get('salary-matrix')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Listar matriz salarial por cargo y programación' })
  getSalaryMatrix(@Request() req: any) {
    return this.commercialSettingsService.getSalaryMatrix(req.user);
  }

  @Put('salary-matrix')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({
    summary: 'Actualización masiva (batch upsert) de salarios por cargo',
  })
  upsertSalaryMatrix(@Body() dto: UpsertSalaryMatrixDto, @Request() req: any) {
    return this.commercialSettingsService.upsertSalaryMatrix(dto, req.user);
  }

  @Delete('salary-matrix/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({
    summary: 'Eliminar un registro de la matriz salarial por ID',
  })
  deleteSalaryMatrix(@Param('id') id: string, @Request() req: any) {
    return this.commercialSettingsService.deleteSalaryMatrix(id, req.user);
  }

  // ==========================================
  // Catálogo de Valores Agregados (ValueAddedCatalogItem)
  // ==========================================

  @Get('value-added')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Listar valores agregados y dotación de puesto' })
  getValueAddedCatalog(@Request() req: any) {
    return this.commercialSettingsService.getValueAddedCatalog(req.user);
  }

  @Post('value-added')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Registrar un nuevo bien o servicio en especie' })
  createValueAdded(@Body() dto: CreateValueAddedDto, @Request() req: any) {
    return this.commercialSettingsService.createValueAdded(dto, req.user);
  }

  @Patch('value-added/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Modificar un valor agregado del catálogo' })
  updateValueAdded(
    @Param('id') id: string,
    @Body() dto: UpdateValueAddedDto,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.updateValueAdded(id, dto, req.user);
  }

  @Delete('value-added/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Eliminar un valor agregado del catálogo' })
  deleteValueAdded(@Param('id') id: string, @Request() req: any) {
    return this.commercialSettingsService.deleteValueAdded(id, req.user);
  }

  // ==========================================
  // Identidad Camaleón (TenantDocumentSkin)
  // ==========================================

  @Patch('document-skin')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({
    summary: 'Actualizar piel institucional, colores y resoluciones legales',
  })
  updateDocumentSkin(@Body() dto: UpdateDocumentSkinDto, @Request() req: any) {
    return this.commercialSettingsService.updateDocumentSkin(dto, req.user);
  }

  // ==========================================
  // Matriz de Distribución (9 Dependencias)
  // ==========================================

  @Put('distribution')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({
    summary: 'Sincronizar la matriz de destinatarios de las 9 áreas',
  })
  updateDistributionRecipients(
    @Body() dto: UpdateDistributionMatrixDto,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.updateDistributionRecipients(
      dto,
      req.user,
    );
  }

  // ==========================================
  // Plantillas de Texto Dinámicas (DocumentTextSnippet)
  // ==========================================

  @Get('snippets')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({ summary: 'Listar plantillas de texto y cláusulas dinámicas' })
  getTextSnippets(@Request() req: any) {
    return this.commercialSettingsService.getTextSnippets(req.user);
  }

  @Post('snippets')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Crear una nueva plantilla de texto' })
  createTextSnippet(@Body() dto: CreateTextSnippetDto, @Request() req: any) {
    return this.commercialSettingsService.createTextSnippet(dto, req.user);
  }

  @Patch('snippets/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Modificar una plantilla de texto existente' })
  updateTextSnippet(
    @Param('id') id: string,
    @Body() dto: UpdateTextSnippetDto,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.updateTextSnippet(id, dto, req.user);
  }

  @Delete('snippets/:id')
  @RequirePermissions('commercial:settings:manage')
  @ApiOperation({ summary: 'Eliminar una plantilla de texto' })
  deleteTextSnippet(@Param('id') id: string, @Request() req: any) {
    return this.commercialSettingsService.deleteTextSnippet(id, req.user);
  }

  @Get('employees/search')
  @RequirePermissions('commercial:settings:read')
  @ApiOperation({
    summary: 'Buscar empleados para firmantes o notificación de órdenes',
  })
  searchEmployees(
    @Query('query') query: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    return this.commercialSettingsService.searchEmployees(
      query,
      req.user,
      limit ? parseInt(limit, 10) : 15,
    );
  }
}
