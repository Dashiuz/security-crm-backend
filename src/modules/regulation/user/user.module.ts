import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersRolesService } from './users-roles.service';
import { UserController } from './user.controller';
import { UsersRolesController } from './users-roles.controller';
import {
  UserRepositoryModule,
  EmployeeRepositoryModule,
} from '../../../common/repository/index';

@Module({
  imports: [UserRepositoryModule, EmployeeRepositoryModule],
  controllers: [UserController, UsersRolesController],
  providers: [UserService, UsersRolesService],
})
export class UserModule {}
