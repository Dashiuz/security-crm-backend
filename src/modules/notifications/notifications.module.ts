import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationRepository } from './repositories/notification.repository';
import { SseService } from './sse/sse.service';
import { NotificationListener } from './listeners/notification.listener';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContextModule } from '../../common/context/context.module';

@Module({
  imports: [PrismaModule, ContextModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRepository,
    SseService,
    NotificationListener,
  ],
  exports: [NotificationsService, SseService],
})
export class NotificationsModule {}
