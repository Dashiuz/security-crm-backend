-- CreateEnum
CREATE TYPE "OperationalCategory" AS ENUM ('DIRECTOR', 'COORDINATOR', 'SUPERVISOR', 'GUARD', 'OPERATOR', 'ADMINISTRATIVE', 'OTHER');

-- AlterTable
ALTER TABLE "position" ADD COLUMN "operationalCategory" "OperationalCategory" NOT NULL DEFAULT 'GUARD';

-- CreateIndex
CREATE INDEX "position_operationalCategory_idx" ON "position"("operationalCategory");

-- Data Backfill for existing positions
UPDATE "position" SET "operationalCategory" = 'DIRECTOR' WHERE lower("name") LIKE '%direct%' OR lower("name") LIKE '%geren%';
UPDATE "position" SET "operationalCategory" = 'COORDINATOR' WHERE lower("name") LIKE '%coord%';
UPDATE "position" SET "operationalCategory" = 'SUPERVISOR' WHERE lower("name") LIKE '%superv%';
UPDATE "position" SET "operationalCategory" = 'OPERATOR' WHERE lower("name") LIKE '%cctv%' OR lower("name") LIKE '%medio%' OR lower("name") LIKE '%operad%' OR lower("name") LIKE '%consola%';
UPDATE "position" SET "operationalCategory" = 'ADMINISTRATIVE' WHERE lower("name") LIKE '%admin%' OR lower("name") LIKE '%comercial%' OR lower("name") LIKE '%rrhh%' OR lower("name") LIKE '%talento%';
