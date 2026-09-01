import { Module } from '@nestjs/common';
import { VisitorControlRepositoryService } from './visitor-control.repository.service';
import { PrismaModule } from '../../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VisitorControlRepositoryService],
  exports: [VisitorControlRepositoryService],
})
export class VisitorControlRepositoryModule {}
