import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { PermissionService } from './permission.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from './dtos/index';

@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @RequirePermissions('permission:read')
  @Get()
  @ApiOperation({ summary: 'List permissions' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async list(): Promise<PermissionResponseDto[]> {
    return this.permissionService.list();
  }

  @RequirePermissions('permission:read')
  @Get(':id')
  @ApiOperation({ summary: 'Find permission by id' })
  @ApiOkResponse({ type: PermissionResponseDto })
  @ApiNotFoundResponse({ description: 'Permission not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionService.findOne(id);
  }

  @RequirePermissions('permission:manage')
  @Post()
  @ApiOperation({ summary: 'Create permission' })
  @ApiCreatedResponse({ type: PermissionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid key or already exists' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: CreatePermissionDto })
  async create(
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.create(dto);
  }

  @RequirePermissions('permission:manage')
  @Patch(':id')
  @ApiOperation({ summary: 'Update permission' })
  @ApiOkResponse({ type: PermissionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid data or key already exists' })
  @ApiNotFoundResponse({ description: 'Permission not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: UpdatePermissionDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.update(id, dto);
  }

  @RequirePermissions('permission:manage')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete permission' })
  @ApiOkResponse({ type: PermissionResponseDto })
  @ApiBadRequestResponse({ description: 'Permission in use' })
  @ApiNotFoundResponse({ description: 'Permission not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionService.remove(id);
  }
}
