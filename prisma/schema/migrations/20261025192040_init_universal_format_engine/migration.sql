-- CreateEnum
CREATE TYPE "FormatVisibilityScope" AS ENUM ('GLOBAL', 'PERSONAL');

-- CreateEnum
CREATE TYPE "FormatCategory" AS ENUM ('COMMERCIAL', 'HUMAN_RESOURCES', 'OPERATIONS', 'QUALITY_HSEQ', 'LEGAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "VariableSourceType" AS ENUM ('STATIC_TEXT', 'DATABASE_SYSTEM');

-- CreateTable
CREATE TABLE "universal_document_formats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "category" "FormatCategory" NOT NULL DEFAULT 'GENERAL',
    "scope" "FormatVisibilityScope" NOT NULL DEFAULT 'PERSONAL',
    "userId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bodyTemplate" TEXT NOT NULL,
    "sectionsConfig" JSONB NOT NULL DEFAULT '{}',
    "detectedVariables" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "universal_document_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "format_variables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" "FormatVisibilityScope" NOT NULL DEFAULT 'PERSONAL',
    "userId" TEXT,
    "key" VARCHAR(60) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "category" VARCHAR(50) DEFAULT 'GENERAL',
    "sourceType" "VariableSourceType" NOT NULL DEFAULT 'STATIC_TEXT',
    "staticValue" TEXT,
    "systemPath" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "format_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "universal_document_formats_tenantId_category_scope_idx" ON "universal_document_formats"("tenantId", "category", "scope");

-- CreateIndex
CREATE INDEX "universal_document_formats_tenantId_userId_idx" ON "universal_document_formats"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "format_variables_tenantId_scope_idx" ON "format_variables"("tenantId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "format_variables_tenantId_userId_key_key" ON "format_variables"("tenantId", "userId", "key");

-- AddForeignKey
ALTER TABLE "universal_document_formats" ADD CONSTRAINT "universal_document_formats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universal_document_formats" ADD CONSTRAINT "universal_document_formats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "format_variables" ADD CONSTRAINT "format_variables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "format_variables" ADD CONSTRAINT "format_variables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
