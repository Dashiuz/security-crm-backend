import { Module } from '@nestjs/common';
import { CorrespondenceRepositoryService } from './correspondence-control.repository.service';
import { PrismaModule } from '../../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CorrespondenceRepositoryService],
  exports: [CorrespondenceRepositoryService],
})
export class CorrespondenceRepositoryModule {}
