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
      hasSquashCourt = false,
      squashCourtAmount = 0,
      hasPlayground = false,
      playgroundAmount = 0,
      hasParking = false,
      parkingAmount = 0,
      hasGuestParking = false,
      guestParkingAmount = 0,
      hasBicycleRack = false,
      bicycleRackAmount = 0,
      hasCommercialStores = false,
      commercialStoresAmount = 0,
      hasStorageRoom = false,
      storageRoomAmount = 0,
      entriesDescription,
      entriesMediaFiles,
    } = config;

    let totalTowers = 0;
    let totalUnits = 0;

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete existing structure if any
      await tx.unit.deleteMany({ where: { clientId, tenantId } });
      await tx.floor.deleteMany({ where: { clientId, tenantId } });
      await tx.tower.deleteMany({ where: { clientId, tenantId } });
      await tx.clientProperties.deleteMany({ where: { clientId, tenantId } });

      if (
        structureType === ResidentialComplexType.SINGLE_BUILDING ||
        structureType === ResidentialComplexType.BUILDING_CLUSTER ||
        structureType === ResidentialComplexType.MIXED
      ) {
        if (structureType === ResidentialComplexType.SINGLE_BUILDING) {
          const floorsAmount = config.floorsAmount || 1;
          const defaultApts = config.apartmentsPerFloor || 1;
          const variationsMap = new Map<number, number>();
          if (config.customFloorVariations) {
            for (const v of config.customFloorVariations) {
              variationsMap.set(v.floorNumber, v.apartmentsAmount);
            }
          }

          const elevators =
            config.towers?.[0]?.elevators ?? (config as any).elevators ?? 0;

          const tower = await tx.tower.create({
            data: {
              tenantId,
              clientId,
              towerName: 'Edificio Principal',
              floorsAmount,
              elevators,
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
        } else {
          // BUILDING_CLUSTER or MIXED
          const towersList = config.towers || [];
          if (towersList.length > 0) {
            totalTowers = towersList.length;
            for (const tDef of towersList) {
              const variationsMap = new Map<number, number>();
              if (tDef.customFloorVariations) {
                for (const v of tDef.customFloorVariations) {
                  variationsMap.set(v.floorNumber, v.apartmentsAmount);
                }
              }

              const tower = await tx.tower.create({
                data: {
                  tenantId,
                  clientId,
                  towerName: tDef.towerName,
                  floorsAmount: tDef.floorsAmount,
                  elevators: tDef.elevators || 0,
                  createdBy: userId,
                },
              });

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
            const towersAmount = config.towersAmount || 1;
            const floorsAmount = config.floorsAmount || 1;
            const defaultApts = config.apartmentsPerFloor || 1;
            totalTowers = towersAmount;

            for (let t = 1; t <= towersAmount; t++) {
              const tower = await tx.tower.create({
                data: {
                  tenantId,
                  clientId,
                  towerName: `Torre ${t}`,
                  floorsAmount,
                  elevators: 0,
                  createdBy: userId,
                },
              });

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

                const unitsToInsert: Prisma.UnitCreateManyInput[] = [];
                for (let a = 1; a <= defaultApts; a++) {
                  const aptPadded = a < 10 ? `0${a}` : `${a}`;
                  const unitName = `Torre ${t} - ${f}${aptPadded}`;
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

          // In MIXED complexes, add commercial stores if defined
          if (structureType === ResidentialComplexType.MIXED && hasCommercialStores && commercialStoresAmount > 0) {
            const storeUnits: Prisma.UnitCreateManyInput[] = [];
            for (let s = 1; s <= commercialStoresAmount; s++) {
              storeUnits.push({
                tenantId,
                clientId,
                unitName: `Local Comercial ${s}`,
                unitType: UnitType.OFFICE,
                createdBy: userId,
              });
              totalUnits++;
            }
            if (storeUnits.length > 0) {
              await tx.unit.createMany({ data: storeUnits });
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
          hasSquashCourt,
          squashCourtAmount,
          hasPlayground,
          playgroundAmount,
          hasParking,
          parkingAmount,
          hasGuestParking,
          guestParkingAmount,
          hasBicycleRack,
          bicycleRackAmount,
          hasCommercialStores,
          commercialStoresAmount,
          hasStorageRoom,
          storageRoomAmount,
          entriesDescription: entriesDescription || undefined,
          entriesMediaFiles: entriesMediaFiles || undefined,
          createdBy: userId,
        },
      });
    });
  }
}
