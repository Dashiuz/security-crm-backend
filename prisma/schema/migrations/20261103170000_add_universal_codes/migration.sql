-- CreateEnum
CREATE TYPE "CodeType" AS ENUM ('QR_CODE', 'BARCODE_128', 'BARCODE_EAN13');

-- CreateEnum
CREATE TYPE "CodePurpose" AS ENUM ('PATROL_CHECKPOINT', 'INVENTORY_ASSET', 'EMPLOYEE_CREDENTIAL', 'RESIDENT_VEHICLE', 'VISITOR_PASS', 'DOCUMENT_VERIFICATION', 'CORRESPONDENCE_PACKAGE', 'OTHER_CUSTOM');

-- CreateEnum
CREATE TYPE "CodeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "universal_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "codeType" "CodeType" NOT NULL DEFAULT 'QR_CODE',
    "purpose" "CodePurpose" NOT NULL DEFAULT 'PATROL_CHECKPOINT',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "department" VARCHAR(100),
    "clientId" TEXT,
    "status" "CodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "universal_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "universal_codes_tenantId_code_key" ON "universal_codes"("tenantId", "code");

-- CreateIndex
CREATE INDEX "universal_codes_tenantId_purpose_idx" ON "universal_codes"("tenantId", "purpose");

-- CreateIndex
CREATE INDEX "universal_codes_tenantId_clientId_idx" ON "universal_codes"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "universal_codes_tenantId_status_idx" ON "universal_codes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "universal_codes_tenantId_createdAt_idx" ON "universal_codes"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "universal_codes" ADD CONSTRAINT "universal_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universal_codes" ADD CONSTRAINT "universal_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universal_codes" ADD CONSTRAINT "universal_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

