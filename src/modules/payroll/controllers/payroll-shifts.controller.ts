import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { PayrollShiftsService } from '../services/payroll-shifts.service';
import {
  CreateShiftSequenceDto,
  CreateDependencyAssignmentDto,
  UpdateDependencyAssignmentDto,
  GenerateMonthShiftsDto,
  BulkUpdateShiftRecordsDto,
  CreateReinforcementShiftDto,
} from '../dtos/payroll-shifts.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';

@ApiTags('Payroll: Shift Scheduling & Post Rotation')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/shifts')
export class PayrollShiftsController {
  constructor(private readonly shiftsService: PayrollShiftsService) {}

  // ==========================================
  // CATÁLOGO DE SECUENCIAS
  // ==========================================
  @Get('sequences')
  @RequirePermissions('payroll:shifts:read', 'payroll:shifts:manage')
  @ApiOperation({
    summary: 'Listar secuencias cíclicas de turnos (2X2X2, 4X2, etc.)',
  })
  listSequences(@Request() req: any) {
    return this.shiftsService.listSequences(req.user.tenantId);
  }

  @Post('sequences')
  @RequirePermissions('payroll:shifts:manage')
  @ApiOperation({ summary: 'Crear nueva secuencia de turno' })
  createSequence(@Request() req: any, @Body() dto: CreateShiftSequenceDto) {
    return this.shiftsService.createSequence(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  // ==========================================
  // ASIGNACIÓN Y ROTACIÓN DE PUESTOS
  // ==========================================
  @Get('assignments')
  @RequirePermissions('payroll:shifts:read', 'payroll:shifts:manage')
  @ApiOperation({
    summary: 'Listar asignaciones y rotaciones de empleados en puestos',
  })
  listAssignments(
    @Request() req: any,
    @Query('dependencyId') dependencyId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.shiftsService.listAssignments(req.user.tenantId, {
      dependencyId,
      employeeId,
      isActive: activeBool,
    });
  }

  @Post('assignments')
  @RequirePermissions('payroll:shifts:manage')
  @ApiOperation({ summary: 'Asignar empleado a un puesto con secuencia y rol' })
  createAssignment(
    @Request() req: any,
    @Body() dto: CreateDependencyAssignmentDto,
  ) {
    return this.shiftsService.createAssignment(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Patch('assignments/:id')
  @RequirePermissions('payroll:shifts:manage')
  @ApiOperation({
    summary: 'Actualizar vigencia, rol o secuencia de la asignación',
  })
  updateAssignment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDependencyAssignmentDto,
  ) {
    return this.shiftsService.updateAssignment(
      req.user.tenantId,
      id,
      req.user.sub,
      dto,
    );
  }

  // ==========================================
  // MALLA MENSUAL INTERACTIVA DE TURNOS
  // ==========================================
  @Get('grid')
  @RequirePermissions('payroll:shifts:read', 'payroll:shifts:manage')
  @ApiOperation({ summary: 'Consultar grilla mensual de turnos 1..31' })
  getGrid(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('dependencyId') dependencyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.shiftsService.getGrid(req.user.tenantId, {
      year: y,
      month: m,
      dependencyId,
      branchId,
    });
  }

  @Post('generate-month')
  @RequirePermissions('payroll:shifts:manage')
  @ApiOperation({
    summary: 'Proyectar y generar turnos del mes para puestos activos',
  })
  generateMonth(@Request() req: any, @Body() dto: GenerateMonthShiftsDto) {
    return this.shiftsService.generateMonth(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Put('records/bulk')
  @RequirePermissions('payroll:shifts:manage')
  @ApiOperation({
    summary: 'Actualizar o sobreescribir celdas de la malla en caliente',
  })
  bulkUpdateRecords(
    @Request() req: any,
    @Body() dto: BulkUpdateShiftRecordsDto,
  ) {
    return this.shiftsService.bulkUpdateRecords(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Post('reinforcements')
  @RequirePermissions('payroll:shifts:manage')
  @ApiOperation({
    summary: 'Registrar turno de refuerzo / apoyo extraordinario facturable',
  })
  createReinforcement(
    @Request() req: any,
    @Body() dto: CreateReinforcementShiftDto,
  ) {
    return this.shiftsService.createReinforcement(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }
}
