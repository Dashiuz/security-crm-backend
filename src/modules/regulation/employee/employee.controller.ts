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
} from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dtos/index';

@ApiTags('Employee')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @RequirePermissions('employee:create')
  @ApiBody({ type: CreateEmployeeDto })
  create(@Req() req: any, @Body() dto: CreateEmployeeDto) {
    const tenantId = req.user.tenantId;
    return this.employeeService.createEmployee(tenantId, dto);
  }

  @Get('/active/:document')
  @RequirePermissions('employee:read')
  @ApiOperation({ summary: 'Get active employee by document' })
  @ApiOkResponse({ description: 'Employee found successfully.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  getByDocument(@Req() req: any, @Param('document') document: string) {
    const tenantId = req.user.tenantId;
    return this.employeeService.findActiveByDocument(tenantId, document);
  }

  @Get('/any/:id')
  @RequirePermissions('employee:read')
  @ApiOperation({ summary: 'Get active or inactive employee by id' })
  @ApiOkResponse({ description: 'Employee found successfully.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  getAnyById(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.employeeService.findAnyEmployeeById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('employee:update')
  @ApiBody({ type: UpdateEmployeeDto })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.employeeService.updateEmployee(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('employee:delete')
  softDelete(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.employeeService.softDeleteEmployee(tenantId, id);
  }
}
