import { Module } from '@nestjs/common';
import { MinutaGeneralController } from './controllers/minuta-general.controller';
import { ParkingControlController } from './controllers/parking-control.controller';
import { VisitorControlController } from './controllers/visitor-control.controller';
import { CorrespondenceControlController } from './controllers/correspondence-control.controller';
import { MinutaGeneralService } from './services/minuta-general.service';
import { ParkingControlService } from './services/parking-control.service';
import { VisitorControlService } from './services/visitor-control.service';
import { CorrespondenceControlService } from './services/correspondence-control.service';
import {
  MinutaRepositoryModule,
  ParkingControlRepositoryModule,
  VisitorControlRepositoryModule,
  CorrespondenceRepositoryModule,
} from '../../../common/repository/index';

@Module({
  imports: [
    MinutaRepositoryModule,
    ParkingControlRepositoryModule,
    VisitorControlRepositoryModule,
    CorrespondenceRepositoryModule,
  ],
  controllers: [
    MinutaGeneralController,
    ParkingControlController,
    VisitorControlController,
    CorrespondenceControlController,
  ],
  providers: [
    MinutaGeneralService,
    ParkingControlService,
    VisitorControlService,
    CorrespondenceControlService,
  ],
  exports: [
    MinutaGeneralService,
    ParkingControlService,
    VisitorControlService,
    CorrespondenceControlService,
  ],
})
export class MinutaModule {}
