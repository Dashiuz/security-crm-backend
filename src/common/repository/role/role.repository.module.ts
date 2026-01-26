import { Module } from '@nestjs/common';
import { RoleRepositoryService } from '../role/role.repository.service';

@Module({
  providers: [RoleRepositoryService],
  exports: [RoleRepositoryService],
})
export class RoleRepositoryModule {}
