import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';
import { PayrollSettlementService } from '../services/payroll-settlement.service';
import {
  LiquidatePeriodDto,
  ManualEditSettlementDto,
  GenerateAdvanceDto,
  UpdateAdvanceItemDto,
  GenerateAchFileDto,
  SendPayslipsEmailDto,
  QuerySettlementsDto,
} from '../dtos/payroll-settlement.dto';

@ApiTags('Nómina: Liquidación y Bancos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/settlement')
export class PayrollSettlementController {
  private readonly logger = new Logger(PayrollSettlementController.name);

  constructor(private readonly service: PayrollSettlementService) {}

  // 1. KPIs de Resumen
  @Get('kpis')
  @RequirePermissions('payroll:settlement:read')
  @ApiOperation({ summary: 'KPIs resumen de pre-nómina para un periodo' })
  @ApiOkResponse({
    description:
      'Métricas de empleados, devengos, deducciones, neto y advertencias',
  })
  getKpis(@Req() req: any, @Query('periodId') periodId: string) {
    return this.service.getKpis(req.user.tenantId, periodId);
  }

  // 2. Liquidación Masiva
  @Post('liquidate/:periodId')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary: 'Ejecutar liquidación de periodo (motor determinístico base 30)',
  })
  @ApiCreatedResponse({ description: 'Resultado de liquidación masiva' })
  liquidatePeriod(
    @Req() req: any,
    @Param('periodId') periodId: string,
    @Body() dto: LiquidatePeriodDto,
  ) {
    return this.service.liquidatePeriod(
      req.user.tenantId,
      periodId,
      dto,
      req.user.sub || req.user.id,
    );
  }

  // 3. Exportación de Auditoría Excel
  @Get('periods/:periodId/export/excel')
  @RequirePermissions('payroll:settlement:read')
  @ApiOperation({
    summary: 'Exportar auditoría de nómina en Excel multipestaña (.xlsx)',
  })
  @ApiOkResponse({ description: 'Archivo binario Excel (.xlsx)' })
  async exportExcel(
    @Req() req: any,
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.service.exportExcelWorkbook(
        req.user.tenantId,
        periodId,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nomina_auditoria_${periodId}.xlsx"`,
      );
      return res.send(buffer);
    } catch (err: any) {
      this.logger.error(
        `Error exportando Excel de nómina [periodId=${periodId}]: ${err.message}`,
      );
      return res.status(500).json({ statusCode: 500, message: err.message });
    }
  }

  // 4. Descarga Masiva o Individual de Desprendibles PDF
  @Get('periods/:periodId/payslips/pdf')
  @RequirePermissions('payroll:settlement:read')
  @ApiOperation({
    summary:
      'Descargar desprendibles de nómina en PDF (individual o consolidado)',
  })
  @ApiOkResponse({ description: 'Archivo PDF del o los desprendibles' })
  async downloadPayslipsPdf(
    @Req() req: any,
    @Param('periodId') periodId: string,
    @Query('employeeId') employeeId: string,
    @Query('groupOvertime') groupOvertime: string,
    @Res() res: Response,
  ) {
    try {
      const isGrouped = groupOvertime === 'true';
      const { buffer, filename } = await this.service.getPayslipsPdf(
        req.user.tenantId,
        periodId,
        employeeId || undefined,
        isGrouped,
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(buffer);
    } catch (err: any) {
      this.logger.error(
        `Error generando PDF de desprendibles [periodId=${periodId}]: ${err.message}`,
      );
      return res.status(500).json({ statusCode: 500, message: err.message });
    }
  }

  // 5. Envío Masivo de Desprendibles por Email
  @Post('periods/:periodId/payslips/send-email')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary:
      'Enviar desprendibles oficiales con PDF adjunto por correo electrónico',
  })
  @ApiCreatedResponse({
    description: 'Resultado del lote de despacho de correos',
  })
  sendPayslipsEmail(
    @Req() req: any,
    @Param('periodId') periodId: string,
    @Body() dto: SendPayslipsEmailDto,
  ) {
    return this.service.sendPayslipsEmail(req.user.tenantId, periodId, dto);
  }

  // 6. Cierre Definitivo de Periodo
  @Post('periods/:periodId/close')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary:
      'Cerrar periodo definitivamente (amortiza cuotas y bloquea turnos)',
  })
  @ApiCreatedResponse({ description: 'Periodo cerrado exitosamente' })
  closePeriod(@Req() req: any, @Param('periodId') periodId: string) {
    return this.service.closePeriod(
      req.user.tenantId,
      periodId,
      req.user.sub || req.user.id,
    );
  }

  // 7. Reapertura de Periodo
  @Post('periods/:periodId/reopen')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary: 'Reabrir periodo cerrado (revierte cuotas y desbloquea)',
  })
  @ApiCreatedResponse({ description: 'Periodo reabierto en modo borrador' })
  reopenPeriod(@Req() req: any, @Param('periodId') periodId: string) {
    return this.service.reopenPeriod(
      req.user.tenantId,
      periodId,
      req.user.sub || req.user.id,
    );
  }

  // 8. Lista de Liquidaciones del Periodo
  @Get('periods/:periodId')
  @RequirePermissions('payroll:settlement:read')
  @ApiOperation({
    summary: 'Listar renglones de pre-nómina liquidados para un periodo',
  })
  @ApiOkResponse({
    description: 'Detalle de liquidaciones por empleado con líneas',
  })
  findSettlements(
    @Req() req: any,
    @Param('periodId') periodId: string,
    @Query() query: QuerySettlementsDto,
  ) {
    return this.service.findSettlements(req.user.tenantId, periodId, query);
  }

  // 9. Generar Lote de Anticipos Quincenales
  @Post('advances/generate')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary: 'Generar cálculo de anticipos de quincena (Día 15)',
  })
  @ApiCreatedResponse({
    description: 'Lote de anticipos generado con detalle por empleado',
  })
  generateAdvances(@Req() req: any, @Body() dto: GenerateAdvanceDto) {
    return this.service.generateAdvanceSettlement(
      req.user.tenantId,
      dto,
      req.user.sub || req.user.id,
    );
  }

  // 10. Consultar Lote de Anticipos por Año y Mes
  @Get('advances')
  @RequirePermissions('payroll:settlement:read')
  @ApiOperation({ summary: 'Consultar anticipo quincenal por año y mes' })
  @ApiOkResponse({ description: 'Cabecera e items de anticipo' })
  findAdvances(
    @Req() req: any,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.service.findAdvanceSettlement(req.user.tenantId, year, month);
  }

  // 11. Modificar Monto Aprobado de Anticipo
  @Patch('advances/items/:itemId')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary: 'Ajustar monto aprobado de anticipo para un empleado',
  })
  @ApiOkResponse({ description: 'Item de anticipo actualizado' })
  updateAdvanceItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateAdvanceItemDto,
  ) {
    return this.service.updateAdvanceItem(
      req.user.tenantId,
      itemId,
      dto,
      req.user.sub || req.user.id,
    );
  }

  // 12. Aprobar Lote de Anticipos
  @Post('advances/:advanceId/approve')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary: 'Aprobar lote de anticipos para dispersión bancaria',
  })
  @ApiCreatedResponse({ description: 'Lote de anticipos aprobado' })
  approveAdvances(@Req() req: any, @Param('advanceId') advanceId: string) {
    return this.service.approveAdvanceSettlement(
      req.user.tenantId,
      advanceId,
      req.user.sub || req.user.id,
    );
  }

  // 13. Generar Archivo Plano Bancario ACH
  @Post('ach/generate')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary:
      'Generar archivo plano ACH para dispersión bancaria (PAB / Estándar)',
  })
  @ApiCreatedResponse({
    description: 'Archivo plano generado y registrado en auditoría',
  })
  generateAch(@Req() req: any, @Body() dto: GenerateAchFileDto) {
    return this.service.generateAchFile(
      req.user.tenantId,
      dto,
      req.user.sub || req.user.id,
    );
  }

  // 14. Detalle Individual de Liquidación
  @Get(':settlementId')
  @RequirePermissions('payroll:settlement:read')
  @ApiOperation({
    summary:
      'Obtener detalle de una liquidación individual con todos sus renglones',
  })
  @ApiOkResponse({ description: 'Detalle de liquidación' })
  getSettlementById(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
  ) {
    return this.service.getSettlementById(req.user.tenantId, settlementId);
  }

  // 15. Edición Manual de Renglones en Pre-Nómina
  @Put(':settlementId/manual-edit')
  @RequirePermissions('payroll:settlement:manage')
  @ApiOperation({
    summary: 'Edición manual de renglones en pre-nómina por parte del analista',
  })
  @ApiOkResponse({ description: 'Liquidación recalculada y actualizada' })
  manualEditSettlement(
    @Req() req: any,
    @Param('settlementId') settlementId: string,
    @Body() dto: ManualEditSettlementDto,
  ) {
    return this.service.manualEditSettlement(
      req.user.tenantId,
      settlementId,
      dto,
      req.user.sub || req.user.id,
    );
  }
}
