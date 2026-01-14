import { Module } from '@nestjs/common';
import { UserRepositoryService } from '../user/user.repository.service';

@Module({
  providers: [UserRepositoryService],
  exports: [UserRepositoryService],
})
export class UserRepositoryModule {}
