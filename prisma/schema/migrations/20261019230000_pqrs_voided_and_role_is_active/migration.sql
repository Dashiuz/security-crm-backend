-- AlterEnum
ALTER TYPE "PqrsStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- AlterTable pqrs_tickets
ALTER TABLE "pqrs_tickets" ADD COLUMN IF NOT EXISTS "voidReason" TEXT,
ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "voidedById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pqrs_tickets_status_idx" ON "pqrs_tickets"("status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pqrs_tickets_voidedById_fkey'
  ) THEN
    ALTER TABLE "pqrs_tickets" ADD CONSTRAINT "pqrs_tickets_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable role
ALTER TABLE "role" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
