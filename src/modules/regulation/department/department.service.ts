import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentRepositoryService } from '../../../common/repository/department/department.repository.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dtos/department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly departmentRepository: DepartmentRepositoryService,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    return this.departmentRepository.create(dto as any);
  }

  async findAll(): Promise<DepartmentResponseDto[]> {
    return this.departmentRepository.findMany() as Promise<
      DepartmentResponseDto[]
    >;
  }

  async findOne(id: string): Promise<DepartmentResponseDto> {
    const dept = await this.departmentRepository.findOne(id);
    if (!dept) throw new NotFoundException('Department not found');
    return dept as DepartmentResponseDto;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    return this.departmentRepository.update(
      id,
      dto as any,
    ) as Promise<DepartmentResponseDto>;
  }

  async remove(id: string): Promise<DepartmentResponseDto> {
    return this.departmentRepository.remove(
      id,
    ) as Promise<DepartmentResponseDto>;
  }
}
