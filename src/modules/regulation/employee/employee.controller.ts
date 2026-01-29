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
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  DeletedEmployeeDto,
} from './dtos/index';

@ApiTags('Employee')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @RequirePermissions('employee:create')
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

  @Get('/active/:document')
  @RequirePermissions('employee:read')
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
  @RequirePermissions('employee:read')
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
  @RequirePermissions('employee:update')
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
  @RequirePermissions('employee:delete')
  @ApiOperation({ summary: 'Soft delete employee' })
  @ApiOkResponse({
    description: 'Employee deleted successfully.',
    type: DeletedEmployeeDto,
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  softDelete(@Req() req: any, @Param('id') id: string) {
    return this.employeeService.softDeleteEmployee(id);
  }
}
