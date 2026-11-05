-- AlterTable
ALTER TABLE "universal_codes" ADD COLUMN "batchId" VARCHAR(100);

-- CreateIndex
CREATE INDEX "universal_codes_tenantId_batchId_idx" ON "universal_codes"("tenantId", "batchId");

