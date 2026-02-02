import { Module } from '@nestjs/common';
import { TenantRepositoryService } from './tenant.repository.service';

@Module({
  providers: [TenantRepositoryService],
  exports: [TenantRepositoryService],
})
export class TenantRepositoryModule {}
