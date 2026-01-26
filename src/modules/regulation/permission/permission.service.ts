import { Injectable } from '@nestjs/common';
import { PermissionRepositoryService } from '../../../common/repository/index';

@Injectable()
export class PermissionService {
  constructor(
    private readonly permissionRepository: PermissionRepositoryService,
  ) {}
  async list() {
    return await this.permissionRepository.listPermissions();
  }
}
