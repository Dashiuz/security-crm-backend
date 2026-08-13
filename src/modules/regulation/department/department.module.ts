import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { DepartmentRepositoryModule } from '../../../common/repository/department/department.repository.module';
import { UserRepositoryModule } from '../../../common/repository/user/user.repository.module';

@Module({
  imports: [DepartmentRepositoryModule, UserRepositoryModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
