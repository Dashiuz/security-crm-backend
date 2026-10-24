-- AlterTable
ALTER TABLE "tenant_document_skins" DROP COLUMN IF EXISTS "commercialDirectorEmail",
DROP COLUMN IF EXISTS "commercialDirectorName",
DROP COLUMN IF EXISTS "commercialDirectorPhone",
DROP COLUMN IF EXISTS "commercialDirectorSigS3",
DROP COLUMN IF EXISTS "commercialDirectorTitle",
DROP COLUMN IF EXISTS "legalRepEmail",
DROP COLUMN IF EXISTS "legalRepName",
DROP COLUMN IF EXISTS "legalRepPhone",
DROP COLUMN IF EXISTS "legalRepSigS3",
DROP COLUMN IF EXISTS "legalRepTitle";
