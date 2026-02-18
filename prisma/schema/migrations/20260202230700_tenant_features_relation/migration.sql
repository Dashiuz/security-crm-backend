-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[];
