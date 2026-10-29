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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PayrollCatalogsService } from '../services/payroll-catalogs.service';
import {
  CreatePayrollEntityDto,
  UpdatePayrollEntityDto,
  CreatePayrollBankDto,
  UpdatePayrollBankDto,
  CreatePayrollExitReasonDto,
  CreatePayrollSvspLevelDto,
  CreatePayrollAcademyDto,
  UpdatePayrollAcademyDto,
} from '../dtos/payroll-catalog.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';
import { SocialSecurityEntityType } from '@prisma/client';

@ApiTags('Payroll: Catalogs & Pronos Masters')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/catalogs')
export class PayrollCatalogsController {
  constructor(private readonly catalogsService: PayrollCatalogsService) {}

  // 1. Social Security Entities (EPS, AFP, CCF, ARL)
  @Get('entities')
  @RequirePermissions(
    'payroll:settings:read',
    'payroll:settings:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({
    summary: 'Listar entidades de seguridad social (EPS, AFP, CCF, ARL)',
  })
  @ApiOkResponse({
    description: 'Lista de entidades con códigos PILA y equivalencias Pronos',
  })
  listEntities(
    @Request() req: any,
    @Query('type') type?: SocialSecurityEntityType,
  ) {
    return this.catalogsService.listEntities(req.user.tenantId, type);
  }

  @Post('entities')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Crear entidad de seguridad social' })
  @ApiCreatedResponse({ description: 'Entidad creada' })
  createEntity(@Request() req: any, @Body() dto: CreatePayrollEntityDto) {
    return this.catalogsService.createEntity(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Patch('entities/:id')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Actualizar entidad de seguridad social' })
  @ApiOkResponse({ description: 'Entidad actualizada' })
  updateEntity(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollEntityDto,
  ) {
    return this.catalogsService.updateEntity(
      req.user.tenantId,
      id,
      dto,
      req.user.id || req.user.sub,
    );
  }

  // 2. Banks
  @Get('banks')
  @RequirePermissions(
    'payroll:settings:read',
    'payroll:settings:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({ summary: 'Listar catálogo de bancos para dispersión ACH' })
  @ApiOkResponse({ description: 'Lista de bancos comerciales de Colombia' })
  listBanks(@Request() req: any) {
    return this.catalogsService.listBanks(req.user.tenantId);
  }

  @Post('banks')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Crear banco para dispersión de nómina' })
  @ApiCreatedResponse({ description: 'Banco creado' })
  createBank(@Request() req: any, @Body() dto: CreatePayrollBankDto) {
    return this.catalogsService.createBank(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Patch('banks/:id')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Actualizar banco' })
  @ApiOkResponse({ description: 'Banco actualizado' })
  updateBank(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollBankDto,
  ) {
    return this.catalogsService.updateBank(
      req.user.tenantId,
      id,
      dto,
      req.user.id || req.user.sub,
    );
  }

  // 3. Branches
  @Get('branches')
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({ summary: 'Listar sucursales de la empresa' })
  @ApiOkResponse({ description: 'Lista de sucursales con códigos DANE y PILA' })
  listBranches(@Request() req: any) {
    return this.catalogsService.listBranches(req.user.tenantId);
  }

  // 4. Exit Reasons (Pronos 1.14)
  @Get('exit-reasons')
  @RequirePermissions(
    'payroll:settings:read',
    'payroll:settings:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({
    summary: 'Listar motivos de retiro de personal (B.D.N Pronos)',
  })
  @ApiOkResponse({
    description: 'Lista de causales de retiro e indemnización CST Art. 64',
  })
  listExitReasons(@Request() req: any) {
    return this.catalogsService.listExitReasons(req.user.tenantId);
  }

  @Post('exit-reasons')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Crear motivo de retiro' })
  @ApiCreatedResponse({ description: 'Motivo creado' })
  createExitReason(
    @Request() req: any,
    @Body() dto: CreatePayrollExitReasonDto,
  ) {
    return this.catalogsService.createExitReason(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  // 5. Hiring Requirements (Pronos 1.5)
  @Get('hiring-requirements')
  @RequirePermissions(
    'payroll:settings:read',
    'payroll:settings:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({ summary: 'Listar requisitos documentales de contratación' })
  @ApiOkResponse({ description: 'Lista de requisitos de expediente laboral' })
  listHiringRequirements(@Request() req: any) {
    return this.catalogsService.listHiringRequirements(req.user.tenantId);
  }

  // 6. SVSP Levels (Pronos 5.3)
  @Get('svsp-levels')
  @RequirePermissions(
    'payroll:settings:read',
    'payroll:settings:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({
    summary: 'Listar niveles y cursos de capacitación SuperVigilancia',
  })
  @ApiOkResponse({ description: 'Cursos reglamentarios SVSP' })
  listSvspLevels(@Request() req: any) {
    return this.catalogsService.listSvspLevels(req.user.tenantId);
  }

  @Post('svsp-levels')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Crear nivel de capacitación SVSP' })
  @ApiCreatedResponse({ description: 'Nivel creado' })
  createSvspLevel(@Request() req: any, @Body() dto: CreatePayrollSvspLevelDto) {
    return this.catalogsService.createSvspLevel(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  // 7. Periods (Pronos 1.13)
  @Get('periods')
  @RequirePermissions(
    'payroll:dependencies:read',
    'payroll:dependencies:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({
    summary: 'Listar periodos de nómina (quincenales y mensuales)',
  })
  @ApiOkResponse({ description: 'Lista de periodos' })
  listPeriods(@Request() req: any, @Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.catalogsService.listPeriods(req.user.tenantId, parsedYear);
  }

  // 8. Security Academies (Pronos 5.2)
  @Get('academies')
  @RequirePermissions(
    'payroll:settings:read',
    'payroll:settings:manage',
    'payroll:employees:read',
    'payroll:employees:manage',
  )
  @ApiOperation({
    summary:
      'Listar academias de seguridad privada autorizadas por SuperVigilancia',
  })
  @ApiOkResponse({ description: 'Lista de academias de seguridad' })
  listAcademies(@Request() req: any) {
    return this.catalogsService.listAcademies(req.user.tenantId);
  }

  @Post('academies')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Crear academia de seguridad' })
  @ApiCreatedResponse({ description: 'Academia creada' })
  createAcademy(@Request() req: any, @Body() dto: CreatePayrollAcademyDto) {
    return this.catalogsService.createAcademy(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Patch('academies/:id')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({ summary: 'Actualizar academia de seguridad' })
  @ApiOkResponse({ description: 'Academia actualizada' })
  updateAcademy(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollAcademyDto,
  ) {
    return this.catalogsService.updateAcademy(
      req.user.tenantId,
      id,
      dto,
      req.user.id || req.user.sub,
    );
  }
}
