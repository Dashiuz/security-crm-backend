import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  UpdateTenantProfileDto,
  UpdateTenantSettingsDto,
  TenantProfileResponseDto,
  TenantSettingsResponseDto,
} from './dtos/index';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';

@ApiTags('Tenant Management')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a new tenant (GODLIKE only)' })
  @ApiCreatedResponse({ type: TenantResponseDto })
  @ApiForbiddenResponse({
    description: 'Only GODLIKE users can access this resource',
  })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'List all tenants (GODLIKE only)' })
  @ApiOkResponse({ type: [TenantResponseDto] })
  @ApiForbiddenResponse({
    description: 'Only GODLIKE users can access this resource',
  })
  findAll() {
    return this.tenantService.list();
  }

  // --- Current Tenant Endpoints (Local Tenant Admin & GODLIKE) ---

  @Get('me')
  @RequirePermissions('tenant:read')
  @ApiOperation({ summary: 'Get current tenant details' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  getMyTenant(@Request() req: any) {
    return this.tenantService.findOne(req.user.tenantId);
  }

  @Patch('me/profile')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: 'Update own tenant profile / legal info' })
  @ApiOkResponse({ type: TenantProfileResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  updateMyProfile(@Request() req: any, @Body() dto: UpdateTenantProfileDto) {
    return this.tenantService.updateProfile(req.user.tenantId, dto);
  }

  @Patch('me/settings')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: 'Update own tenant operational settings and branding' })
  @ApiOkResponse({ type: TenantSettingsResponseDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  updateMySettings(@Request() req: any, @Body() dto: UpdateTenantSettingsDto) {
    return this.tenantService.updateSettings(req.user.tenantId, dto);
  }

  // --- Parameterized Routes (GODLIKE only) ---

  @Get(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Get tenant by ID (GODLIKE only)' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiForbiddenResponse({
    description: 'Only GODLIKE users can access this resource',
  })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a tenant (GODLIKE only)' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiForbiddenResponse({
    description: 'Only GODLIKE users can access this resource',
  })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Put(':id/features')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Sync features for a tenant (GODLIKE only)' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiForbiddenResponse({
    description: 'Only GODLIKE users can access this resource',
  })
  syncFeatures(
    @Param('id') id: string,
    @Body('featureKeys') featureKeys: string[],
  ) {
    return this.tenantService.syncFeatures(id, featureKeys || []);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete a tenant (GODLIKE only)' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiForbiddenResponse({
    description: 'Only GODLIKE users can access this resource',
  })
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
