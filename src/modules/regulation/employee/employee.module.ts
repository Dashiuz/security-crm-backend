import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import {
  EmployeeRepositoryModule,
  UserRepositoryModule,
} from '../../../common/repository/index';

@Module({
  imports: [EmployeeRepositoryModule, UserRepositoryModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
