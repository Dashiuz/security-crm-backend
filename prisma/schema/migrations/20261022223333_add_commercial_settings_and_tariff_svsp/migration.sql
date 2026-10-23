-- CreateEnum
CREATE TYPE "CommercialSector" AS ENUM ('COMMERCIAL_PUBLIC', 'RESIDENTIAL_STRATA_4_6', 'RESIDENTIAL_STRATA_1_3');

-- CreateEnum
CREATE TYPE "WeaponModality" AS ENUM ('NO_WEAPON', 'LETHAL_WEAPON', 'NON_LETHAL_WEAPON', 'CANINE_SUPPORT');

-- CreateEnum
CREATE TYPE "ShiftScheduleType" AS ENUM ('SCHEDULE_2X2X2', 'SCHEDULE_3X3X2', 'SCHEDULE_4X4X2', 'SCHEDULE_5X1', 'SCHEDULE_5X2', 'SCHEDULE_6X1', 'SCHEDULE_6X2', 'SCHEDULE_7X1', 'SPECIAL_CUSTOM');

-- CreateEnum
CREATE TYPE "WorkingDaysModality" AS ENUM ('DAYS_30_ALL_MONTH', 'DAYS_26_MON_SAT_HOL', 'DAYS_24_MON_SAT_NO_HOL', 'DAYS_22_MON_FRI_HOL', 'DAYS_20_MON_FRI_NO_HOL', 'DAYS_10_WEEKEND_HOL', 'DAYS_8_WEEKEND_ONLY', 'DAYS_2_HOLIDAYS_ONLY');

-- CreateEnum
CREATE TYPE "ValueAddedCategory" AS ENUM ('POST_EQUIPMENT', 'SERVICE_SUPPORT', 'TECHNOLOGY_COMODATO', 'SECURITY_STUDY', 'CASH_REINVESTMENT');

-- CreateEnum
CREATE TYPE "InternalDepartment" AS ENUM ('CONTRACTS', 'OPERATIONS', 'WAREHOUSE', 'MONITORING_CENTER', 'CUSTOMER_SERVICE', 'HUMAN_RESOURCES', 'QUALITY_ASSURANCE', 'ACCOUNTING', 'TREASURY');

