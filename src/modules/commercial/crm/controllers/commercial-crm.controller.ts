import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommercialCrmService } from '../services/commercial-crm.service';
import { CreateFollowUpDto, UpdateFollowUpDto, FollowUpFilterDto } from '../dtos/follow-up.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';

@ApiTags('Commercial CRM & Follow-ups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('commercial')
@Controller('commercial/crm')
export class CommercialCrmController {
  constructor(private readonly crmService: CommercialCrmService) {}

  @Post('follow-ups')
  @RequirePermissions('commercial:crm:manage', 'commercial:crm:create')
  @ApiOperation({
    summary: 'Registrar interacción en bitácora comercial',
    description:
      'Registra llamadas, visitas técnicas, y calcula alerta automática a los 11 meses si el negocio se marca como LOST.',
  })
  @ApiCreatedResponse({ description: 'Seguimiento registrado exitosamente' })
  async createFollowUp(
    @Request() req: any,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.crmService.createFollowUp(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Get('follow-ups')
  @RequirePermissions('commercial:crm:manage', 'commercial:crm:read')
  @ApiOperation({
    summary: 'Listar interacciones de CRM paginadas',
    description: 'Obtiene el historial global con filtros por cliente, comercial o estado.',
  })
  @ApiOkResponse({ description: 'Lista paginada de seguimientos' })
  async getFollowUps(
    @Request() req: any,
    @Query() filter: FollowUpFilterDto,
  ) {
    return this.crmService.getFollowUpsPaginated(req.user.tenantId, filter);
  }

  @Get('follow-ups/client/:clientId')
  @RequirePermissions('commercial:crm:manage', 'commercial:crm:read')
  @ApiOperation({
    summary: 'Obtener bitácora cronológica de un cliente',
    description: 'Devuelve la línea de tiempo completa de interacciones con el cliente o prospecto.',
  })
  @ApiOkResponse({ description: 'Línea de tiempo del cliente' })
  async getFollowUpsByClient(
    @Request() req: any,
    @Param('clientId') clientId: string,
  ) {
    return this.crmService.getFollowUpsByClient(req.user.tenantId, clientId);
  }

  @Get('follow-ups/recaptation-alerts')
  @RequirePermissions('commercial:crm:manage', 'commercial:crm:read')
  @ApiOperation({
    summary: 'Consultar alertas de recaptación a 11 meses',
    description:
      'Retorna clientes y prospectos perdidos ante la competencia cuya fecha de recaptación ya fue alcanzada.',
  })
  @ApiOkResponse({ description: 'Lista de alertas de recaptación' })
  async getRecaptationAlerts(@Request() req: any) {
    return this.crmService.getRecaptationAlerts(req.user.tenantId);
  }

  @Get('follow-ups/:id')
  @RequirePermissions('commercial:crm:manage', 'commercial:crm:read')
  @ApiOperation({ summary: 'Obtener detalle de un seguimiento por ID' })
  @ApiOkResponse({ description: 'Detalle del seguimiento' })
  async getFollowUpById(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.crmService.getFollowUpById(req.user.tenantId, id);
  }

  @Patch('follow-ups/:id')
  @RequirePermissions('commercial:crm:manage', 'commercial:crm:update')
  @ApiOperation({ summary: 'Actualizar registro de seguimiento CRM' })
  @ApiOkResponse({ description: 'Seguimiento actualizado' })
  async updateFollowUp(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.crmService.updateFollowUp(req.user.tenantId, id, dto);
  }

  @Delete('follow-ups/:id')
  @RequirePermissions('commercial:crm:manage', 'commercial:crm:delete')
  @ApiOperation({ summary: 'Eliminar registro de seguimiento' })
  @ApiOkResponse({ description: 'Seguimiento eliminado' })
  async deleteFollowUp(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.crmService.deleteFollowUp(req.user.tenantId, id);
  }
}
