import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepositoryService } from '../../../common/repository/index';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto } from './dtos';

@Injectable()
export class TenantService {
  constructor(private readonly tenantRepository: TenantRepositoryService) {}

  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantRepository.create(dto);
  }

  async list(): Promise<TenantResponseDto[]> {
    return this.tenantRepository.findAll();
  }

  async findOne(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
    await this.findOne(id);
    return this.tenantRepository.update(id, dto);
  }

  async remove(id: string): Promise<TenantResponseDto> {
    await this.findOne(id);
    return this.tenantRepository.remove(id);
  }
}
