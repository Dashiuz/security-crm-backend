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
import { CommercialServiceOrdersService } from '../services/commercial-service-orders.service';
import { CreateServiceOrderDto } from '../dtos/create-service-order.dto';
import { UpdateServiceOrderDto } from '../dtos/update-service-order.dto';
import { ServiceOrderFilterDto } from '../dtos/service-order-filter.dto';
import { DispatchServiceOrderDto } from '../dtos/dispatch-service-order.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';
import { ServiceOrderStatus } from '@prisma/client';

@ApiTags('Commercial Service Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('commercial')
@Controller('commercial/service-orders')
export class CommercialServiceOrdersController {
  constructor(
    private readonly serviceOrdersService: CommercialServiceOrdersService,
  ) {}

  @Post()
  @RequirePermissions('commercial:orders:manage', 'commercial:orders:create')
  @ApiOperation({
    summary: 'Crear nueva orden de servicio e instalación operativa',
    description:
      'Genera consecutivo OS-YYYY-XXXX y código OMEGA, vincula o activa el cliente y parametriza puestos y dotación.',
  })
  @ApiCreatedResponse({ description: 'Orden de servicio creada exitosamente' })
  async createServiceOrder(
    @Request() req: any,
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.serviceOrdersService.createServiceOrder(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @RequirePermissions('commercial:orders:manage', 'commercial:orders:read')
  @ApiOperation({
    summary: 'Listar órdenes de servicio paginadas',
    description:
      'Obtiene el listado de órdenes con filtros por cliente, estado y búsqueda textual.',
  })
  @ApiOkResponse({ description: 'Lista paginada de órdenes de servicio' })
  async getServiceOrders(
    @Request() req: any,
    @Query() filter: ServiceOrderFilterDto,
  ) {
    return this.serviceOrdersService.getServiceOrdersPaginated(
      req.user.tenantId,
      filter,
    );
  }

  @Get(':id')
  @RequirePermissions('commercial:orders:manage', 'commercial:orders:read')
  @ApiOperation({
    summary: 'Obtener detalle 360° de orden de servicio por ID',
    description:
      'Devuelve el dossier completo con perfil del guarda ideal, dotación física y bitácora de despacho.',
  })
  @ApiOkResponse({ description: 'Detalle de la orden de servicio' })
  async getServiceOrderById(@Request() req: any, @Param('id') id: string) {
    return this.serviceOrdersService.getServiceOrderById(req.user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('commercial:orders:manage', 'commercial:orders:update')
  @ApiOperation({
    summary: 'Actualizar orden de servicio',
    description:
      'Modifica datos de cabecera, puestos o elementos de dotación requeridos.',
  })
  @ApiOkResponse({ description: 'Orden de servicio actualizada' })
  async updateServiceOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.updateServiceOrder(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Post(':id/dispatch')
  @RequirePermissions('commercial:orders:manage', 'commercial:orders:dispatch')
  @ApiOperation({
    summary: 'Despachar orden a los 9 departamentos internos',
    description:
      'Dispara la notificación oficial a RRHH, Operaciones, Bodega, Facturación, etc., y cambia el estado a ISSUED_DISPATCHED.',
  })
  @ApiOkResponse({ description: 'Orden despachada multidepartamentalmente' })
  async dispatchOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DispatchServiceOrderDto,
  ) {
    return this.serviceOrdersService.dispatchOrder(req.user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('commercial:orders:manage', 'commercial:orders:update')
  @ApiOperation({
    summary: 'Actualizar estado operativo de la orden',
    description: 'Permite transicionar a IN_OPERATION o CANCELLED.',
  })
  @ApiOkResponse({ description: 'Estado actualizado' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: ServiceOrderStatus,
  ) {
    return this.serviceOrdersService.updateStatus(
      req.user.tenantId,
      id,
      status,
    );
  }

  @Delete(':id')
  @RequirePermissions('commercial:orders:manage', 'commercial:orders:delete')
  @ApiOperation({
    summary: 'Eliminar orden de servicio en borrador',
    description: 'Elimina una orden que aún está en DRAFT_CONFIGURING.',
  })
  @ApiOkResponse({ description: 'Orden eliminada' })
  async deleteServiceOrder(@Request() req: any, @Param('id') id: string) {
    return this.serviceOrdersService.deleteServiceOrder(req.user.tenantId, id);
  }
}
