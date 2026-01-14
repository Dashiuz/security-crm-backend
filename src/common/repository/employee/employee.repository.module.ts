import { Module } from '@nestjs/common';
import { EmployeeRepositoryService } from '../employee/employee.repository.service';

@Module({
  providers: [EmployeeRepositoryService],
  exports: [EmployeeRepositoryService],
})
export class EmployeeRepositoryModule {}
