import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentRepositoryService } from '../../../common/repository/department/department.repository.service';
import { UserRepositoryService } from '../../../common/repository/user/user.repository.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dtos/department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly departmentRepository: DepartmentRepositoryService,
    private readonly userRepository: UserRepositoryService,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    const name = dto.name?.trim().toUpperCase();
    return this.departmentRepository.create({ ...dto, name } as any);
  }

  async findAll(): Promise<any[]> {
    const depts = await this.departmentRepository.findMany();
    const createdByIds = depts.map((d: any) => d.createdBy).filter(Boolean);
    const userMap = await this.userRepository.findNamesByIds(createdByIds);

    return depts.map((d: any) => ({
      ...d,
      createdBy: d.createdBy === 'system' ? 'Sistema' : (userMap.get(d.createdBy) || d.createdBy || 'Sistema'),
    }));
  }

  async findOne(id: string): Promise<any> {
    const dept = (await this.departmentRepository.findOne(id)) as any;
    if (!dept) throw new NotFoundException('Department not found');
    const userMap = await this.userRepository.findNamesByIds(
      dept.createdBy ? [dept.createdBy] : [],
    );
    return {
      ...dept,
      createdBy: dept.createdBy === 'system' ? 'Sistema' : (userMap.get(dept.createdBy) || dept.createdBy || 'Sistema'),
    };
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    const payload = { ...dto };
    if (payload.name) {
      payload.name = payload.name.trim().toUpperCase();
    }
    return this.departmentRepository.update(
      id,
      payload as any,
    ) as Promise<DepartmentResponseDto>;
  }

  async remove(id: string): Promise<DepartmentResponseDto> {
    return this.departmentRepository.remove(
      id,
    ) as Promise<DepartmentResponseDto>;
  }

  async importDepartmentsFromCsv(
    data: Array<Record<string, string>>,
    fileName: string,
    user: any,
  ) {
    const existingDepartments = await this.departmentRepository.findMany();
    let successRows = 0;
    let errorRows = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      try {
        const rawName = row.Nombre || row.name || '';
        if (!rawName.trim()) {
          throw new Error('El campo "Nombre" es obligatorio.');
        }

        const name = rawName.trim().toUpperCase();

        const exists = existingDepartments.find(
          (d: any) => d.name.toUpperCase() === name,
        );
        if (exists) {
          throw new Error(`El departamento "${name}" ya existe.`);
        }

        const rawStatus = row.EstadoActivo || row.isActive || '';
        const isActive = rawStatus ? rawStatus.toString().trim().toUpperCase() === 'SI' : true;

        const newDept = await this.departmentRepository.create({
          name,
          isActive,
          createdBy: user.sub !== 'system' ? user.sub : null,
        } as any);

        existingDepartments.push(newDept);
        successRows++;
      } catch (err: any) {
        errorRows++;
        errors.push({
          row: rowNum,
          reason: err.message || 'Error desconocido al crear departamento.',
        });
      }
    }

    return {
      status: 'completed',
      totalRows: data.length,
      successRows,
      errorRows,
      errors,
    };
  }
}
