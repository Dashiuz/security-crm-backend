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
import { PayrollNoveltiesService } from '../services/payroll-novelties.service';
import {
  PreviewLeaveDto,
  CreateLeaveAndAbsenceDto,
  UpdateClaimStatusDto,
  CreatePayrollLoanDto,
  RecordLoanInstallmentDto,
  UpdateLoanStatusDto,
  CreatePermanentConceptDto,
  CreatePeriodNoveltyDto,
  BulkImportPeriodNoveltiesDto,
} from '../dtos/payroll-novelties.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';
import {
  LeaveAndAbsenceType,
  EpsClaimStatus,
  PayrollLoanStatus,
  PermanentConceptScope,
} from '@prisma/client';

@ApiTags('Payroll: Novelties & Incapacities')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/novelties')
export class PayrollNoveltiesController {
  constructor(private readonly noveltiesService: PayrollNoveltiesService) {}

  @Get('kpis')
  @RequirePermissions('payroll:novelties:read', 'payroll:novelties:manage')
  @ApiOperation({ summary: 'Obtener KPIs y resumen financiero de novedades' })
  @ApiOkResponse({
    description: 'Métricas de incapacidades, cartera EPS y préstamos',
  })
  getKpis(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.noveltiesService.getKpis(req.user.tenantId, y, m);
  }

  // ==========================================
  // INCAPACIDADES & LICENCIAS
  // ==========================================
  @Post('leaves/preview')
  @RequirePermissions('payroll:novelties:read', 'payroll:novelties:manage')
  @ApiOperation({
    summary: 'Previsualizar liquidación de incapacidad en tiempo real',
  })
  @ApiOkResponse({
    description: 'Desglose empleador vs entidad y montos liquidados',
  })
  previewLeave(@Request() req: any, @Body() dto: PreviewLeaveDto) {
    return this.noveltiesService.previewLeave(req.user.tenantId, dto);
  }

  @Get('leaves')
  @RequirePermissions('payroll:novelties:read', 'payroll:novelties:manage')
  @ApiOperation({
    summary:
      'Listar novedades de tiempo (incapacidades, licencias, ausentismos)',
  })
  listLeaves(
    @Request() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('leaveType') leaveType?: LeaveAndAbsenceType,
    @Query('claimStatus') claimStatus?: EpsClaimStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.noveltiesService.listLeaves(req.user.tenantId, {
      employeeId,
      leaveType,
      claimStatus,
      startDate,
      endDate,
    });
  }

  @Post('leaves')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({
    summary: 'Registrar incapacidad/licencia y sincronizar con malla de turnos',
  })
  @ApiCreatedResponse({ description: 'Incapacidad registrada' })
  createLeave(@Request() req: any, @Body() dto: CreateLeaveAndAbsenceDto) {
    return this.noveltiesService.createLeave(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Patch('leaves/:id/claim')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({
    summary: 'Actualizar estado de radicación y cobro ante EPS/ARL',
  })
  updateClaim(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateClaimStatusDto,
  ) {
    return this.noveltiesService.updateClaim(
      req.user.tenantId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Delete('leaves/:id')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({
    summary: 'Eliminar incapacidad y liberar días en la malla de turnos',
  })
  deleteLeave(@Request() req: any, @Param('id') id: string) {
    return this.noveltiesService.deleteLeave(req.user.tenantId, id);
  }

  // ==========================================
  // PRÉSTAMOS & LIBRANZAS
  // ==========================================
  @Get('loans')
  @RequirePermissions('payroll:novelties:read', 'payroll:novelties:manage')
  @ApiOperation({ summary: 'Listar préstamos, libranzas y embargos' })
  listLoans(
    @Request() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: PayrollLoanStatus,
  ) {
    return this.noveltiesService.listLoans(req.user.tenantId, {
      employeeId,
      status,
    });
  }

  @Post('loans')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({ summary: 'Crear nuevo préstamo o libranza' })
  createLoan(@Request() req: any, @Body() dto: CreatePayrollLoanDto) {
    return this.noveltiesService.createLoan(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Patch('loans/:id/status')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({
    summary: 'Actualizar estado del préstamo (PAUSED, CANCELLED, ACTIVE)',
  })
  updateLoanStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLoanStatusDto,
  ) {
    return this.noveltiesService.updateLoanStatus(
      req.user.tenantId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Post('loans/:id/installments')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({ summary: 'Registrar cuota o abono a préstamo' })
  recordLoanInstallment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordLoanInstallmentDto,
  ) {
    return this.noveltiesService.recordLoanInstallment(
      req.user.tenantId,
      id,
      req.user.sub,
      dto,
    );
  }

  // ==========================================
  // CONCEPTOS FIJOS / PERMANENTES
  // ==========================================
  @Get('permanent-concepts')
  @RequirePermissions('payroll:novelties:read', 'payroll:novelties:manage')
  @ApiOperation({
    summary: 'Listar conceptos fijos por empleado o dependencia',
  })
  listPermanentConcepts(
    @Request() req: any,
    @Query('scope') scope?: PermanentConceptScope,
    @Query('employeeId') employeeId?: string,
    @Query('dependencyId') dependencyId?: string,
  ) {
    return this.noveltiesService.listPermanentConcepts(req.user.tenantId, {
      scope,
      employeeId,
      dependencyId,
    });
  }

  @Post('permanent-concepts')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({ summary: 'Crear concepto permanente' })
  createPermanentConcept(
    @Request() req: any,
    @Body() dto: CreatePermanentConceptDto,
  ) {
    return this.noveltiesService.createPermanentConcept(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Delete('permanent-concepts/:id')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({ summary: 'Inactivar concepto permanente' })
  deletePermanentConcept(@Request() req: any, @Param('id') id: string) {
    return this.noveltiesService.deletePermanentConcept(req.user.tenantId, id);
  }

  // ==========================================
  // NOVEDADES VARIABLES DEL PERIODO
  // ==========================================
  @Get('period-novelties')
  @RequirePermissions('payroll:novelties:read', 'payroll:novelties:manage')
  @ApiOperation({ summary: 'Listar novedades variables del periodo' })
  listPeriodNovelties(
    @Request() req: any,
    @Query('periodId') periodId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('conceptId') conceptId?: string,
  ) {
    return this.noveltiesService.listPeriodNovelties(req.user.tenantId, {
      periodId,
      employeeId,
      conceptId,
    });
  }

  @Post('period-novelties')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({ summary: 'Registrar novedad variable individual' })
  createPeriodNovelty(
    @Request() req: any,
    @Body() dto: CreatePeriodNoveltyDto,
  ) {
    return this.noveltiesService.createPeriodNovelty(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Post('period-novelties/bulk-import')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({ summary: 'Importar lote masivo de novedades variables' })
  bulkImportPeriodNovelties(
    @Request() req: any,
    @Body() dto: BulkImportPeriodNoveltiesDto,
  ) {
    return this.noveltiesService.bulkImportPeriodNovelties(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Delete('period-novelties/:id')
  @RequirePermissions('payroll:novelties:manage')
  @ApiOperation({ summary: 'Eliminar novedad variable del periodo' })
  deletePeriodNovelty(@Request() req: any, @Param('id') id: string) {
    return this.noveltiesService.deletePeriodNovelty(req.user.tenantId, id);
  }
}
