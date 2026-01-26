import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleRepositoryService } from '../../../common/repository/index';

@Module({
  controllers: [RoleController],
  providers: [RoleService, RoleRepositoryService],
})
export class RoleModule {}
