-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'RENEWED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ClientSector" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'GOVERNMENT', 'OTHER');

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "clientStatus" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "contractStatus" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "contractNumber" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "receptionPhone" TEXT,
    "zipCode" TEXT,
    "address" TEXT,
    "country" TEXT,
    "city" TEXT,
    "state" TEXT,
    "commune" TEXT,
    "neighborhood" TEXT,
    "quadrant" TEXT,
    "observations" TEXT,
    "sector" "ClientSector" NOT NULL DEFAULT 'RESIDENTIAL',
    "coordinatorInChargeId" TEXT,
    "commercialContactId" TEXT,
    "installedTech" BOOLEAN NOT NULL DEFAULT false,
    "securityStudy" TEXT,
    "weaponsAmount" INTEGER NOT NULL DEFAULT 0,
    "administrator" TEXT,
    "administratorPhone" TEXT,
    "administratorEmail" TEXT,
    "contractDate" DATE NOT NULL,
    "lastContractDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_internalCode_key" ON "client"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "client_contractNumber_key" ON "client"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "client_nit_key" ON "client"("nit");

-- CreateIndex
CREATE INDEX "client_tenantId_idx" ON "client"("tenantId");

-- CreateIndex
CREATE INDEX "client_coordinatorInChargeId_idx" ON "client"("coordinatorInChargeId");

-- CreateIndex
CREATE INDEX "client_commercialContactId_idx" ON "client"("commercialContactId");

-- CreateIndex
CREATE UNIQUE INDEX "client_tenantId_nit_key" ON "client"("tenantId", "nit");

-- CreateIndex
CREATE UNIQUE INDEX "client_tenantId_internalCode_key" ON "client"("tenantId", "internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "client_tenantId_contractNumber_key" ON "client"("tenantId", "contractNumber");

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_coordinatorInChargeId_fkey" FOREIGN KEY ("coordinatorInChargeId") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_commercialContactId_fkey" FOREIGN KEY ("commercialContactId") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
