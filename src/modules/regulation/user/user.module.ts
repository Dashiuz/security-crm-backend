import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepositoryModule, EmployeeRepositoryModule } from '../../../common/repository/index';

@Module({
  imports: [UserRepositoryModule, EmployeeRepositoryModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
