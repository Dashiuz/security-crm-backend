import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersRolesService } from './users-roles.service';
import { UserController } from './user.controller';
import { UsersRolesController } from './users-roles.controller';
import {
  UserRepositoryModule,
  EmployeeRepositoryModule,
  RoleRepositoryModule,
} from '../../../common/repository/index';
import { ContextModule } from '../../../common/context/context.module';

@Module({
  imports: [
    UserRepositoryModule,
    EmployeeRepositoryModule,
    RoleRepositoryModule,
    ContextModule,
  ],
  controllers: [UserController, UsersRolesController],
  providers: [UserService, UsersRolesService],
})
export class UserModule {}
