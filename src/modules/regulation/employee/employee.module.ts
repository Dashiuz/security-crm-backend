import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { EmployeeRepositoryModule } from '../../../common/repository/employee/employee.repository.module';

@Module({
  imports: [EmployeeRepositoryModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
