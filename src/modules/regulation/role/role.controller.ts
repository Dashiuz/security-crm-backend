import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
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
import { RoleService } from './role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  PatchRolePermissionsDto,
  RoleResponseDto,
} from './dtos/index';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @RequirePermissions('role:manage', 'role:create')
  @Post()
  @ApiOperation({ summary: 'Create role' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid role name or already exists' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: CreateRoleDto })
  async create(
    @Req() req: any,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roleService.create(req.user.tenantId, dto);
  }

  @RequirePermissions('role:manage', 'role:read')
  @Get()
  @ApiOperation({ summary: 'List roles' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async list(@Req() req: any): Promise<RoleResponseDto[]> {
    return this.roleService.list(req.user.tenantId);
  }

  @RequirePermissions('role:manage', 'role:read')
  @Get(':roleId')
  @ApiOperation({ summary: 'Find role by id' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Req() req: any,
    @Param('roleId') roleId: string,
  ): Promise<RoleResponseDto> {
    return this.roleService.findOne(req.user.tenantId, roleId);
  }

  @RequirePermissions('role:manage', 'role:update')
  @Patch(':roleId')
  @ApiOperation({ summary: 'Update role' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid name or already exists' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: UpdateRoleDto })
  async update(
    @Req() req: any,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roleService.update(req.user.tenantId, roleId, dto);
  }

  @RequirePermissions('role:manage', 'role:delete')
  @Delete(':roleId')
  @ApiOperation({ summary: 'Delete role' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ description: 'Role in use' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Req() req: any,
    @Param('roleId') roleId: string,
  ): Promise<RoleResponseDto> {
    return this.roleService.remove(req.user.tenantId, roleId);
  }

  @RequirePermissions('role:manage', 'role:update')
  @Patch(':roleId/permissions')
  @ApiOperation({ summary: 'Patch role permissions' })
  @ApiOkResponse({
    schema: {
      properties: {
        roleId: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Unknown permission keys or empty' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: PatchRolePermissionsDto })
  async patchPermissions(
    @Req() req: any,
    @Param('roleId') roleId: string,
    @Body() dto: PatchRolePermissionsDto,
  ): Promise<any> {
    return this.roleService.patchPermissions(req.user.tenantId, roleId, dto);
  }
}
