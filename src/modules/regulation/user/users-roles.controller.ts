import { Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';
import { FeatureGuard } from '../access-control/feature.guard';
import { RequireFeature } from '../access-control/feature.decorator';
import { UsersRolesService } from './users-roles.service';
import { PatchUserRolesDto } from './dtos/patch-user-roles.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('user')
@Controller('users')
export class UsersRolesController {
  constructor(private readonly usersRolesService: UsersRolesService) {}

  @RequirePermissions('user:manage', 'user:update')
  @Patch(':userId/roles')
  @ApiOperation({ summary: 'Patch user roles' })
  @ApiOkResponse({
    schema: {
      properties: {
        userId: { type: 'string' },
        roles: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiBody({ type: PatchUserRolesDto })
  async patchRoles(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() dto: PatchUserRolesDto,
  ): Promise<any> {
    return this.usersRolesService.patchUserRoles(
      req.user.tenantId,
      userId,
      dto,
    );
  }
}
