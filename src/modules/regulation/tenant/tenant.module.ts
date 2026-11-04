import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantPublicController } from './tenant-public.controller';
import { FeatureController } from './feature.controller';
import { TenantRepositoryModule } from '../../../common/repository/tenant/tenant.repository.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [TenantRepositoryModule, StorageModule],
  controllers: [TenantController, TenantPublicController, FeatureController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
