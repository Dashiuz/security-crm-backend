import { Module } from '@nestjs/common';
import { StorageController } from './controllers/storage.controller';
import { StorageService } from './services/storage.service';
import { S3Service } from './services/s3.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContextModule } from '../../common/context/context.module';

@Module({
  imports: [PrismaModule, ContextModule],
  controllers: [StorageController],
  providers: [S3Service, StorageService],
  exports: [S3Service, StorageService],
})
export class StorageModule {}
