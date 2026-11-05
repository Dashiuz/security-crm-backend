import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';
import { DashboardService } from '../services/dashboard.service';
import {
  DashboardOverviewResponseDto,
  DashboardRemindersResponseDto,
} from '../dtos/dashboard.dto';

@ApiTags('Administrative: Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('dashboard')
@Controller('administrative/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @RequirePermissions('dashboard:read')
  @ApiOperation({
    summary:
      'Consolidar KPIs ejecutivos, métricas operativas y series de gráficos',
  })
  @ApiOkResponse({
    description: 'Resumen ejecutivo del dashboard',
    type: DashboardOverviewResponseDto,
  })
  getOverview(@Req() req: { user?: { tenantId?: string } }) {
    return this.service.getOverview(req.user);
  }

  @Get('reminders')
  @RequirePermissions('dashboard:read')
  @ApiOperation({
    summary:
      'Centro inteligente de recordatorios y alertas tempranas multimodular',
  })
  @ApiOkResponse({
    description: 'Listado clasificado de recordatorios',
    type: DashboardRemindersResponseDto,
  })
  getReminders(@Req() req: { user?: { tenantId?: string } }) {
    return this.service.getReminders(req.user);
  }
}
