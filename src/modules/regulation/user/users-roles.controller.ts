import { Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';
import { UsersRolesService } from './users-roles.service';
import { PatchUserRolesDto } from './dtos/patch-user-roles.dto';

@ApiTags('User')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersRolesController {
  constructor(private readonly usersRolesService: UsersRolesService) {}

  @RequirePermissions('user:manage')
  @Patch(':userId/roles')
  @ApiBody({ type: PatchUserRolesDto })
  patchRoles(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() dto: PatchUserRolesDto,
  ) {
    return this.usersRolesService.patchUserRoles(
      req.user.tenantId,
      userId,
      dto,
    );
  }
}
