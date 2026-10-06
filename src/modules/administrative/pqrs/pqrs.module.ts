import { Module } from '@nestjs/common';
import { PqrsController } from './controllers/pqrs.controller';
import { PqrsService } from './services/pqrs.service';
import { PqrsRepository } from './repositories/pqrs.repository';
import { PqrsListener } from './listeners/pqrs.listener';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { ContextModule } from '../../../common/context/context.module';

@Module({
  imports: [PrismaModule, StorageModule, ContextModule],
  controllers: [PqrsController],
  providers: [PqrsService, PqrsRepository, PqrsListener],
  exports: [PqrsService, PqrsRepository],
})
export class PqrsModule {}
