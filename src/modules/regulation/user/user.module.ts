import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersRolesService } from './users-roles.service';
import { UserController } from './user.controller';
import { UsersRolesController } from './users-roles.controller';
import {
  UserRepositoryModule,
  EmployeeRepositoryModule,
  RoleRepositoryModule,
  ClientRepositoryModule,
} from '../../../common/repository/index';
import { ContextModule } from '../../../common/context/context.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [
    UserRepositoryModule,
    EmployeeRepositoryModule,
    RoleRepositoryModule,
    ClientRepositoryModule,
    ContextModule,
    PrismaModule,
  ],
  controllers: [UserController, UsersRolesController],
  providers: [UserService, UsersRolesService],
})
export class UserModule {}
