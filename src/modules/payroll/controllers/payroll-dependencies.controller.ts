import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PayrollDependenciesService } from '../services/payroll-dependencies.service';
import {
  CreatePayrollDependencyDto,
  UpdatePayrollDependencyDto,
  CalculateBreakdownSimulationDto,
} from '../dtos/payroll-dependency.dto';
import {
  SyncServiceOrdersToDependenciesDto,
  SyncServiceOrdersResultDto,
} from '../dtos/sync-service-orders.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';

@ApiTags('Payroll: Dependencies & Posts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/dependencies')
export class PayrollDependenciesController {
  constructor(
    private readonly dependenciesService: PayrollDependenciesService,
  ) {}

  @Get()
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
  )
  @ApiOperation({
    summary: 'Listar puestos y dependencias de nómina con semáforo G&P',
  })
  @ApiOkResponse({
    description: 'Lista de dependencias operativas y administrativas',
  })
  listDependencies(
    @Request() req: any,
    @Query('branchId') branchId?: string,
    @Query('clientId') clientId?: string,
    @Query('isInternal') isInternal?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const isInternalBool =
      isInternal !== undefined ? isInternal === 'true' : undefined;
    const isActiveBool =
      isActive !== undefined ? isActive === 'true' : undefined;

    return this.dependenciesService.listDependencies(req.user.tenantId, {
      branchId,
      clientId,
      isInternal: isInternalBool,
      isActive: isActiveBool,
      search,
    });
  }

  @Get('kpis')
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
  )
  @ApiOperation({
    summary: 'Obtener indicadores KPI de puestos y nómina garantizada',
  })
  @ApiOkResponse({
    description: 'Métricas de puestos totales, operativos y nómina mensual',
  })
  getKpis(@Request() req: any) {
    return this.dependenciesService.getDependenciesKpis(req.user.tenantId);
  }

  @Get(':id')
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
  )
  @ApiOperation({ summary: 'Obtener detalle de dependencia por ID' })
  @ApiOkResponse({ description: 'Ficha salarial y operativa del puesto' })
  getDependencyById(@Request() req: any, @Param('id') id: string) {
    return this.dependenciesService.getDependencyById(req.user.tenantId, id);
  }

  @Post()
  @RequirePermissions('payroll:dependencies:manage')
  @ApiOperation({ summary: 'Crear nueva dependencia o puesto de nómina' })
  @ApiCreatedResponse({ description: 'Puesto creado exitosamente' })
  createDependency(
    @Request() req: any,
    @Body() dto: CreatePayrollDependencyDto,
  ) {
    return this.dependenciesService.createDependency(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Patch(':id')
  @RequirePermissions('payroll:dependencies:manage')
  @ApiOperation({ summary: 'Actualizar dependencia o puesto de nómina' })
  @ApiOkResponse({ description: 'Puesto actualizado' })
  updateDependency(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollDependencyDto,
  ) {
    return this.dependenciesService.updateDependency(
      req.user.tenantId,
      id,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Delete(':id')
  @RequirePermissions('payroll:dependencies:manage')
  @ApiOperation({ summary: 'Inactivar dependencia de nómina' })
  @ApiOkResponse({ description: 'Dependencia inactivada' })
  deleteDependency(@Request() req: any, @Param('id') id: string) {
    return this.dependenciesService.deleteDependency(req.user.tenantId, id);
  }

  @Post('sync-service-orders')
  @RequirePermissions('payroll:dependencies:manage')
  @ApiOperation({
    summary:
      '⚡ Sincronizar puestos 1-clic desde Órdenes de Servicio Comercial',
  })
  @ApiOkResponse({ type: SyncServiceOrdersResultDto })
  syncFromServiceOrders(
    @Request() req: any,
    @Body() dto: SyncServiceOrdersToDependenciesDto,
  ) {
    return this.dependenciesService.syncFromServiceOrders(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Post('simulate-breakdown')
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
  )
  @ApiOperation({
    summary: 'Simular desglose al centavo de sueldo garantizado por modalidad',
  })
  @ApiOkResponse({
    description: 'Simulación de conceptos desglosados en tiempo real',
  })
  simulateBreakdown(
    @Request() req: any,
    @Body() dto: CalculateBreakdownSimulationDto,
  ) {
    return this.dependenciesService.simulateBreakdown(req.user.tenantId, dto);
  }
}
