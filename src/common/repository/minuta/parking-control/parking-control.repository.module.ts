import { Module } from '@nestjs/common';
import { ParkingControlRepositoryService } from './parking-control.repository.service';
import { PrismaModule } from '../../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ParkingControlRepositoryService],
  exports: [ParkingControlRepositoryService],
})
export class ParkingControlRepositoryModule {}
