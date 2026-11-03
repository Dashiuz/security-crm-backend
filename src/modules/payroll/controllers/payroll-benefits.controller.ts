import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PayrollBenefitsService } from '../services/payroll-benefits.service';
import {
  SimulateVacationDto,
  CreateVacationSettlementDto,
  GenerateSocialBenefitBatchDto,
  UpdateSocialBenefitItemDto,
  InjectBenefitToPayrollDto,
  SimulateFinalLiquidationDto,
  CreateFinalContractSettlementDto,
} from '../dtos/payroll-benefits.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';

@ApiTags('Payroll: Benefits & Liquidation')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/benefits')
export class PayrollBenefitsController {
  constructor(private readonly benefitsService: PayrollBenefitsService) {}

  // ============================================================================
  // 1. KPIS & OVERVIEW
  // ============================================================================

  @Get('kpis')
  @RequirePermissions('payroll:benefits:read', 'payroll:benefits:manage')
  @ApiOperation({
    summary:
      'Obtener métricas ejecutivas de prestaciones y libro de vacaciones',
  })
  @ApiOkResponse({ description: 'KPIs de prestaciones' })
  getBenefitsKpis(@Request() req: any) {
    return this.benefitsService.getBenefitsKpis(req.user.tenantId);
  }

  // ============================================================================
  // 2. VACACIONES Y LIBRO DE SALDOS
  // ============================================================================

  @Get('vacations/book')
  @RequirePermissions('payroll:benefits:read', 'payroll:benefits:manage')
  @ApiOperation({
    summary: 'Consultar Libro de Vacaciones consolidado por empleado',
  })
  @ApiOkResponse({ description: 'Libro de saldos y causación de vacaciones' })
  getVacationBook(@Request() req: any) {
    return this.benefitsService.getVacationBook(req.user.tenantId);
  }

  @Post('vacations/simulate')
  @RequirePermissions('payroll:benefits:read', 'payroll:benefits:manage')
  @ApiOperation({
    summary: 'Simular liquidación y calendario de vacaciones en vivo',
  })
  @ApiOkResponse({
    description: 'Resultado de la simulación con fecha de regreso calculada',
  })
  simulateVacation(@Request() req: any, @Body() dto: SimulateVacationDto) {
    return this.benefitsService.simulateVacation(req.user.tenantId, dto);
  }

