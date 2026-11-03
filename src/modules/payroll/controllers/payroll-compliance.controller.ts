import {
  Controller,
  Get,
  Post,
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
import { PayrollComplianceService } from '../services/payroll-compliance.service';
import {
  GeneratePilaBatchDto,
  QueryPilaLinesDto,
  GenerateElectronicBatchDto,
  CreateAdjustmentNoteDto,
  QueryElectronicDocumentsDto,
  GenerateAccountingBatchDto,
  GenerateForm220Dto,
  GenerateLaborCertificateDto,
  QueryAccumulatedReportDto,
} from '../dtos/payroll-compliance.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';

@ApiTags('Payroll: Compliance & Reporting')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/compliance')
export class PayrollComplianceController {
  constructor(private readonly service: PayrollComplianceService) {}

  // ============================================================================
  // 1. DASHBOARD & KPIS
  // ============================================================================

  @Get('kpis')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary:
      'Obtener métricas ejecutivas de PILA, DIAN, Contabilidad y Certificados',
  })
  @ApiOkResponse({ description: 'KPIs de cumplimiento externo y reportería' })
  getDashboardKpis(@Request() req: any) {
    return this.service.getComplianceDashboardKpis(req.user.tenantId);
  }

  // ============================================================================
  // 2. PILA (PLANILLA ÚNICA RES. 2388)
  // ============================================================================

  @Post('pila/generate')
  @RequirePermissions('payroll:compliance:manage', 'payroll:manage')
  @ApiOperation({
    summary: 'Generar lote de liquidación de Planilla Única PILA (Res. 2388)',
  })
  @ApiCreatedResponse({
    description: 'Lote PILA generado con partición multi-línea Tipo 2',
  })
  generatePilaBatch(@Request() req: any, @Body() dto: GeneratePilaBatchDto) {
    return this.service.generatePilaBatch(req.user.tenantId, dto, req.user.sub);
  }

  @Get('pila/:batchId')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({ summary: 'Consultar lote PILA y renglones de cotizantes' })
  @ApiOkResponse({
    description: 'Detalle de lote PILA con líneas y filtros de novedades',
  })
  getPilaBatch(
    @Request() req: any,
    @Param('batchId') batchId: string,
    @Query() query: QueryPilaLinesDto,
  ) {
    return this.service.getPilaBatch(req.user.tenantId, batchId, query);
  }

  @Get('pila/:batchId/export-txt')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary:
      'Descargar archivo plano oficial .TXT para operadores PILA (SOI, MiPlanilla, etc.)',
  })
  async exportPilaFlatFile(
    @Request() req: any,
    @Response() res: any,
    @Param('batchId') batchId: string,
  ) {
    const file = await this.service.exportPilaFlatFile(
      req.user.tenantId,
      batchId,
    );
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    return res.end(file.content);
  }

  @Get('pila/:batchId/export-csv')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary:
      'Descargar archivo .CSV de auditoría PILA para soporte B2B y RENOVA',
  })
  async exportPilaAuditCsv(
    @Request() req: any,
    @Response() res: any,
    @Param('batchId') batchId: string,
  ) {
    const file = await this.service.exportPilaAuditCsv(
      req.user.tenantId,
      batchId,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    return res.end(file.content);
  }

  // ============================================================================
  // 3. NÓMINA ELECTRÓNICA DIAN (RES. 000013)
  // ============================================================================

  @Post('electronic/generate')
  @RequirePermissions('payroll:compliance:manage', 'payroll:manage')
  @ApiOperation({
    summary:
      'Generar lote mensual de Nómina Electrónica DIAN (UBL 2.1 / Dataico / The Factory HKA)',
  })
  @ApiCreatedResponse({
    description: 'Lote de nómina electrónica generado con CUNE SHA-384',
  })
  generateElectronicBatch(
    @Request() req: any,
    @Body() dto: GenerateElectronicBatchDto,
  ) {
    return this.service.generateElectronicBatch(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @Get('electronic/:batchId')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary: 'Consultar lote y documentos de Nómina Electrónica',
  })
  @ApiOkResponse({
    description:
      'Detalle de lote de nómina electrónica con bandeja de rechazos',
  })
  getElectronicBatch(
    @Request() req: any,
    @Param('batchId') batchId: string,
    @Query() query: QueryElectronicDocumentsDto,
  ) {
    return this.service.getElectronicBatch(req.user.tenantId, batchId, query);
  }

  @Post('electronic/documents/:docId/transmit')
  @RequirePermissions('payroll:compliance:manage', 'payroll:manage')
  @ApiOperation({
    summary:
      'Emitir / transmitir documento electrónico individual a la DIAN / Proveedor',
  })
  @ApiOkResponse({ description: 'Documento transmitido con CUNE aceptado' })
  transmitElectronicDocument(
    @Request() req: any,
    @Param('docId') docId: string,
  ) {
    return this.service.transmitElectronicDocument(
      req.user.tenantId,
      docId,
      req.user.sub,
    );
  }

  @Post('electronic/batches/:batchId/transmit-all')
  @RequirePermissions('payroll:compliance:manage', 'payroll:manage')
  @ApiOperation({
    summary:
      'Emitir / transmitir todos los documentos validados del lote a la DIAN',
  })
  @ApiOkResponse({ description: 'Lote transmitido en su totalidad' })
  transmitAllElectronicBatch(
    @Request() req: any,
    @Param('batchId') batchId: string,
  ) {
    return this.service.transmitAllElectronicBatch(
      req.user.tenantId,
      batchId,
      req.user.sub,
    );
  }

  @Post('electronic/documents/:docId/adjustment-note')
  @RequirePermissions('payroll:compliance:manage', 'payroll:manage')
  @ApiOperation({
    summary:
      'Crear Nota de Ajuste (Tipo 103: Reemplazar o Eliminar) sobre documento transmitido',
  })
  @ApiCreatedResponse({ description: 'Nota de Ajuste creada' })
  createAdjustmentNote(
    @Request() req: any,
    @Param('docId') docId: string,
    @Body() dto: CreateAdjustmentNoteDto,
  ) {
    return this.service.createAdjustmentNote(
      req.user.tenantId,
      docId,
      dto,
      req.user.sub,
    );
  }

  // ============================================================================
  // 4. INTERFAZ CONTABLE (WORLD OFFICE / HELISA)
  // ============================================================================

  @Post('accounting/generate')
  @RequirePermissions('payroll:compliance:manage', 'payroll:manage')
  @ApiOperation({
    summary:
      'Generar comprobante contable de nómina con partida doble (World Office o Helisa)',
  })
  @ApiCreatedResponse({
    description: 'Lote contable generado y validado partida doble',
  })
  generateAccountingBatch(
    @Request() req: any,
    @Body() dto: GenerateAccountingBatchDto,
  ) {
    return this.service.generateAccountingBatch(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @Get('accounting/:batchId')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary:
      'Consultar comprobante contable y renglones por centro de costo y PUC',
  })
  @ApiOkResponse({ description: 'Detalle de asiento contable' })
  getAccountingBatch(@Request() req: any, @Param('batchId') batchId: string) {
    return this.service.getAccountingBatch(req.user.tenantId, batchId);
  }

  @Get('accounting/:batchId/export-csv')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary:
      'Descargar archivo CSV oficial para importación directa en World Office o Helisa',
  })
  async exportAccountingCsv(
    @Request() req: any,
    @Response() res: any,
    @Param('batchId') batchId: string,
  ) {
    const file = await this.service.exportAccountingCsv(
      req.user.tenantId,
      batchId,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    return res.end(file.content);
  }

  // ============================================================================
  // 5. CERTIFICADOS (FORMULARIO 220 DIAN & CONSTANCIAS LABORALES)
  // ============================================================================

  @Post('certificates/form-220/generate')
  @RequirePermissions('payroll:compliance:manage', 'payroll:manage')
  @ApiOperation({
    summary:
      'Consolidar y generar Certificados de Ingresos y Retenciones Formulario 220 DIAN',
  })
  @ApiCreatedResponse({
    description: 'Certificados 220 generados por trabajador',
  })
  generateForm220Certificates(
    @Request() req: any,
    @Body() dto: GenerateForm220Dto,
  ) {
    return this.service.generateForm220Certificates(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @Get('certificates/form-220')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary: 'Listar Certificados Formulario 220 DIAN por año gravable',
  })
  @ApiOkResponse({ description: 'Listado de certificados 220' })
  getForm220Certificates(
    @Request() req: any,
    @Query('year') year: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const numYear = year ? parseInt(year, 10) : new Date().getFullYear() - 1;
    return this.service.getForm220Certificates(
      req.user.tenantId,
      numYear,
      employeeId,
    );
  }

  @Get('certificates/form-220/:certId/pdf')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary: 'Descargar PDF oficial Formulario 220 DIAN con Código QR',
  })
  async downloadForm220Pdf(
    @Request() req: any,
    @Response() res: any,
    @Param('certId') certId: string,
  ) {
    const pdfBuffer = await this.service.downloadForm220Pdf(
      req.user.tenantId,
      certId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="formulario-220-${certId.substring(0, 8)}.pdf"`,
    );
    return res.end(pdfBuffer);
  }

  @Post('certificates/labor/pdf')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary:
      'Generar y descargar Constancia Laboral en PDF con Código QR de verificación',
  })
  async downloadLaborCertificatePdf(
    @Request() req: any,
    @Response() res: any,
    @Body() dto: GenerateLaborCertificateDto,
  ) {
    const pdfBuffer = await this.service.downloadLaborCertificatePdf(
      req.user.tenantId,
      dto,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="constancia-laboral-${dto.employeeId.substring(0, 8)}.pdf"`,
    );
    return res.end(pdfBuffer);
  }

  // ============================================================================
  // 6. REPORTERÍA BI & ACUMULADOS ANUALES
  // ============================================================================

  @Get('reports/annual-accumulated')
  @RequirePermissions('payroll:compliance:read', 'payroll:read')
  @ApiOperation({
    summary:
      'Consultar Matriz Anual de Acumulados BI (12 meses Enero-Diciembre)',
  })
  @ApiOkResponse({
    description:
      'Matriz de acumulados por trabajador, centro de costo y concepto',
  })
  getAnnualAccumulatedReport(
    @Request() req: any,
    @Query() dto: QueryAccumulatedReportDto,
  ) {
    return this.service.getAnnualAccumulatedReport(req.user.tenantId, {
      ...dto,
      year: dto.year ? Number(dto.year) : new Date().getFullYear(),
    });
  }
}
