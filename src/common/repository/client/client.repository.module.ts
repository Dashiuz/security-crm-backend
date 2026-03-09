import { Module } from '@nestjs/common';
import { ClientRepositoryService } from './client.repository.service';

@Module({
  providers: [ClientRepositoryService],
  exports: [ClientRepositoryService],
})
export class ClientRepositoryModule {}
