import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantRepositoryService } from '../../../common/repository/index';
import { CreateTenantDto, UpdateTenantDto, TenantResponseDto } from './dtos';

@Injectable()
export class TenantService {
  constructor(private readonly tenantRepository: TenantRepositoryService) {}

  private mapTenant(t: any): TenantResponseDto {
    return {
      ...t,
      features: t.features?.map((f: any) => f.key) || [],
    };
  }

  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.create(dto);
    return this.mapTenant(tenant);
  }

  async list(): Promise<TenantResponseDto[]> {
    const tenants = await this.tenantRepository.findAll();
    return tenants.map((t) => this.mapTenant(t));
  }

  async findOne(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.mapTenant(tenant);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.findOne(id);
    if ((tenant.slug === 'system' || tenant.id === 'system') && dto.isActive === false) {
      throw new BadRequestException('Cannot deactivate the system master tenant');
    }
    const updated = await this.tenantRepository.update(id, dto);
    return this.mapTenant(updated);
  }

  async remove(id: string): Promise<TenantResponseDto> {
    const tenant = await this.findOne(id);
    if (tenant.slug === 'system' || tenant.id === 'system') {
      throw new BadRequestException('Cannot delete the system master tenant');
    }
    const removed = await this.tenantRepository.remove(id);
    return this.mapTenant(removed);
  }

  async listFeatures() {
    return this.tenantRepository.getAllFeatures();
  }

  async syncFeatures(
    id: string,
    featureKeys: string[],
  ): Promise<TenantResponseDto> {
    await this.findOne(id);
    const updated = await this.tenantRepository.syncFeatures(id, featureKeys);
    return this.mapTenant(updated);
  }
}
