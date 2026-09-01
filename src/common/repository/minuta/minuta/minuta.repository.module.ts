import { Module } from '@nestjs/common';
import { MinutaRepositoryService } from './minuta.repository.service';
import { PrismaModule } from '../../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MinutaRepositoryService],
  exports: [MinutaRepositoryService],
})
export class MinutaRepositoryModule {}