-- AlterTable
ALTER TABLE "signature_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "commercial_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultAiuRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "defaultIvaOnAiuRate" DECIMAL(5,4) NOT NULL DEFAULT 0.19,
    "defaultRetefuenteRate" DECIMAL(5,4) NOT NULL DEFAULT 0.02,
    "defaultReteIcaRate" DECIMAL(6,5) NOT NULL DEFAULT 0.0138,
    "maxReinvestmentPct1Yr" DECIMAL(5,4) NOT NULL DEFAULT 0.80,
    "maxReinvestmentPct2Yr" DECIMAL(5,4) NOT NULL DEFAULT 1.60,
    "defaultQuoteValidityDays" INTEGER NOT NULL DEFAULT 15,
    "enableGuardSalaryDisplay" BOOLEAN NOT NULL DEFAULT true,
    "qualityDocCode" TEXT NOT NULL DEFAULT 'CM-F-001',
    "qualityDocVersion" TEXT NOT NULL DEFAULT 'V.4',
    "qualityDocRevisionDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "commercial_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_period_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commercialSettingsId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "smmlv" DECIMAL(12,2) NOT NULL DEFAULT 1750905.00,
    "monthlyTransportAux" DECIMAL(12,2) NOT NULL DEFAULT 249095.00,
    "dailyTransportAux" DECIMAL(12,2) NOT NULL DEFAULT 8303.17,
    "statutoryWeeklyHours" INTEGER NOT NULL DEFAULT 44,
    "baseHourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 7959.00,
    "statutoryDayHours" INTEGER NOT NULL DEFAULT 15,
    "statutoryNightHours" INTEGER NOT NULL DEFAULT 9,
    "dayProportionFactor" DECIMAL(6,4) NOT NULL DEFAULT 0.5597,
    "nightProportionFactor" DECIMAL(6,4) NOT NULL DEFAULT 0.4403,
    "commercialMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 8.8,
    "strata46Multiplier" DECIMAL(4,2) NOT NULL DEFAULT 8.6,
    "strata13Multiplier" DECIMAL(10,8) NOT NULL DEFAULT 7.66376105,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "tariff_period_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_service_catalogs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commercialSettingsId" TEXT NOT NULL,
    "serviceCode" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "targetPosition" TEXT NOT NULL,
    "sector" "CommercialSector" NOT NULL,
    "weaponModality" "WeaponModality" NOT NULL,
    "scheduleType" "ShiftScheduleType" NOT NULL DEFAULT 'SCHEDULE_2X2X2',
    "daysModality" "WorkingDaysModality" NOT NULL DEFAULT 'DAYS_30_ALL_MONTH',
    "dailyTotalHours" INTEGER NOT NULL,
    "dayHours" INTEGER NOT NULL,
    "nightHours" INTEGER NOT NULL,
    "billableDaysPerMonth" INTEGER NOT NULL,
    "adminSupervisionPct" DECIMAL(5,4) NOT NULL,
    "isSystemStandard" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "security_service_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_salary_matrices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commercialSettingsId" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "scheduleType" "ShiftScheduleType" NOT NULL DEFAULT 'SCHEDULE_2X2X2',
    "guardsRequiredPerPost" DECIMAL(4,2) NOT NULL DEFAULT 3.0,
    "baseSalary" DECIMAL(12,2) NOT NULL DEFAULT 1750905.00,
    "transportAllowance" DECIMAL(12,2) NOT NULL DEFAULT 249095.00,
    "shiftOrdinaryHours" INTEGER NOT NULL DEFAULT 8,
    "shiftExtraHours" INTEGER NOT NULL DEFAULT 4,
    "estimatedOvertimePay" DECIMAL(12,2) NOT NULL,
    "grossSalary" DECIMAL(12,2) NOT NULL,
    "healthDeductionPct" DECIMAL(5,4) NOT NULL DEFAULT 0.04,
    "pensionDeductionPct" DECIMAL(5,4) NOT NULL DEFAULT 0.04,
    "healthDeduction" DECIMAL(12,2) NOT NULL,
    "pensionDeduction" DECIMAL(12,2) NOT NULL,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "fixedBonusNonSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vehicleAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netTakeHomePay" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "position_salary_matrices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_added_catalog_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commercialSettingsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ValueAddedCategory" NOT NULL,
    "description" TEXT,
    "internalReferenceCost" DECIMAL(12,2) NOT NULL,
    "isStandardBenefit" BOOLEAN NOT NULL DEFAULT false,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "value_added_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_document_skins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commercialSettingsId" TEXT NOT NULL,
    "primaryBrandColorHex" TEXT NOT NULL DEFAULT '#1E1B4B',
    "accentBrandColorHex" TEXT NOT NULL DEFAULT '#7C3AED',
    "logoS3Key" TEXT,
    "secondaryLogoS3Key" TEXT,
    "companyLegalName" TEXT NOT NULL,
    "companyNit" TEXT NOT NULL,
    "commercialRegisterNum" TEXT,
    "supervigilanciaLicense" TEXT,
    "supervigilanciaLicDate" DATE,
    "supervigilanciaLicExpiry" DATE,
    "minTicLicenseNum" TEXT,
    "uniformsResolutionNum" TEXT,
    "overtimeResolutionNum" TEXT,
    "sstImplementationPct" DECIMAL(5,2) DEFAULT 99.5,
    "hasIso9001Certified" BOOLEAN NOT NULL DEFAULT true,
    "hasBascCertified" BOOLEAN NOT NULL DEFAULT true,
    "hasPoliceSupportNetwork" BOOLEAN NOT NULL DEFAULT true,
    "hasDijinEnterpriseFront" BOOLEAN NOT NULL DEFAULT true,
    "commercialDirectorName" TEXT,
    "commercialDirectorTitle" TEXT DEFAULT 'Director Comercial',
    "commercialDirectorEmail" TEXT,
    "commercialDirectorPhone" TEXT,
    "commercialDirectorSigS3" TEXT,
    "legalRepName" TEXT,
    "legalRepTitle" TEXT DEFAULT 'Representante Legal y Gerente General',
    "legalRepEmail" TEXT,
    "legalRepPhone" TEXT,
    "legalRepSigS3" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "tenant_document_skins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_text_snippets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commercialSettingsId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "document_text_snippets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_distribution_recipients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commercialSettingsId" TEXT NOT NULL,
    "department" "InternalDepartment" NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "service_order_distribution_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commercial_settings_tenantId_key" ON "commercial_settings"("tenantId");

