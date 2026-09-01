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

  async createPermission(data: {
    key: string;
    desc?: string;
  }): Promise<Permission> {
    return await this.prisma.permission.create({
      data,
    });
  }

  async updatePermission(
    id: string,
    data: { key?: string; desc?: string },
  ): Promise<Permission> {
    return await this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  async deletePermission(id: string): Promise<Permission> {
    return await this.prisma.permission.delete({
      where: { id },
    });
  }

  async findPermissionById(id: string): Promise<Permission | null> {
    return await this.prisma.permission.findUnique({
      where: { id },
    });
  }
}
