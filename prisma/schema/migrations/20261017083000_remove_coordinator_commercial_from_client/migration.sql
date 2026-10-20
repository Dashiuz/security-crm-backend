-- AlterTable: Drop foreign key constraints, indexes and columns from client
ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "client_coordinatorInChargeId_fkey";
ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "client_commercialContactId_fkey";

DROP INDEX IF EXISTS "client_coordinatorInChargeId_idx";
DROP INDEX IF EXISTS "client_commercialContactId_idx";

ALTER TABLE "client" DROP COLUMN IF EXISTS "coordinatorInChargeId";
ALTER TABLE "client" DROP COLUMN IF EXISTS "commercialContactId";
