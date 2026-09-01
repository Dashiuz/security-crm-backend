import { Module } from '@nestjs/common';
import { ProspectController } from './prospect.controller';
import { ProspectService } from './prospect.service';
import { ClientStructureGeneratorService } from '../client/services/client-structure-generator.service';

@Module({
  controllers: [ProspectController],
  providers: [ProspectService, ClientStructureGeneratorService],
  exports: [ProspectService],
})
export class ProspectModule {}
