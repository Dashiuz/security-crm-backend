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
  ): Promise<ParkingResidentVehicleControl[]> {
    return this.prisma.parkingResidentVehicleControl.findMany({ where });
  }

  async findUnique(
    where: Prisma.ParkingResidentVehicleControlWhereUniqueInput,
  ): Promise<ParkingResidentVehicleControl | null> {
    return this.prisma.parkingResidentVehicleControl.findUnique({ where });
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
