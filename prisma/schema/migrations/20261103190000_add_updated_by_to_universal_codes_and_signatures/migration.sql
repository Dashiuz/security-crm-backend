-- AlterTable universal_codes
ALTER TABLE "universal_codes" ADD COLUMN "updatedById" TEXT;

-- AlterTable signature_requests
ALTER TABLE "signature_requests" ADD COLUMN "updatedById" TEXT;

-- AddForeignKey
ALTER TABLE "universal_codes" ADD CONSTRAINT "universal_codes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

