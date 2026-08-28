import { Module } from '@nestjs/common';
import { ResidentService } from './services/resident.service';
import { ResidentController } from './controllers/resident.controller';
import { ResidentRepositoryModule } from '../../../common/repository/resident/resident.repository.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [ResidentRepositoryModule, PrismaModule],
  controllers: [ResidentController],
  providers: [ResidentService],
  exports: [ResidentService],
})
export class ResidentModule {}
