import { Module } from '@nestjs/common';
import { PositionRepositoryService } from './position.repository.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PositionRepositoryService],
  exports: [PositionRepositoryService],
})
export class PositionRepositoryModule {}
