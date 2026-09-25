import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { FeatureGuard } from './feature.guard';

@Global()
@Module({
  providers: [PermissionsGuard, FeatureGuard],
  exports: [PermissionsGuard, FeatureGuard],
})
export class AccessControlModule {}
