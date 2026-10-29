import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PayrollSettingsService } from '../services/payroll-settings.service';
import { UpdatePayrollSettingsDto } from '../dtos/payroll-settings.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';

@ApiTags('Payroll: Settings & Holidays')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('payroll')
@Controller('payroll/settings')
export class PayrollSettingsController {
  constructor(private readonly settingsService: PayrollSettingsService) {}

  @Get()
  @RequirePermissions('payroll:settings:read', 'payroll:settings:manage')
  @ApiOperation({ summary: 'Obtener parámetros globales y legales de nómina' })
  @ApiOkResponse({
    description: 'Parámetros legales y políticas operativas de nómina',
  })
  getSettings(@Request() req: any) {
    return this.settingsService.getSettings(req.user.tenantId);
  }

  @Patch()
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({
    summary: 'Actualizar parámetros legales y políticas de nómina',
  })
  @ApiOkResponse({ description: 'Parámetros actualizados exitosamente' })
  updateSettings(@Request() req: any, @Body() dto: UpdatePayrollSettingsDto) {
    return this.settingsService.updateSettings(
      req.user.tenantId,
      dto,
      req.user.id || req.user.sub,
    );
  }

  @Get('holidays')
  @RequirePermissions('payroll:settings:read', 'payroll:settings:manage')
  @ApiOperation({ summary: 'Listar días festivos oficiales colombianos' })
  @ApiOkResponse({
    description: 'Lista de días festivos calculados para el año',
  })
  getHolidays(@Request() req: any, @Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.settingsService.getHolidays(req.user.tenantId, parsedYear);
  }

  @Post('holidays/generate')
  @RequirePermissions('payroll:settings:manage')
  @ApiOperation({
    summary: 'Auto-generar los 18 festivos de ley según Ley Emiliani',
  })
  @ApiOkResponse({
    description: 'Festivos generados y persistidos en el calendario',
  })
  generateHolidays(@Request() req: any, @Query('year') year: string) {
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    return this.settingsService.generateHolidaysForYear(
      req.user.tenantId,
      targetYear,
      req.user.id || req.user.sub,
    );
  }
}
