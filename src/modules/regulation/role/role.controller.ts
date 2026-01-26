import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { PatchRolePermissionsDto } from './dtos/patch-role-permissions.dto';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @RequirePermissions('role:manage')
  @Post()
  @ApiBody({ type: CreateRoleDto })
  create(@Req() req: any, @Body() dto: CreateRoleDto) {
    return this.roleService.create(req.user.tenantId, dto);
  }

  @RequirePermissions('role:manage')
  @Get()
  list(@Req() req: any) {
    return this.roleService.list(req.user.tenantId);
  }

  @RequirePermissions('role:manage')
  @Patch(':roleId/permissions')
  @ApiBody({ type: PatchRolePermissionsDto })
  patchPermissions(
    @Req() req: any,
    @Param('roleId') roleId: string,
    @Body() dto: PatchRolePermissionsDto,
  ) {
    return this.roleService.patchPermissions(req.user.tenantId, roleId, dto);
  }
}
