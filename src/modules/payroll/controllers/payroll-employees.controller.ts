import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';
import { PayrollEmployeesService } from '../services/payroll-employees.service';
import {
  UpsertPayrollProfileDto,
  CreateFamilyMemberDto,
  UpdateRequirementCheckDto,
  CreateSvspCourseDto,
  CreateInternalTrainingDto,
  QueryPayrollEmployeesDto,
} from '../dtos/payroll-employee-dossier.dto';

@ApiTags('Payroll: Employee Dossier & SVSP')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/employees')
export class PayrollEmployeesController {
  private readonly logger = new Logger(PayrollEmployeesController.name);

  constructor(private readonly service: PayrollEmployeesService) {}

  @Get()
  @RequirePermissions('payroll:employees:read')
  @ApiOperation({
    summary:
      'Listar empleados enriquecidos con perfil de nómina y semáforos SVSP',
  })
  @ApiOkResponse({
    description: 'Padrón de empleados con perfil de nómina y semáforo',
  })
  async findEmployees(
    @Req() req: any,
    @Query() query: QueryPayrollEmployeesDto,
  ) {
    try {
      return await this.service.findEmployees(req.user.tenantId, query);
    } catch (err: any) {
      this.logger.error(
        `Error al listar empleados con nómina: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Get('kpis')
  @RequirePermissions('payroll:employees:read')
  @ApiOperation({
    summary: 'Obtener KPIs operativos de nómina y cumplimiento SVSP',
  })
  @ApiOkResponse({ description: 'Indicadores ejecutivos del padrón laboral' })
  async getKpis(@Req() req: any) {
    try {
      return await this.service.getKpis(req.user.tenantId);
    } catch (err: any) {
      this.logger.error(
        `Error al obtener KPIs de nómina: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Get('svsp/export-renova')
  @RequirePermissions('payroll:svsp:export')
  @ApiOperation({
    summary: 'Descargar archivo Excel oficial RENOVA para SuperVigilancia',
  })
  @ApiResponse({ status: 200, description: 'Archivo binario Excel .xlsx' })
  async exportRenovaExcel(@Req() req: any, @Res() res: Response) {
    try {
      const buffer = await this.service.exportRenovaExcel(req.user.tenantId);
      const filename = `RENOVA_SUPERVIGILANCIA_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(buffer);
    } catch (err: any) {
      this.logger.error(
        `Error exportando Excel RENOVA: ${err?.message || err}`,
        err?.stack,
      );
      res.status(500).json({ message: 'Error generando reporte RENOVA' });
    }
  }

  @Get(':employeeId/dossier')
  @RequirePermissions('payroll:employees:read')
  @ApiOperation({
    summary: 'Consultar Expediente Laboral 360° completo de un empleado',
  })
  @ApiOkResponse({
    description:
      'Ficha completa contractual, PILA, ACH, DANE, requisitos, cursos y capacitaciones',
  })
  async getEmployeeDossier(
    @Req() req: any,
    @Param('employeeId') employeeId: string,
  ) {
    try {
      return await this.service.getEmployeeDossier(
        req.user.tenantId,
        employeeId,
      );
    } catch (err: any) {
      this.logger.error(
        `Error al obtener expediente 360° [${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Put(':employeeId/profile')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({
    summary: 'Crear o actualizar perfil de nómina 360° del empleado',
  })
  @ApiOkResponse({ description: 'Perfil de nómina actualizado' })
  async upsertPayrollProfile(
    @Req() req: any,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpsertPayrollProfileDto,
  ) {
    try {
      return await this.service.upsertPayrollProfile(
        req.user.tenantId,
        employeeId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error al actualizar perfil de nómina [${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Post(':employeeId/family-members')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({
    summary: 'Agregar integrante al grupo familiar del empleado',
  })
  @ApiOkResponse({ description: 'Integrante familiar creado' })
  async addFamilyMember(
    @Req() req: any,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateFamilyMemberDto,
  ) {
    try {
      return await this.service.addFamilyMember(
        req.user.tenantId,
        employeeId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error agregando miembro familiar [${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Delete('family-members/:id')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({ summary: 'Eliminar integrante del grupo familiar' })
  @ApiOkResponse({ description: 'Integrante eliminado' })
  async deleteFamilyMember(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.deleteFamilyMember(req.user.tenantId, id);
    } catch (err: any) {
      this.logger.error(
        `Error eliminando miembro familiar [${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Put(':employeeId/requirements/:requirementId')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({
    summary: 'Actualizar verificación de requisito de contratación',
  })
  @ApiOkResponse({ description: 'Requisito de contratación actualizado' })
  async updateRequirementCheck(
    @Req() req: any,
    @Param('employeeId') employeeId: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: UpdateRequirementCheckDto,
  ) {
    try {
      return await this.service.updateRequirementCheck(
        req.user.tenantId,
        employeeId,
        requirementId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error actualizando requisito de contratación [${requirementId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Post(':employeeId/svsp-courses')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({ summary: 'Registrar curso o acreditación SVSP' })
  @ApiOkResponse({ description: 'Curso SVSP registrado' })
  async addSvspCourse(
    @Req() req: any,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateSvspCourseDto,
  ) {
    try {
      return await this.service.addSvspCourse(
        req.user.tenantId,
        employeeId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error registrando curso SVSP [${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Delete('svsp-courses/:id')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({ summary: 'Eliminar registro de curso SVSP' })
  @ApiOkResponse({ description: 'Curso SVSP eliminado' })
  async deleteSvspCourse(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.deleteSvspCourse(req.user.tenantId, id);
    } catch (err: any) {
      this.logger.error(
        `Error eliminando curso SVSP [${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Post(':employeeId/trainings')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({ summary: 'Registrar capacitación interna Cap/SOMA' })
  @ApiOkResponse({ description: 'Capacitación interna registrada' })
  async addInternalTraining(
    @Req() req: any,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateInternalTrainingDto,
  ) {
    try {
      return await this.service.addInternalTraining(
        req.user.tenantId,
        employeeId,
        dto,
      );
    } catch (err: any) {
      this.logger.error(
        `Error registrando capacitación [${employeeId}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  @Delete('trainings/:id')
  @RequirePermissions('payroll:employees:manage')
  @ApiOperation({ summary: 'Eliminar registro de capacitación interna' })
  @ApiOkResponse({ description: 'Capacitación eliminada' })
  async deleteInternalTraining(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.deleteInternalTraining(req.user.tenantId, id);
    } catch (err: any) {
      this.logger.error(
        `Error eliminando capacitación [${id}]: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }
}
