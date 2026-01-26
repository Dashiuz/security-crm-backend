import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PermissionRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions(): Promise<Permission[]> {
    return await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      select: { id: true, key: true, desc: true },
    });
  }
}