-- CreateIndex
CREATE INDEX "commercial_settings_tenantId_idx" ON "commercial_settings"("tenantId");

-- CreateIndex
CREATE INDEX "tariff_period_configs_tenantId_isActive_idx" ON "tariff_period_configs"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_period_configs_tenantId_year_label_key" ON "tariff_period_configs"("tenantId", "year", "label");

-- CreateIndex
CREATE INDEX "security_service_catalogs_tenantId_sector_weaponModality_idx" ON "security_service_catalogs"("tenantId", "sector", "weaponModality");

-- CreateIndex
CREATE UNIQUE INDEX "security_service_catalogs_tenantId_serviceCode_key" ON "security_service_catalogs"("tenantId", "serviceCode");

-- CreateIndex
CREATE INDEX "position_salary_matrices_tenantId_isActive_idx" ON "position_salary_matrices"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "position_salary_matrices_tenantId_positionTitle_scheduleTyp_key" ON "position_salary_matrices"("tenantId", "positionTitle", "scheduleType");

-- CreateIndex
CREATE INDEX "value_added_catalog_items_tenantId_category_idx" ON "value_added_catalog_items"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "value_added_catalog_items_tenantId_name_key" ON "value_added_catalog_items"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_document_skins_tenantId_key" ON "tenant_document_skins"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_document_skins_commercialSettingsId_key" ON "tenant_document_skins"("commercialSettingsId");

-- CreateIndex
CREATE INDEX "tenant_document_skins_tenantId_idx" ON "tenant_document_skins"("tenantId");

-- CreateIndex
CREATE INDEX "document_text_snippets_tenantId_category_idx" ON "document_text_snippets"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "document_text_snippets_tenantId_key_key" ON "document_text_snippets"("tenantId", "key");

-- CreateIndex
CREATE INDEX "service_order_distribution_recipients_tenantId_isActive_idx" ON "service_order_distribution_recipients"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "service_order_distribution_recipients_tenantId_department_key" ON "service_order_distribution_recipients"("tenantId", "department");

-- CreateIndex
CREATE INDEX "signature_requests_token_idx" ON "signature_requests"("token");

-- AddForeignKey
ALTER TABLE "commercial_settings" ADD CONSTRAINT "commercial_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_period_configs" ADD CONSTRAINT "tariff_period_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_period_configs" ADD CONSTRAINT "tariff_period_configs_commercialSettingsId_fkey" FOREIGN KEY ("commercialSettingsId") REFERENCES "commercial_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_service_catalogs" ADD CONSTRAINT "security_service_catalogs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_service_catalogs" ADD CONSTRAINT "security_service_catalogs_commercialSettingsId_fkey" FOREIGN KEY ("commercialSettingsId") REFERENCES "commercial_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_salary_matrices" ADD CONSTRAINT "position_salary_matrices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_salary_matrices" ADD CONSTRAINT "position_salary_matrices_commercialSettingsId_fkey" FOREIGN KEY ("commercialSettingsId") REFERENCES "commercial_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_added_catalog_items" ADD CONSTRAINT "value_added_catalog_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_added_catalog_items" ADD CONSTRAINT "value_added_catalog_items_commercialSettingsId_fkey" FOREIGN KEY ("commercialSettingsId") REFERENCES "commercial_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_document_skins" ADD CONSTRAINT "tenant_document_skins_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_document_skins" ADD CONSTRAINT "tenant_document_skins_commercialSettingsId_fkey" FOREIGN KEY ("commercialSettingsId") REFERENCES "commercial_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_text_snippets" ADD CONSTRAINT "document_text_snippets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_text_snippets" ADD CONSTRAINT "document_text_snippets_commercialSettingsId_fkey" FOREIGN KEY ("commercialSettingsId") REFERENCES "commercial_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_distribution_recipients" ADD CONSTRAINT "service_order_distribution_recipients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_distribution_recipients" ADD CONSTRAINT "service_order_distribution_recipients_commercialSettingsId_fkey" FOREIGN KEY ("commercialSettingsId") REFERENCES "commercial_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
