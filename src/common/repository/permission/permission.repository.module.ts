import { Module } from '@nestjs/common';
import { PermissionRepositoryService } from '../permission/permission.repository.service';

@Module({
  providers: [PermissionRepositoryService],
  exports: [PermissionRepositoryService],
})
export class PermissionRepositoryModule {}
