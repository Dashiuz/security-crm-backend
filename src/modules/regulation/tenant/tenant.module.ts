import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantRepositoryModule } from '../../../common/repository/tenant/tenant.repository.module';

@Module({
  imports: [TenantRepositoryModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
