import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import {
  EmployeeRepositoryModule,
  UserRepositoryModule,
  DepartmentRepositoryModule,
  PositionRepositoryModule,
} from '../../../common/repository/index';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [
    EmployeeRepositoryModule,
    UserRepositoryModule,
    DepartmentRepositoryModule,
    PositionRepositoryModule,
    StorageModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
