-- AlterTable
ALTER TABLE "user_client_access" ADD COLUMN "employeeId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "user_client_access_employeeId_idx" ON "user_client_access"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_client_access_employeeId_clientId_key" ON "user_client_access"("employeeId", "clientId");

-- AddForeignKey
ALTER TABLE "user_client_access" ADD CONSTRAINT "user_client_access_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing user_client_access records with employeeId by document match
UPDATE "user_client_access" uca
SET "employeeId" = e.id
FROM "users" u
JOIN "employee" e ON e.document = u.document AND e."tenantId" = u."tenantId"
WHERE uca."userId" = u.id AND uca."employeeId" IS NULL;

-- Insert user_client_access records for employees currently assigned to a client who do not have an access record yet
INSERT INTO "user_client_access" ("id", "tenantId", "clientId", "employeeId", "userId", "roleName", "isActive", "createdAt", "updatedAt")
SELECT 
  'uca_' || substr(md5(random()::text), 1, 20),
  e."tenantId",
  e."clientId",
  e.id,
  u.id,
  COALESCE(p.name, 'GUARDIA DE SEGURIDAD'),
  true,
  NOW(),
  NOW()
FROM "employee" e
LEFT JOIN "position" p ON p.id = e."positionId"
LEFT JOIN "users" u ON u.document = e.document AND u."tenantId" = e."tenantId"
WHERE e."clientId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "user_client_access" existing 
    WHERE existing."clientId" = e."clientId" 
      AND (existing."employeeId" = e.id OR (u.id IS NOT NULL AND existing."userId" = u.id))
  );
