import {
  Controller,
  Body,
  Param,
  Post,
  Get,
  Patch,
  Delete,
  UseGuards,
  Req,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';
import { FeatureGuard } from '../access-control/feature.guard';
import { RequireFeature } from '../access-control/feature.decorator';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  DeletedEmployeeDto,
  AssignEmployeeClientDto,
  UnassignEmployeeClientDto,
  EnableEmployeeUserDto,
} from './dtos/index';

@ApiTags('Employee')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @RequirePermissions('employee:manage', 'employee:create')
  @ApiOperation({ summary: 'Create employee' })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiOkResponse({
    description: 'Employee created successfully.',
    type: EmployeeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data or duplicate document' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  create(@Req() req: any, @Body() dto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(req.user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('employee:manage', 'employee:read')
  @ApiOperation({ summary: 'List all employees' })
  @ApiOkResponse({
    description: 'Employees listed successfully.',
    type: [EmployeeResponseDto],
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  findAll() {
    return this.employeeService.findAll();
  }

  @Get('search/autocomplete')
  @RequirePermissions(
    'employee:manage',
    'employee:read',
    'minuta:manage',
    'minuta:create',
    'minuta:read',
  )
  @ApiOperation({
    summary: 'Search active employees with autocomplete by name or document',
  })
  autocomplete(
    @Query('query') query: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    return this.employeeService.autocomplete(
      query,
      req.user.tenantId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('/active/:document')
  @RequirePermissions('employee:manage', 'employee:read')
  @ApiOperation({ summary: 'Get active employee by document' })
  @ApiOkResponse({
    description: 'Employee found successfully.',
    type: EmployeeResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  getByDocument(@Req() req: any, @Param('document') document: string) {
    return this.employeeService.findActiveByDocument(document);
  }

  @Get('/any/:id')
  @RequirePermissions('employee:manage', 'employee:read')
  @ApiOperation({ summary: 'Get active or inactive employee by id' })
  @ApiOkResponse({
    description: 'Employee found successfully.',
    type: EmployeeResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  getAnyById(@Req() req: any, @Param('id') id: string) {
    return this.employeeService.findAnyEmployeeById(id);
  }

  @Patch(':id')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({ summary: 'Update employee' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiOkResponse({
    description: 'Employee updated successfully.',
    type: EmployeeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('employee:manage', 'employee:delete')
  @ApiOperation({ summary: 'Soft delete employee' })
  @ApiOkResponse({
    description: 'Employee deleted successfully.',
    type: DeletedEmployeeDto,
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  async remove(@Param('id') id: string): Promise<DeletedEmployeeDto> {
    return this.employeeService.softDeleteEmployee(id);
  }

  @Patch(':id/retire')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({ summary: 'Retire employee' })
  @ApiOkResponse({
    description: 'Employee retired successfully.',
    type: EmployeeResponseDto,
  })
  async retire(@Param('id') id: string): Promise<EmployeeResponseDto> {
    return this.employeeService.retireEmployee(id);
  }

  @Patch(':id/reactivate')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({ summary: 'Reactivate employee' })
  @ApiOkResponse({
    description: 'Employee reactivated successfully.',
    type: EmployeeResponseDto,
  })
  async reactivate(@Param('id') id: string): Promise<EmployeeResponseDto> {
    return this.employeeService.reactivateEmployee(id);
  }

  @Get(':id/workforce-summary')
  @RequirePermissions('employee:manage', 'employee:read')
  @ApiOperation({
    summary:
      'Consolidated workforce profile including user and multi-client assignments',
  })
  getWorkforceSummary(@Param('id') id: string) {
    return this.employeeService.getWorkforceSummary(id);
  }

  @Post(':id/assign-client')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({ summary: 'Assign or link employee to a client' })
  @ApiBody({ type: AssignEmployeeClientDto })
  @ApiOkResponse({
    description: 'Client assigned successfully to employee.',
    type: EmployeeResponseDto,
  })
  assignClientPost(
    @Param('id') id: string,
    @Body() dto: AssignEmployeeClientDto,
    @Req() req: any,
  ) {
    const recordedBy = req.user?.email || req.user?.id || 'Sistema';
    return this.employeeService.assignClient(id, dto, recordedBy);
  }

  @Patch(':id/assign-client')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({ summary: 'Assign or transfer employee to a client' })
  @ApiBody({ type: AssignEmployeeClientDto })
  @ApiOkResponse({
    description: 'Client assigned successfully to employee.',
    type: EmployeeResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Employee or Client not found.' })
  @ApiBadRequestResponse({ description: 'Invalid dates or retired employee.' })
  assignClient(
    @Param('id') id: string,
    @Body() dto: AssignEmployeeClientDto,
    @Req() req: any,
  ) {
    const recordedBy = req.user?.email || req.user?.id || 'Sistema';
    return this.employeeService.assignClient(id, dto, recordedBy);
  }

  @Post(':id/unassign-client')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({
    summary: 'Unassign employee from specific or current client',
  })
  @ApiBody({ type: UnassignEmployeeClientDto })
  @ApiOkResponse({
    description: 'Employee unassigned successfully from client.',
    type: EmployeeResponseDto,
  })
  unassignClientPost(
    @Param('id') id: string,
    @Body() dto: UnassignEmployeeClientDto,
    @Req() req: any,
  ) {
    const recordedBy = req.user?.email || req.user?.id || 'Sistema';
    return this.employeeService.unassignClient(id, dto, recordedBy);
  }

  @Patch(':id/unassign-client')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({ summary: 'Unassign employee from current client' })
  @ApiBody({ type: UnassignEmployeeClientDto })
  @ApiOkResponse({
    description: 'Employee unassigned successfully from client.',
    type: EmployeeResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiBadRequestResponse({
    description: 'Employee has no active client assignment.',
  })
  unassignClient(
    @Param('id') id: string,
    @Body() dto: UnassignEmployeeClientDto,
    @Req() req: any,
  ) {
    const recordedBy = req.user?.email || req.user?.id || 'Sistema';
    return this.employeeService.unassignClient(id, dto, recordedBy);
  }

  @Post(':id/enable-user')
  @RequirePermissions('employee:manage', 'employee:update')
  @ApiOperation({
    summary:
      'Enable digital user account for employee and inherit client assignments',
  })
  @ApiBody({ type: EnableEmployeeUserDto })
  enableUser(
    @Param('id') id: string,
    @Body() dto: EnableEmployeeUserDto,
    @Req() req: any,
  ) {
    const recordedBy = req.user?.email || req.user?.id || 'Sistema';
    return this.employeeService.enableUser(id, dto, recordedBy);
  }

  @Post('import/csv')
  @RequirePermissions('employee:manage', 'employee:create')
  @ApiOperation({ summary: 'Bulk import employees from JSON/CSV payload' })
  importCsv(
    @Body()
    body: {
      data: Array<Record<string, string>>;
      fileName?: string;
    },
    @Request() req,
  ) {
    return this.employeeService.importEmployeesFromCsv(
      body.data || [],
      body.fileName || 'empleados.csv',
      req.user,
    );
  }
}
