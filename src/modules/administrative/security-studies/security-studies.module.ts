import { Module } from '@nestjs/common';
import { SecurityStudiesController } from './controllers/security-studies.controller';
import { SecurityStudiesService } from './services/security-studies.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { ContextModule } from '../../../common/context/context.module';

@Module({
  imports: [PrismaModule, StorageModule, ContextModule],
  controllers: [SecurityStudiesController],
  providers: [SecurityStudiesService],
  exports: [SecurityStudiesService],
})
export class SecurityStudiesModule {}
