import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Sse,
  UseGuards,
  Req,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { NotificationsService } from '../services/notifications.service';
import { SseService } from '../sse/sse.service';

@ApiTags('Notifications & SSE')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly sseService: SseService,
  ) {}

  @Sse('sse')
  @ApiOperation({
    summary:
      'Canal Server-Sent Events (SSE) para notificaciones y eventos reactivos en tiempo real',
  })
  sse(@Req() req: any): Observable<MessageEvent> {
    const userId = req.user?.id || req.user?.sub;
    const tenantId = req.user?.tenantId;
    const clientId = req.user?.clientId;
    return this.sseService.getUserStream(userId, tenantId, clientId);
  }

  @Get('unread')
  @ApiOperation({
    summary: 'Consultar notificaciones no leídas del usuario en sesión',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de notificaciones no leídas',
  })
  getUnread() {
    return this.service.getUnread();
  }

  @Get()
  @ApiOperation({
    summary: 'Listar historial de notificaciones del usuario en sesión',
  })
  @ApiResponse({ status: 200, description: 'Historial de notificaciones' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Marcar todas las notificaciones pendientes como leídas',
  })
  @ApiResponse({
    status: 200,
    description: 'Todas las notificaciones marcadas como leídas',
  })
  markAllAsRead() {
    return this.service.markAllAsRead();
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Marcar una notificación específica como leída',
  })
  @ApiResponse({ status: 200, description: 'Notificación marcada como leída' })
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }
}
