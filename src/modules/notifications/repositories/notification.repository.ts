import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Notification, Prisma } from '@prisma/client';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.NotificationUncheckedCreateInput,
  ): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async findUnread(
    userId: string,
    tenantId: string,
    limit = 15,
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async countUnread(userId: string, tenantId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
    });
  }

  async findMany(
    where: Prisma.NotificationWhereInput,
    skip: number,
    take: number,
  ): Promise<[number, Notification[]]> {
    return this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);
  }

  async markAsRead(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<Notification> {
    return this.prisma.notification.update({
      where: {
        id,
        userId,
        tenantId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(
    userId: string,
    tenantId: string,
  ): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}
