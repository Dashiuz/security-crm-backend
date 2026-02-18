import { Module } from '@nestjs/common';
import { PositionService } from './position.service';
import { PositionController } from './position.controller';
import { PositionRepositoryModule } from '../../../common/repository/position/position.repository.module';

@Module({
  imports: [PositionRepositoryModule],
  controllers: [PositionController],
  providers: [PositionService],
  exports: [PositionService],
})
export class PositionModule {}
