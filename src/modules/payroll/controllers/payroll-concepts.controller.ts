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
import { PayrollConceptsService } from '../services/payroll-concepts.service';
import {
  CreatePayrollConceptDto,
  UpdatePayrollConceptDto,
  UpdateConceptBaseMatrixDto,
} from '../dtos/payroll-concept.dto';
import {
  CreatePayrollShiftModalityDto,
  UpdatePayrollShiftModalityDto,
} from '../dtos/payroll-modality.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';
import { PayrollConceptNature } from '@prisma/client';

@ApiTags('Payroll: Concepts & Modalities')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/concepts')
export class PayrollConceptsController {
  constructor(private readonly conceptsService: PayrollConceptsService) {}

  // ==========================================
  // CONCEPTS ENDPOINTS
  // ==========================================

  @Get()
  @RequirePermissions(
    'payroll:settings:read',
    'payroll:settings:manage',
    'payroll:employees:read',
    'payroll:dependencies:read',
    'payroll:novelties:read',
    'payroll:shifts:read',
    'payroll:settlement:read',
    'payroll:benefits:read',
  )
  @ApiOperation({ summary: 'Listar catálogo de conceptos de nómina y PUC' })
  @ApiOkResponse({ description: 'Lista de conceptos filtrada' })
  listConcepts(
    @Request() req: any,
    @Query('nature') nature?: PayrollConceptNature,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.conceptsService.listConcepts(req.user.tenantId, {
      nature,
      isActive: activeBool,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions('payroll:settings:read', 'payroll:settings:manage')
  @ApiOperation({ summary: 'Obtener detalle de un concepto por ID' })
  @ApiOkResponse({ description: 'Detalle del concepto' })
  getConceptById(@Request() req: any, @Param('id') id: string) {
    return this.conceptsService.getConceptById(req.user.tenantId, id);
  }

  @Post()
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Crear nuevo concepto de nómina' })
  @ApiCreatedResponse({ description: 'Concepto creado exitosamente' })
  createConcept(@Request() req: any, @Body() dto: CreatePayrollConceptDto) {
    return this.conceptsService.createConcept(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Patch('matrix/bulk')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({
    summary: 'Actualización masiva de banderas de Tablas de Base de cálculo',
  })
  @ApiOkResponse({ description: 'Matriz de conceptos actualizada' })
  updateBaseMatrix(
    @Request() req: any,
    @Body() matrix: UpdateConceptBaseMatrixDto[],
  ) {
    return this.conceptsService.updateBaseMatrix(
      req.user.tenantId,
      matrix,
      req.user.id || req.user.sub,
    );
  }

  @Patch(':id')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Actualizar concepto de nómina' })
  @ApiOkResponse({ description: 'Concepto actualizado' })
  updateConcept(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollConceptDto,
  ) {
    return this.conceptsService.updateConcept(
      req.user.tenantId,
      id,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Delete(':id')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Inactivar concepto de nómina' })
  @ApiOkResponse({ description: 'Concepto inactivado' })
  deleteConcept(@Request() req: any, @Param('id') id: string) {
    return this.conceptsService.deleteConcept(req.user.tenantId, id);
  }

  // ==========================================
  // SHIFT MODALITIES ENDPOINTS
  // ==========================================

  @Get('modalities/all')
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
  )
  @ApiOperation({
    summary: 'Listar modalidades de turno y porcentajes de distribución',
  })
  @ApiOkResponse({ description: 'Lista de modalidades' })
  listModalities(@Request() req: any) {
    return this.conceptsService.listModalities(req.user.tenantId);
  }

  @Get('modalities/:id')
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
  )
  @ApiOperation({ summary: 'Obtener detalle de modalidad de turno' })
  @ApiOkResponse({
    description: 'Detalle de modalidad con desglose porcentual',
  })
  getModalityById(@Request() req: any, @Param('id') id: string) {
    return this.conceptsService.getModalityById(req.user.tenantId, id);
  }

  @Post('modalities')
  @RequirePermissions('payroll:dependencies:manage')
  @ApiOperation({
    summary: 'Crear modalidad de turno con distribución porcentual',
  })
  @ApiCreatedResponse({ description: 'Modalidad creada exitosamente' })
  createModality(
    @Request() req: any,
    @Body() dto: CreatePayrollShiftModalityDto,
  ) {
    return this.conceptsService.createModality(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Patch('modalities/:id')
  @RequirePermissions('payroll:dependencies:manage')
  @ApiOperation({ summary: 'Actualizar modalidad de turno y porcentajes' })
  @ApiOkResponse({ description: 'Modalidad actualizada' })
  updateModality(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollShiftModalityDto,
  ) {
    return this.conceptsService.updateModality(
      req.user.tenantId,
      id,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Delete('modalities/:id')
  @RequirePermissions('payroll:dependencies:manage')
  @ApiOperation({ summary: 'Inactivar modalidad de turno' })
  @ApiOkResponse({ description: 'Modalidad inactivada' })
  deleteModality(@Request() req: any, @Param('id') id: string) {
    return this.conceptsService.deleteModality(req.user.tenantId, id);
  }
}
