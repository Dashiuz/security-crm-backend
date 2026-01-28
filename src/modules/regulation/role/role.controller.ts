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
  ApiTags,
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

  @RequirePermissions('role:manage')
  @Post()
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBody({ type: CreateRoleDto })
  async create(
    @Req() req: any,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roleService.create(req.user.tenantId, dto);
  }

  @RequirePermissions('role:manage')
  @Get()
  @ApiOkResponse({ type: [RoleResponseDto] })
  async list(@Req() req: any): Promise<RoleResponseDto[]> {
    return this.roleService.list(req.user.tenantId);
  }

  @RequirePermissions('role:manage')
  @Get(':roleId')
  @ApiOkResponse({ type: RoleResponseDto })
  async findOne(
    @Req() req: any,
    @Param('roleId') roleId: string,
  ): Promise<RoleResponseDto> {
    return this.roleService.findOne(req.user.tenantId, roleId);
  }

  @RequirePermissions('role:manage')
  @Patch(':roleId')
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiBody({ type: UpdateRoleDto })
  async update(
    @Req() req: any,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roleService.update(req.user.tenantId, roleId, dto);
  }

  @RequirePermissions('role:manage')
  @Delete(':roleId')
  @ApiOkResponse({ type: RoleResponseDto })
  async remove(
    @Req() req: any,
    @Param('roleId') roleId: string,
  ): Promise<RoleResponseDto> {
    return this.roleService.remove(req.user.tenantId, roleId);
  }

  @RequirePermissions('role:manage')
  @Patch(':roleId/permissions')
  @ApiOkResponse({
    schema: {
      properties: {
        roleId: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({ type: PatchRolePermissionsDto })
  async patchPermissions(
    @Req() req: any,
    @Param('roleId') roleId: string,
    @Body() dto: PatchRolePermissionsDto,
  ): Promise<any> {
    return this.roleService.patchPermissions(req.user.tenantId, roleId, dto);
  }
}
