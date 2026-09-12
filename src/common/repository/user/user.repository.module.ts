import { Module } from '@nestjs/common';
import { UserRepositoryService } from '../user/user.repository.service';
import { StorageModule } from '../../../modules/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [UserRepositoryService],
  exports: [UserRepositoryService],
})
export class UserRepositoryModule {}
