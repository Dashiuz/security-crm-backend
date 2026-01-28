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
  ApiTags,
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
  @ApiOkResponse({ type: [PermissionResponseDto] })
  async list(): Promise<PermissionResponseDto[]> {
    return this.permissionService.list();
  }

  @RequirePermissions('permission:read')
  @Get(':id')
  @ApiOkResponse({ type: PermissionResponseDto })
  async findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionService.findOne(id);
  }

  @RequirePermissions('permission:manage')
  @Post()
  @ApiCreatedResponse({ type: PermissionResponseDto })
  @ApiBody({ type: CreatePermissionDto })
  async create(
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.create(dto);
  }

  @RequirePermissions('permission:manage')
  @Patch(':id')
  @ApiOkResponse({ type: PermissionResponseDto })
  @ApiBody({ type: UpdatePermissionDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.update(id, dto);
  }

  @RequirePermissions('permission:manage')
  @Delete(':id')
  @ApiOkResponse({ type: PermissionResponseDto })
  async remove(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionService.remove(id);
  }
}
