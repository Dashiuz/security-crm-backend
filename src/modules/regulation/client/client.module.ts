import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ClientRepositoryModule } from '../../../common/repository/client/client.repository.module';
import { ClientStructureGeneratorService } from './services/client-structure-generator.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [ClientRepositoryModule, PrismaModule],
  controllers: [ClientController],
  providers: [ClientService, ClientStructureGeneratorService],
  exports: [ClientService, ClientStructureGeneratorService],
})
export class ClientModule {}
