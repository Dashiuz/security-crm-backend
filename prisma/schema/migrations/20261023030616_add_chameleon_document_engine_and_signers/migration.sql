-- CreateEnum
CREATE TYPE "DocumentHeaderLayout" AS ENUM ('CLASSIC_MEMBRETE', 'BANNER_CINTILLO', 'MINIMALIST_TECH', 'MODERN_SPLIT');

-- CreateEnum
CREATE TYPE "SignerRoleScope" AS ENUM ('COMMERCIAL_DIRECTOR', 'LEGAL_REPRESENTATIVE', 'OPERATIONS_DIRECTOR', 'HUMAN_RESOURCES_HEAD', 'QUALITY_OFFICER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SnippetCategory" AS ENUM ('COMMERCIAL_PROPOSAL', 'LEGAL_CLAUSES', 'OPERATIONAL_ORDERS', 'HUMAN_RESOURCES', 'QUALITY_BASC');

-- AlterTable
ALTER TABLE "document_text_snippets" ADD COLUMN     "availableVariables" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "documentSkinId" TEXT,
ALTER COLUMN "commercialSettingsId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenant_document_skins" ADD COLUMN     "defaultFooterDisclaimer" TEXT,
ADD COLUMN     "headerLayout" "DocumentHeaderLayout" NOT NULL DEFAULT 'CLASSIC_MEMBRETE',
ADD COLUMN     "isoDocumentCodePrefix" TEXT DEFAULT 'CM-F',
ADD COLUMN     "neutralDarkHex" TEXT DEFAULT '#0F172A',
ADD COLUMN     "neutralLightHex" TEXT DEFAULT '#F8FAFC',
ADD COLUMN     "secondaryColorHex" TEXT DEFAULT '#F59E0B',
ADD COLUMN     "watermarkEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watermarkOpacity" DECIMAL(3,2) NOT NULL DEFAULT 0.06,
ADD COLUMN     "watermarkS3Key" TEXT;

-- CreateTable
CREATE TABLE "authorized_signers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentSkinId" TEXT NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "idNumber" VARCHAR(50) NOT NULL,
    "corporateTitle" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(50),
    "roleScope" "SignerRoleScope" NOT NULL DEFAULT 'CUSTOM',
    "signatureImageS3Key" TEXT,
    "signatureUrl" TEXT,
    "isDefaultCommercial" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultLegal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "authorized_signers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "authorized_signers_tenantId_isActive_idx" ON "authorized_signers"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "authorized_signers_tenantId_email_key" ON "authorized_signers"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "authorized_signers" ADD CONSTRAINT "authorized_signers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_signers" ADD CONSTRAINT "authorized_signers_documentSkinId_fkey" FOREIGN KEY ("documentSkinId") REFERENCES "tenant_document_skins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_text_snippets" ADD CONSTRAINT "document_text_snippets_documentSkinId_fkey" FOREIGN KEY ("documentSkinId") REFERENCES "tenant_document_skins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
