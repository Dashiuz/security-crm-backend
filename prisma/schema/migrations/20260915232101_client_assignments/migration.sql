/*
  Warnings:

  - You are about to drop the column `guardOnDutyNameSnapshot` on the `correspondence_received_control` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AdministrationType" AS ENUM ('ENTERPRISE', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ResidentialComplexType" AS ENUM ('SINGLE_BUILDING', 'BUILDING_CLUSTER', 'HOUSE_CLUSTER', 'MIXED', 'COMMERCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ResidentType" AS ENUM ('OWNER', 'TENANT', 'FAMILY_MEMBER', 'OTHER');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('CI', 'CE', 'PASSPORT', 'NIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ResidencePlaceholder" AS ENUM ('LETTER', 'NUMBER', 'ALPHANUMERIC');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('APARTMENT', 'HOUSE', 'OFFICE', 'WAREHOUSE', 'OTHER', 'TOWNHOUSE', 'BODEGA');

-- AlterEnum
ALTER TYPE "ClientStatus" ADD VALUE 'PROSPECT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CorrespondenceType" ADD VALUE 'DOCUMENT';
ALTER TYPE "CorrespondenceType" ADD VALUE 'LETTER';
ALTER TYPE "CorrespondenceType" ADD VALUE 'PACKAGE';
ALTER TYPE "CorrespondenceType" ADD VALUE 'FOOD_DELIVERY';

-- DropForeignKey
ALTER TABLE "client" DROP CONSTRAINT "client_commercialContactId_fkey";

-- DropForeignKey
ALTER TABLE "client" DROP CONSTRAINT "client_coordinatorInChargeId_fkey";

-- DropForeignKey
ALTER TABLE "client" DROP CONSTRAINT "client_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "correspondence_received_control" DROP CONSTRAINT "correspondence_received_control_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "department" DROP CONSTRAINT "department_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "minuta" DROP CONSTRAINT "minuta_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "parking_resident_vehicle_control" DROP CONSTRAINT "parking_resident_vehicle_control_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "position" DROP CONSTRAINT "position_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "role" DROP CONSTRAINT "role_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "visitor_entry_control" DROP CONSTRAINT "visitor_entry_control_tenantId_fkey";

-- AlterTable
ALTER TABLE "client" ADD COLUMN     "administrationCompanyData" JSONB,
ADD COLUMN     "administrationType" "AdministrationType",
ADD COLUMN     "cai" TEXT,
ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractMediaFiles" JSONB,
ADD COLUMN     "councilData" JSONB,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "quadrantPhone" TEXT,
ADD COLUMN     "renewedContract" BOOLEAN DEFAULT false,
ADD COLUMN     "updatedById" TEXT,
ALTER COLUMN "contractNumber" DROP NOT NULL,
ALTER COLUMN "contractDate" DROP NOT NULL,
ALTER COLUMN "lastContractDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "correspondence_received_control" DROP COLUMN "guardOnDutyNameSnapshot",
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "deliveryEvidenceUrl" TEXT,
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "guardNameSnapshot" TEXT,
ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recipientEmployeeId" TEXT,
ADD COLUMN     "recipientResidentId" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "employee" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "minuta" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "guardPost" TEXT,
ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isResidentLinked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noveltySource" TEXT,
ADD COLUMN     "residentId" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "parking_resident_vehicle_control" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "residentId" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "visitor_entry_control" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "residentId" TEXT,
ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "client_properties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "structureType" "ResidentialComplexType" NOT NULL DEFAULT 'BUILDING_CLUSTER',
    "towersAmount" INTEGER DEFAULT 0,
    "unitsAmount" INTEGER DEFAULT 0,
    "hasSocialRoom" BOOLEAN DEFAULT false,
    "socialRoomAmount" INTEGER DEFAULT 0,
    "hasGym" BOOLEAN DEFAULT false,
    "gymAmount" INTEGER DEFAULT 0,
    "hasPool" BOOLEAN DEFAULT false,
    "poolAmount" INTEGER DEFAULT 0,
    "hasTennisCourt" BOOLEAN DEFAULT false,
    "tennisCourtAmount" INTEGER DEFAULT 0,
    "hasBasketballCourt" BOOLEAN DEFAULT false,
    "basketballCourtAmount" INTEGER DEFAULT 0,
    "hasFootballCourt" BOOLEAN DEFAULT false,
    "footballCourtAmount" INTEGER DEFAULT 0,
    "hasVolleyballCourt" BOOLEAN DEFAULT false,
    "volleyballCourtAmount" INTEGER DEFAULT 0,
    "hasSquashCourt" BOOLEAN DEFAULT false,
    "squashCourtAmount" INTEGER DEFAULT 0,
    "hasPlayground" BOOLEAN DEFAULT false,
    "playgroundAmount" INTEGER DEFAULT 0,
    "hasParking" BOOLEAN DEFAULT false,
    "parkingAmount" INTEGER DEFAULT 0,
    "hasGuestParking" BOOLEAN DEFAULT false,
    "guestParkingAmount" INTEGER DEFAULT 0,
    "hasBicycleRack" BOOLEAN DEFAULT false,
    "bicycleRackAmount" INTEGER DEFAULT 0,
    "hasCommercialStores" BOOLEAN DEFAULT false,
    "commercialStoresAmount" INTEGER DEFAULT 0,
    "hasStorageRoom" BOOLEAN DEFAULT false,
    "storageRoomAmount" INTEGER DEFAULT 0,
    "entriesDescription" JSONB,
    "entriesMediaFiles" JSONB,
    "structureConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,

    CONSTRAINT "client_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_import_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "errorDetails" JSONB,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "towerId" TEXT,
    "floorNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_attachments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientPropertiesId" TEXT,
    "residentId" TEXT,
    "minutaId" TEXT,
    "correspondenceId" TEXT,
    "parkingVehicleId" TEXT,
    "visitorEntryId" TEXT,
    "employeeId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "residentType" "ResidentType" NOT NULL,
    "idType" "IdType",
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "gender" VARCHAR(1),
    "birthdate" TIMESTAMP(3),
    "residentSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessStartDate" TIMESTAMP(3),
    "accessEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "towers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "towerName" VARCHAR(50) NOT NULL,
    "floorsAmount" INTEGER NOT NULL DEFAULT 0,
    "elevators" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,

    CONSTRAINT "towers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "towerId" TEXT,
    "floorId" TEXT,
    "unitName" VARCHAR(50) NOT NULL,
    "unitType" "UnitType" NOT NULL DEFAULT 'APARTMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_properties_clientId_key" ON "client_properties"("clientId");

-- CreateIndex
CREATE INDEX "client_properties_tenantId_idx" ON "client_properties"("tenantId");

-- CreateIndex
CREATE INDEX "client_properties_clientId_idx" ON "client_properties"("clientId");

-- CreateIndex
CREATE INDEX "file_import_logs_tenantId_idx" ON "file_import_logs"("tenantId");

-- CreateIndex
CREATE INDEX "floors_tenantId_idx" ON "floors"("tenantId");

-- CreateIndex
CREATE INDEX "floors_clientId_idx" ON "floors"("clientId");

-- CreateIndex
CREATE INDEX "floors_towerId_idx" ON "floors"("towerId");

-- CreateIndex
CREATE UNIQUE INDEX "media_attachments_s3Key_key" ON "media_attachments"("s3Key");

-- CreateIndex
CREATE INDEX "media_attachments_tenantId_idx" ON "media_attachments"("tenantId");

-- CreateIndex
CREATE INDEX "media_attachments_clientId_idx" ON "media_attachments"("clientId");

-- CreateIndex
CREATE INDEX "media_attachments_residentId_idx" ON "media_attachments"("residentId");

-- CreateIndex
CREATE INDEX "media_attachments_minutaId_idx" ON "media_attachments"("minutaId");

-- CreateIndex
CREATE INDEX "media_attachments_employeeId_idx" ON "media_attachments"("employeeId");

-- CreateIndex
CREATE INDEX "media_attachments_s3Key_idx" ON "media_attachments"("s3Key");

-- CreateIndex
CREATE INDEX "resident_tenantId_idx" ON "resident"("tenantId");

-- CreateIndex
CREATE INDEX "resident_clientId_idx" ON "resident"("clientId");

-- CreateIndex
CREATE INDEX "resident_unitId_idx" ON "resident"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "resident_tenantId_clientId_document_key" ON "resident"("tenantId", "clientId", "document");

-- CreateIndex
CREATE INDEX "towers_tenantId_idx" ON "towers"("tenantId");

-- CreateIndex
CREATE INDEX "towers_clientId_idx" ON "towers"("clientId");

-- CreateIndex
CREATE INDEX "units_tenantId_idx" ON "units"("tenantId");

-- CreateIndex
CREATE INDEX "units_clientId_idx" ON "units"("clientId");

-- CreateIndex
CREATE INDEX "units_towerId_idx" ON "units"("towerId");

-- CreateIndex
CREATE INDEX "units_floorId_idx" ON "units"("floorId");

-- CreateIndex
CREATE INDEX "client_createdById_idx" ON "client"("createdById");

-- CreateIndex
CREATE INDEX "correspondence_received_control_clientId_idx" ON "correspondence_received_control"("clientId");

-- CreateIndex
CREATE INDEX "correspondence_received_control_unitId_idx" ON "correspondence_received_control"("unitId");

-- CreateIndex
CREATE INDEX "correspondence_received_control_recipientResidentId_idx" ON "correspondence_received_control"("recipientResidentId");

-- CreateIndex
CREATE INDEX "correspondence_received_control_recipientEmployeeId_idx" ON "correspondence_received_control"("recipientEmployeeId");

-- CreateIndex
CREATE INDEX "correspondence_received_control_tenantId_clientId_idx" ON "correspondence_received_control"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "correspondence_received_control_tenantId_isInternal_idx" ON "correspondence_received_control"("tenantId", "isInternal");

-- CreateIndex
CREATE INDEX "employee_clientId_idx" ON "employee"("clientId");

-- CreateIndex
CREATE INDEX "minuta_clientId_idx" ON "minuta"("clientId");

-- CreateIndex
CREATE INDEX "minuta_unitId_idx" ON "minuta"("unitId");

-- CreateIndex
CREATE INDEX "minuta_residentId_idx" ON "minuta"("residentId");

-- CreateIndex
CREATE INDEX "minuta_tenantId_clientId_idx" ON "minuta"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "minuta_tenantId_isInternal_idx" ON "minuta"("tenantId", "isInternal");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_clientId_idx" ON "parking_resident_vehicle_control"("clientId");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_unitId_idx" ON "parking_resident_vehicle_control"("unitId");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_residentId_idx" ON "parking_resident_vehicle_control"("residentId");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_employeeId_idx" ON "parking_resident_vehicle_control"("employeeId");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_tenantId_clientId_idx" ON "parking_resident_vehicle_control"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_tenantId_isInternal_idx" ON "parking_resident_vehicle_control"("tenantId", "isInternal");

-- CreateIndex
CREATE INDEX "users_clientId_idx" ON "users"("clientId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_clientId_idx" ON "visitor_entry_control"("clientId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_unitId_idx" ON "visitor_entry_control"("unitId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_residentId_idx" ON "visitor_entry_control"("residentId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_employeeId_idx" ON "visitor_entry_control"("employeeId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_tenantId_clientId_idx" ON "visitor_entry_control"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_tenantId_isInternal_idx" ON "visitor_entry_control"("tenantId", "isInternal");

-- AddForeignKey
ALTER TABLE "client_properties" ADD CONSTRAINT "client_properties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_properties" ADD CONSTRAINT "client_properties_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_coordinatorInChargeId_fkey" FOREIGN KEY ("coordinatorInChargeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_commercialContactId_fkey" FOREIGN KEY ("commercialContactId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_recipientEmployeeId_fkey" FOREIGN KEY ("recipientEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_recipientResidentId_fkey" FOREIGN KEY ("recipientResidentId") REFERENCES "resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_import_logs" ADD CONSTRAINT "file_import_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "towers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_clientPropertiesId_fkey" FOREIGN KEY ("clientPropertiesId") REFERENCES "client_properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_minutaId_fkey" FOREIGN KEY ("minutaId") REFERENCES "minuta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_correspondenceId_fkey" FOREIGN KEY ("correspondenceId") REFERENCES "correspondence_received_control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_parkingVehicleId_fkey" FOREIGN KEY ("parkingVehicleId") REFERENCES "parking_resident_vehicle_control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_visitorEntryId_fkey" FOREIGN KEY ("visitorEntryId") REFERENCES "visitor_entry_control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident" ADD CONSTRAINT "resident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident" ADD CONSTRAINT "resident_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident" ADD CONSTRAINT "resident_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident" ADD CONSTRAINT "resident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident" ADD CONSTRAINT "resident_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident" ADD CONSTRAINT "resident_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towers" ADD CONSTRAINT "towers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towers" ADD CONSTRAINT "towers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "towers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
