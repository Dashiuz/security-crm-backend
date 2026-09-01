import { Injectable } from '@nestjs/common';
import { Prisma, ParkingResidentVehicleControl } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ParkingControlRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ParkingResidentVehicleControlCreateInput,
  ): Promise<ParkingResidentVehicleControl> {
    return this.prisma.parkingResidentVehicleControl.create({ data });
  }

  async findMany(
    where?: Prisma.ParkingResidentVehicleControlWhereInput,
  ): Promise<any[]> {
    const rows = await this.prisma.parkingResidentVehicleControl.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
        mediaAttachments: { select: { id: true, url: true, fileName: true, mimeType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      ...r,
      createdBy: r.createdBy?.fullName || 'Sistema',
      clientName: r.client?.name || null,
    }));
  }

  async findUnique(
    where: Prisma.ParkingResidentVehicleControlWhereUniqueInput,
  ): Promise<any> {
    return this.prisma.parkingResidentVehicleControl.findUnique({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        client: { select: { id: true, name: true } },
        mediaAttachments: { select: { id: true, url: true, fileName: true, mimeType: true } },
      },
    });
  }

  async update(
    where: Prisma.ParkingResidentVehicleControlWhereUniqueInput,
    data: Prisma.ParkingResidentVehicleControlUpdateInput,
  ): Promise<ParkingResidentVehicleControl> {
    return this.prisma.parkingResidentVehicleControl.update({ where, data });
  }

  async delete(
    where: Prisma.ParkingResidentVehicleControlWhereUniqueInput,
  ): Promise<ParkingResidentVehicleControl> {
    return this.prisma.parkingResidentVehicleControl.delete({ where });
  }
}
