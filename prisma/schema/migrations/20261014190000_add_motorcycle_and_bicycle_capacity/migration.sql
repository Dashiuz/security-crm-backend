-- AlterTable
ALTER TABLE "client_properties" ADD COLUMN     "bicycleCapacityPerRack" INTEGER DEFAULT 0,
ADD COLUMN     "hasMotorcycleParking" BOOLEAN DEFAULT false,
ADD COLUMN     "motorcycleParkingAmount" INTEGER DEFAULT 0;
