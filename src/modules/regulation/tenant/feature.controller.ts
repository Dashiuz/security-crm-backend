import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { FeatureResponseDto } from './dtos/feature-response.dto';

@ApiTags('Tenant Features (SuperAdmin Only)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('features')
export class FeatureController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @ApiOperation({ summary: 'List all available core features' })
  @ApiOkResponse({ type: [FeatureResponseDto] })
  findAll() {
    return this.tenantService.listFeatures();
  }
}
