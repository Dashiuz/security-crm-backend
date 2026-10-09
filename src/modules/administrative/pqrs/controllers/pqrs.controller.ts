import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';
import { PqrsService } from '../services/pqrs.service';
import { CreatePqrsTicketDto } from '../dtos/create-pqrs-ticket.dto';
import { UpdatePqrsStatusDto } from '../dtos/update-pqrs-status.dto';
import { UpdatePqrsPriorityDto } from '../dtos/update-pqrs-priority.dto';
import { AssignPqrsTicketDto } from '../dtos/assign-pqrs-ticket.dto';
import { CreatePqrsMessageDto } from '../dtos/create-pqrs-message.dto';
import { QueryPqrsTicketDto } from '../dtos/query-pqrs-ticket.dto';

@ApiTags('Administrative: PQRS')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('pqrs')
@Controller('administrative/pqrs')
export class PqrsController {
  constructor(private readonly service: PqrsService) {}

  @Post()
  @RequirePermissions('pqrs:create', 'pqrs:manage')
  @ApiOperation({ summary: 'Radicar una nueva solicitud PQRS' })
  @ApiResponse({
    status: 201,
    description: 'Solicitud PQRS radicada exitosamente',
  })
  create(@Body() dto: CreatePqrsTicketDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions('pqrs:read', 'pqrs:manage')
  @ApiOperation({
    summary: 'Consultar listado de tickets PQRS con filtros y paginación',
  })
  @ApiResponse({ status: 200, description: 'Listado de solicitudes PQRS' })
  findAll(@Req() req: any, @Query() query: QueryPqrsTicketDto) {
    const permissions: string[] = req.user?.permissions ?? [];
    return this.service.findAll(query, permissions);
  }

  @Get('stats')
  @RequirePermissions('pqrs:read', 'pqrs:manage')
  @ApiOperation({
    summary: 'Obtener métricas y KPIs de solicitudes PQRS',
  })
  @ApiResponse({ status: 200, description: 'Métricas de solicitudes PQRS' })
  getStats(@Req() req: any, @Query('clientId') clientId?: string) {
    const permissions: string[] = req.user?.permissions ?? [];
    return this.service.getStats(clientId, permissions);
  }

  @Get(':id')
  @RequirePermissions('pqrs:read', 'pqrs:manage')
  @ApiOperation({
    summary: 'Obtener el detalle y trazabilidad de una solicitud PQRS por ID',
  })
  @ApiResponse({ status: 200, description: 'Detalle de la solicitud PQRS' })
  findOne(@Req() req: any, @Param('id') id: string) {
    const permissions: string[] = req.user?.permissions ?? [];
    return this.service.findOne(id, permissions);
  }

  @Patch(':id/assign')
  @RequirePermissions('pqrs:assign', 'pqrs:manage')
  @ApiOperation({
    summary: 'Asignar una solicitud PQRS a un funcionario o usuario del tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud PQRS asignada exitosamente',
  })
  assign(@Param('id') id: string, @Body() dto: AssignPqrsTicketDto) {
    return this.service.assign(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('pqrs:update', 'pqrs:manage')
  @ApiOperation({
    summary:
      'Actualizar el estado de una solicitud PQRS (Máquina Secuencial de Estados)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la solicitud actualizado',
  })
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePqrsStatusDto,
  ) {
    const permissions: string[] = req.user?.permissions ?? [];
    return this.service.updateStatus(id, dto, permissions);
  }

  @Patch(':id/priority')
  @RequirePermissions('pqrs:update', 'pqrs:manage')
  @ApiOperation({
    summary:
      'Actualizar la prioridad de una solicitud PQRS por parte del operador',
  })
  @ApiResponse({
    status: 200,
    description: 'Prioridad de la solicitud actualizada exitosamente',
  })
  updatePriority(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePqrsPriorityDto,
  ) {
    const permissions: string[] = req.user?.permissions ?? [];
    return this.service.updatePriority(id, dto, permissions);
  }

  @Post(':id/messages')
  @RequirePermissions('pqrs:create', 'pqrs:update', 'pqrs:manage')
  @ApiOperation({
    summary: 'Agregar una respuesta o mensaje al hilo de la solicitud PQRS',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje agregado al hilo exitosamente',
  })
  addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreatePqrsMessageDto,
  ) {
    const permissions: string[] = req.user?.permissions ?? [];
    return this.service.addMessage(id, dto, permissions);
  }
}
