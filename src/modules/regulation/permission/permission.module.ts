import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { PermissionRepositoryService } from '../../../common/repository/index';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService, PermissionRepositoryService],
})
export class PermissionModule {}
