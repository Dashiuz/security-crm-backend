import { Module } from '@nestjs/common';
import { DepartmentRepositoryService } from './department.repository.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DepartmentRepositoryService],
  exports: [DepartmentRepositoryService],
})
export class DepartmentRepositoryModule {}
