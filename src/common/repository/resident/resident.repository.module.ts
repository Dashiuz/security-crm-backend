import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ResidentRepositoryService } from './resident.repository.service';

@Module({
  imports: [PrismaModule],
  providers: [ResidentRepositoryService],
  exports: [ResidentRepositoryService],
})
export class ResidentRepositoryModule {}
