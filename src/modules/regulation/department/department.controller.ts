import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dtos/department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';

@ApiTags('Departments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @RequirePermissions('department:manage', 'department:create')
  @ApiOperation({ summary: 'Create department' })
  @ApiCreatedResponse({ type: DepartmentResponseDto })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Get()
  @RequirePermissions('department:manage', 'department:read')
  @ApiOperation({ summary: 'List departments' })
  @ApiOkResponse({ type: [DepartmentResponseDto] })
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(':id')
  @RequirePermissions('department:manage', 'department:read')
  @ApiOperation({ summary: 'Get department by id' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('department:manage', 'department:update')
  @ApiOperation({ summary: 'Update department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('department:manage', 'department:delete')
  @ApiOperation({ summary: 'Delete department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }

  @Post('import/csv')
  @RequirePermissions('department:manage', 'department:create')
  @ApiOperation({ summary: 'Bulk import departments from JSON/CSV payload' })
  importCsv(
    @Body()
    body: {
      data: Array<Record<string, string>>;
      fileName?: string;
    },
    @Request() req,
  ) {
    return this.departmentService.importDepartmentsFromCsv(
      body.data || [],
      body.fileName || 'departamentos.csv',
      req.user,
    );
  }
}
