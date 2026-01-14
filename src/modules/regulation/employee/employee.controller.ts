import {
  Controller,
  Body,
  Param,
  Post,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dtos/index';

@ApiTags('Employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @ApiBody({ type: CreateEmployeeDto })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(dto);
  }

  @Get('/active/:document')
  @ApiOperation({ summary: 'Get active employee by document' })
  @ApiOkResponse({ description: 'Employee found successfully.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  getByDocument(@Param('document') document: string) {
    return this.employeeService.findActiveByDocument(document);
  }

  @Get('/any/:id')
  @ApiOperation({ summary: 'Get active or inactive employee by id' })
  @ApiOkResponse({ description: 'Employee found successfully.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error.' })
  getAnyById(@Param('id') id: string) {
    return this.employeeService.findAnyEmployeeById(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateEmployeeDto })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.updateEmployee(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.employeeService.softDeleteEmployee(id);
  }
}