  @Post('vacations')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({ summary: 'Crear liquidación de vacaciones en borrador' })
  @ApiCreatedResponse({ description: 'Liquidación de vacaciones creada' })
  createVacation(
    @Request() req: any,
    @Body() dto: CreateVacationSettlementDto,
  ) {
    return this.benefitsService.createVacationSettlement(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Post('vacations/:id/approve')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({
    summary:
      'Aprobar vacaciones y ejecutar sincronización 3-en-1 (Novedades y Malla de Turnos)',
  })
  @ApiOkResponse({ description: 'Vacaciones aprobadas y sincronizadas' })
  approveVacation(@Request() req: any, @Param('id') id: string) {
    return this.benefitsService.approveVacationSettlement(
      req.user.tenantId,
      id,
      req.user.id || req.user.sub,
    );
  }

  @Get('vacations')
  @RequirePermissions(
    'payroll:benefits:read',
    'payroll:benefits:manage',
    'payroll:employees:read',
  )
  @ApiOperation({ summary: 'Listar historial de vacaciones liquidadas' })
  @ApiOkResponse({ description: 'Historial de vacaciones' })
  listVacations(@Request() req: any, @Query('employeeId') employeeId?: string) {
    return this.benefitsService.listVacationSettlements(
      req.user.tenantId,
      employeeId,
    );
  }

  @Get('vacations/:id/pdf')
  @RequirePermissions(
    'payroll:benefits:read',
    'payroll:benefits:manage',
    'payroll:employees:read',
  )
  @ApiOperation({
    summary: 'Descargar comprobante oficial de vacaciones en PDF',
  })
  async getVacationPdf(
    @Request() req: any,
    @Param('id') id: string,
    @Response() res: any,
  ) {
    const pdfBuffer = await this.benefitsService.getVacationSlipPdf(
      req.user.tenantId,
      id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=comprobante-vacaciones-${id.substring(0, 8)}.pdf`,
    );
    return res.end(pdfBuffer);
  }

  // ============================================================================
  // 3. PRIMA DE SERVICIOS Y CESANTÍAS / INTERESES
  // ============================================================================

  @Post('batches/generate')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({
    summary: 'Generar o recalcular lote masivo de Prima o Cesantías/Intereses',
  })
  @ApiCreatedResponse({
    description: 'Lote de prestaciones generado con todos los empleados',
  })
  generateBatch(
    @Request() req: any,
    @Body() dto: GenerateSocialBenefitBatchDto,
  ) {
    return this.benefitsService.generateSocialBenefitBatch(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Get('batches')
  @RequirePermissions('payroll:benefits:read', 'payroll:benefits:manage')
  @ApiOperation({
    summary: 'Listar lotes de prestaciones sociales por año y tipo',
  })
  @ApiOkResponse({ description: 'Lista de lotes' })
  listBatches(@Request() req: any, @Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.benefitsService.listSocialBenefitBatches(
      req.user.tenantId,
      parsedYear,
    );
  }

  @Get('batches/:batchId')
  @RequirePermissions('payroll:benefits:read', 'payroll:benefits:manage')
  @ApiOperation({
    summary:
      'Obtener detalle completo de un lote con discriminación por empleado y fondos',
  })
  @ApiOkResponse({ description: 'Detalle del lote' })
  getBatch(@Request() req: any, @Param('batchId') batchId: string) {
    return this.benefitsService.getSocialBenefitBatch(
      req.user.tenantId,
      batchId,
    );
  }

  @Patch('batches/items/:itemId')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({
    summary:
      'Ajustar manualmente el valor aprobado de prima o cesantías de un empleado',
  })
  @ApiOkResponse({ description: 'Ítem actualizado' })
  updateBatchItem(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateSocialBenefitItemDto,
  ) {
    return this.benefitsService.updateSocialBenefitItem(
      req.user.tenantId,
      itemId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Post('batches/:batchId/approve')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({ summary: 'Aprobar lote de prestaciones sociales' })
  @ApiOkResponse({ description: 'Lote aprobado' })
  approveBatch(@Request() req: any, @Param('batchId') batchId: string) {
    return this.benefitsService.approveSocialBenefitBatch(
      req.user.tenantId,
      batchId,
      req.user.id || req.user.sub,
    );
  }

  @Post('batches/:batchId/inject-to-payroll')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({
    summary:
      'Inyectar valores de prestaciones (Prima o Intereses 12%) como novedades en periodo abierto',
  })
  @ApiOkResponse({ description: 'Resultado de la inyección a nómina' })
  injectToPayroll(
    @Request() req: any,
    @Param('batchId') batchId: string,
    @Body() dto: InjectBenefitToPayrollDto,
  ) {
    return this.benefitsService.injectBenefitToPayroll(
      req.user.tenantId,
      batchId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  // ============================================================================
  // 4. LIQUIDACIÓN DEFINITIVA DE CONTRATO Y PAZ Y SALVO
  // ============================================================================

  @Post('final-settlements/simulate')
  @RequirePermissions('payroll:benefits:read', 'payroll:benefits:manage')
  @ApiOperation({
    summary:
      'Simular liquidación total definitiva de contrato y tiempos base 360',
  })
  @ApiOkResponse({
    description:
      'Simulación detallada con prestaciones proporcionales e indemnización',
  })
  simulateFinalSettlement(
    @Request() req: any,
    @Body() dto: SimulateFinalLiquidationDto,
  ) {
    return this.benefitsService.simulateFinalLiquidation(
      req.user.tenantId,
      dto,
    );
  }

  @Post('final-settlements')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({
    summary: 'Crear liquidación definitiva de contrato en borrador',
  })
  @ApiCreatedResponse({ description: 'Liquidación definitiva creada' })
  createFinalSettlement(
    @Request() req: any,
    @Body() dto: CreateFinalContractSettlementDto,
  ) {
    return this.benefitsService.createFinalContractSettlement(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Post('final-settlements/:id/approve')
  @RequirePermissions('payroll:benefits:manage')
  @ApiOperation({
    summary:
      'Aprobar liquidación definitiva, retirar e inactivar empleado, cerrar puestos y saldar préstamos',
  })
  @ApiOkResponse({
    description: 'Liquidación definitiva aprobada y contrato cerrado',
  })
  approveFinalSettlement(@Request() req: any, @Param('id') id: string) {
    return this.benefitsService.approveFinalContractSettlement(
      req.user.tenantId,
      id,
      req.user.id || req.user.sub,
    );
  }

  @Get('final-settlements')
  @RequirePermissions('payroll:benefits:read', 'payroll:benefits:manage')
  @ApiOperation({ summary: 'Listar liquidaciones definitivas de contrato' })
  @ApiOkResponse({ description: 'Lista de liquidaciones definitivas' })
  listFinalSettlements(@Request() req: any) {
    return this.benefitsService.listFinalContractSettlements(req.user.tenantId);
  }

  @Get('final-settlements/:id/pdf')
  @RequirePermissions(
    'payroll:benefits:read',
    'payroll:benefits:manage',
    'payroll:employees:read',
  )
  @ApiOperation({
    summary:
      'Descargar Acta Oficial de Liquidación Definitiva y Paz y Salvo en PDF',
  })
  async getFinalSettlementPdf(
    @Request() req: any,
    @Param('id') id: string,
    @Response() res: any,
  ) {
    const pdfBuffer = await this.benefitsService.getFinalLiquidationPdf(
      req.user.tenantId,
      id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=acta-liquidacion-paz-y-salvo-${id.substring(0, 8)}.pdf`,
    );
    return res.end(pdfBuffer);
  }
}
