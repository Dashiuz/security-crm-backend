import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleRepositoryService } from '../../../common/repository/index';
import { UserRepositoryModule } from '../../../common/repository/user/user.repository.module';

@Module({
  imports: [UserRepositoryModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepositoryService],
})
export class RoleModule {}
