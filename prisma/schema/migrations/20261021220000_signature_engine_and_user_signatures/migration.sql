-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignatureStatus') THEN
    CREATE TYPE "SignatureStatus" AS ENUM ('DRAFT', 'PENDING', 'VIEWED', 'SIGNED', 'REJECTED', 'EXPIRED', 'REVOKED');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignatureDocumentType') THEN
    CREATE TYPE "SignatureDocumentType" AS ENUM ('QUOTATION', 'PURCHASE_ORDER', 'SERVICE_ORDER', 'EMPLOYMENT_CONTRACT', 'EQUIPMENT_DELIVERY', 'OPERATIONAL_MINUTE', 'GENERAL_FORMAT');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignatureCreationMode') THEN
    CREATE TYPE "SignatureCreationMode" AS ENUM ('DRAW', 'TYPE', 'UPLOAD');
  END IF;
END $$;

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signatureMethod" "SignatureCreationMode";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signatureUpdatedAt" TIMESTAMP(3);

-- AlterTable employee
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "signatureMethod" "SignatureCreationMode";
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "signatureUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "signature_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" "SignatureDocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL DEFAULT 1,
    "draftSnapshot" JSONB,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signerDocument" TEXT,
    "signerPhone" TEXT,
    "signerRole" TEXT,
    "status" "SignatureStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "originalDocHash" TEXT,
    "signedDocHash" TEXT,
    "signatureMethod" "SignatureCreationMode",
    "signatureIp" TEXT,
    "signatureUa" TEXT,
    "signatureImage" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "otpCodeHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "mediaAttachmentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "signature_requests_token_key" ON "signature_requests"("token");
CREATE INDEX IF NOT EXISTS "signature_requests_tenantId_idx" ON "signature_requests"("tenantId");
CREATE INDEX IF NOT EXISTS "signature_requests_tenantId_status_idx" ON "signature_requests"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "signature_requests_documentType_documentId_idx" ON "signature_requests"("documentType", "documentId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signature_requests_tenantId_fkey'
  ) THEN
    ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_tenantId_fkey" 
      FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signature_requests_mediaAttachmentId_fkey'
  ) THEN
    ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_mediaAttachmentId_fkey" 
      FOREIGN KEY ("mediaAttachmentId") REFERENCES "media_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signature_requests_createdById_fkey'
  ) THEN
    ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_createdById_fkey" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
