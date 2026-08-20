import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StructureConfigDto } from '../dtos/client-structure.dto';
import { Prisma, ResidentialComplexType, UnitType } from '@prisma/client';

@Injectable()
export class ClientStructureGeneratorService {
  private readonly logger = Logger.name;

  constructor(private readonly prisma: PrismaService) {}

  async generateStructure(
    clientId: string,
    tenantId: string,
    config: StructureConfigDto,
    userId?: string,
  ): Promise<void> {
    const {
      structureType,
      hasSocialRoom = false,
      socialRoomAmount = 0,
      hasGym = false,
      gymAmount = 0,
      hasPool = false,
      poolAmount = 0,
      hasTennisCourt = false,
      tennisCourtAmount = 0,
      hasBasketballCourt = false,
      basketballCourtAmount = 0,
      hasFootballCourt = false,
      footballCourtAmount = 0,
      hasVolleyballCourt = false,
      volleyballCourtAmount = 0,
      hasPlayground = false,
      playgroundAmount = 0,
      hasParking = false,
      parkingAmount = 0,
      hasStorageRoom = false,
      storageRoomAmount = 0,
    } = config;

    let totalTowers = 0;
    let totalUnits = 0;

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete existing structure if any
      await tx.unit.deleteMany({ where: { clientId, tenantId } });
      await tx.floor.deleteMany({ where: { clientId, tenantId } });
      await tx.tower.deleteMany({ where: { clientId, tenantId } });
      await tx.clientProperties.deleteMany({ where: { clientId, tenantId } });

      if (structureType === ResidentialComplexType.SINGLE_BUILDING) {
        const floorsAmount = config.floorsAmount || 1;
        const defaultApts = config.apartmentsPerFloor || 1;
        const variationsMap = new Map<number, number>();
        if (config.customFloorVariations) {
          for (const v of config.customFloorVariations) {
            variationsMap.set(v.floorNumber, v.apartmentsAmount);
          }
        }

        const tower = await tx.tower.create({
          data: {
            tenantId,
            clientId,
            towerName: 'Edificio Principal',
            floorsAmount,
            createdBy: userId,
          },
        });
        totalTowers = 1;

        for (let f = 1; f <= floorsAmount; f++) {
          const floor = await tx.floor.create({
            data: {
              tenantId,
              clientId,
              towerId: tower.id,
              floorNumber: f,
              createdBy: userId,
            },
          });

          const aptsCount = variationsMap.get(f) ?? defaultApts;
          const unitsToInsert: Prisma.UnitCreateManyInput[] = [];

          for (let a = 1; a <= aptsCount; a++) {
            const aptPadded = a < 10 ? `0${a}` : `${a}`;
            const unitName = `Piso ${f} - ${f}${aptPadded}`;
            unitsToInsert.push({
              tenantId,
              clientId,
              towerId: tower.id,
              floorId: floor.id,
              unitName,
              unitType: UnitType.APARTMENT,
              createdBy: userId,
            });
            totalUnits++;
          }

          if (unitsToInsert.length > 0) {
            await tx.unit.createMany({ data: unitsToInsert });
          }
        }
      } else if (structureType === ResidentialComplexType.BUILDING_CLUSTER) {
        const towersList = config.towers || [];
        totalTowers = towersList.length || (config.towersAmount || 1);

        if (towersList.length > 0) {
          for (const tDef of towersList) {
            const tower = await tx.tower.create({
              data: {
                tenantId,
                clientId,
                towerName: tDef.towerName,
                floorsAmount: tDef.floorsAmount,
                createdBy: userId,
              },
            });

            const variationsMap = new Map<number, number>();
            if (tDef.customFloorVariations) {
              for (const v of tDef.customFloorVariations) {
                variationsMap.set(v.floorNumber, v.apartmentsAmount);
              }
            }

            for (let f = 1; f <= tDef.floorsAmount; f++) {
              const floor = await tx.floor.create({
                data: {
                  tenantId,
                  clientId,
                  towerId: tower.id,
                  floorNumber: f,
                  createdBy: userId,
                },
              });

              const aptsCount = variationsMap.get(f) ?? tDef.apartmentsPerFloor;
              const unitsToInsert: Prisma.UnitCreateManyInput[] = [];

              for (let a = 1; a <= aptsCount; a++) {
                const aptPadded = a < 10 ? `0${a}` : `${a}`;
                const unitName = `${tDef.towerName} - ${f}${aptPadded}`;
                unitsToInsert.push({
                  tenantId,
                  clientId,
                  towerId: tower.id,
                  floorId: floor.id,
                  unitName,
                  unitType: UnitType.APARTMENT,
                  createdBy: userId,
                });
                totalUnits++;
              }

              if (unitsToInsert.length > 0) {
                await tx.unit.createMany({ data: unitsToInsert });
              }
            }
          }
        } else {
          // Fallback loop if towers array is not provided, use towersAmount
          const floorsPerTower = config.floorsAmount || 1;
          const aptsPerFloor = config.apartmentsPerFloor || 1;

          for (let i = 1; i <= totalTowers; i++) {
            const tName = `Torre ${i}`;
            const tower = await tx.tower.create({
              data: {
                tenantId,
                clientId,
                towerName: tName,
                floorsAmount: floorsPerTower,
                createdBy: userId,
              },
            });

            for (let f = 1; f <= floorsPerTower; f++) {
              const floor = await tx.floor.create({
                data: {
                  tenantId,
                  clientId,
                  towerId: tower.id,
                  floorNumber: f,
                  createdBy: userId,
                },
              });

              const unitsToInsert: Prisma.UnitCreateManyInput[] = [];
              for (let a = 1; a <= aptsPerFloor; a++) {
                const aptPadded = a < 10 ? `0${a}` : `${a}`;
                const unitName = `${tName} - ${f}${aptPadded}`;
                unitsToInsert.push({
                  tenantId,
                  clientId,
                  towerId: tower.id,
                  floorId: floor.id,
                  unitName,
                  unitType: UnitType.APARTMENT,
                  createdBy: userId,
                });
                totalUnits++;
              }

              if (unitsToInsert.length > 0) {
                await tx.unit.createMany({ data: unitsToInsert });
              }
            }
          }
        }
      } else if (structureType === ResidentialComplexType.HOUSE_CLUSTER) {
        const uAmount = config.unitsAmount || 1;
        const prefix = config.prefix || 'Casa';
        totalUnits = uAmount;

        const unitsToInsert: Prisma.UnitCreateManyInput[] = [];
        for (let i = 1; i <= uAmount; i++) {
          unitsToInsert.push({
            tenantId,
            clientId,
            unitName: `${prefix} ${i}`,
            unitType: UnitType.HOUSE,
            createdBy: userId,
          });
        }
        await tx.unit.createMany({ data: unitsToInsert });
      } else {
        // OTHER
        const uAmount = config.unitsAmount || 1;
        const prefix = config.prefix || 'Unidad';
        totalUnits = uAmount;

        const unitsToInsert: Prisma.UnitCreateManyInput[] = [];
        for (let i = 1; i <= uAmount; i++) {
          unitsToInsert.push({
            tenantId,
            clientId,
            unitName: `${prefix} ${i}`,
            unitType: UnitType.OTHER,
            createdBy: userId,
          });
        }
        await tx.unit.createMany({ data: unitsToInsert });
      }

      // Create ClientProperties record
      await tx.clientProperties.create({
        data: {
          tenantId,
          clientId,
          structureType,
          towersAmount: totalTowers,
          unitsAmount: totalUnits,
          hasSocialRoom,
          socialRoomAmount,
          hasGym,
          gymAmount,
          hasPool,
          poolAmount,
          hasTennisCourt,
          tennisCourtAmount,
          hasBasketballCourt,
          basketballCourtAmount,
          hasFootballCourt,
          footballCourtAmount,
          hasVolleyballCourt,
          volleyballCourtAmount,
          hasPlayground,
          playgroundAmount,
          hasParking,
          parkingAmount,
          hasStorageRoom,
          storageRoomAmount,
          createdBy: userId,
        },
      });
    });
  }
}
