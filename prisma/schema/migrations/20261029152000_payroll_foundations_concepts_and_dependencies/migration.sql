-- CreateEnum
CREATE TYPE "PayrollPaymentFrequency" AS ENUM ('MONTHLY_WITH_ADVANCE', 'BIWEEKLY_PURE', 'MONTHLY_PURE', 'WEEKLY');

-- CreateEnum
CREATE TYPE "PayrollAdvanceMode" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE_OF_BASE', 'PROPORTIONAL_DAYS');

-- CreateEnum
CREATE TYPE "PayrollConceptNature" AS ENUM ('DEVENGO', 'LICENCIA', 'INCAPACIDAD', 'DEDUCCION', 'SEG_SOCIAL', 'PROVISION');

-- CreateEnum
CREATE TYPE "PayrollProportionality" AS ENUM ('DAYS', 'NON_PROPORTIONAL', 'HOURS');

-- CreateEnum
CREATE TYPE "SocialSecurityEntityType" AS ENUM ('EPS', 'AFP', 'CCF', 'ARL');

-- CreateEnum
CREATE TYPE "ArlRiskClass" AS ENUM ('RISK_I', 'RISK_II', 'RISK_III', 'RISK_IV', 'RISK_V');

-- CreateEnum
CREATE TYPE "DependencySettlementType" AS ENUM ('BY_AVERAGE_GUARANTEED', 'BY_SCHEDULE', 'FIXED_ADMIN');

-- CreateEnum
CREATE TYPE "ShiftModalityClass" AS ENUM ('ROTATING', 'DAY_SHIFT', 'NIGHT_SHIFT', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateTable
CREATE TABLE "payroll_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyLegalName" VARCHAR(180) NOT NULL DEFAULT 'EMPRESA DE SEGURIDAD LTDA',
    "companyNit" VARCHAR(30) NOT NULL DEFAULT '900000000',
    "companyDv" VARCHAR(5) NOT NULL DEFAULT '1',
    "arlEntityCode" VARCHAR(30),
    "arlEntityName" VARCHAR(120),
    "daneEconomicActivityCode" VARCHAR(20) NOT NULL DEFAULT '8010',
    "daneCityCode" VARCHAR(15) NOT NULL DEFAULT '11001',
    "daneCityName" VARCHAR(100) NOT NULL DEFAULT 'BOGOTÁ D.C.',
    "daneDepartmentCode" VARCHAR(15) NOT NULL DEFAULT '11',
    "daneDepartmentName" VARCHAR(100) NOT NULL DEFAULT 'BOGOTÁ D.C.',
    "companyAddress" VARCHAR(200),
    "companyPhone" VARCHAR(50),
    "companyEmail" VARCHAR(150),
    "legalRepDocument" VARCHAR(30),
    "legalRepFullName" VARCHAR(150),
    "signatureName1" VARCHAR(150),
    "signatureRole1" VARCHAR(120),
    "signatureName2" VARCHAR(150),
    "signatureRole2" VARCHAR(120),
    "paymentFrequency" "PayrollPaymentFrequency" NOT NULL DEFAULT 'MONTHLY_WITH_ADVANCE',
    "advanceMode" "PayrollAdvanceMode" NOT NULL DEFAULT 'PERCENTAGE_OF_BASE',
    "defaultAdvancePct" DECIMAL(5,4) NOT NULL DEFAULT 0.40,
    "deductAbsencesInAdvance" BOOLEAN NOT NULL DEFAULT true,
    "saturdayIsWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "applyExonerationLaw1607" BOOLEAN NOT NULL DEFAULT true,
    "enforceUgpp40PctRule" BOOLEAN NOT NULL DEFAULT true,
    "scheduleLockDate" DATE,
    "activeYear" INTEGER NOT NULL DEFAULT 2026,
    "smmlv" DECIMAL(12,2) NOT NULL DEFAULT 1750905.00,
    "transportAllowance" DECIMAL(12,2) NOT NULL DEFAULT 249095.00,
    "uvtValue" DECIMAL(10,2) NOT NULL DEFAULT 49799.00,
    "weeklyWorkingHours" INTEGER NOT NULL DEFAULT 44,
    "monthlyDivisorHours" INTEGER NOT NULL DEFAULT 220,
    "transportTopSmmlvMultiple" INTEGER NOT NULL DEFAULT 2,
    "normalHourFactorPct" DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    "nightSurchargePct" DECIMAL(6,2) NOT NULL DEFAULT 35.00,
    "extraDayPct" DECIMAL(6,2) NOT NULL DEFAULT 125.00,
    "extraNightPct" DECIMAL(6,2) NOT NULL DEFAULT 175.00,
    "sundayCompensatedPct" DECIMAL(6,2) NOT NULL DEFAULT 80.00,
    "holidaySurchargePct" DECIMAL(6,2) NOT NULL DEFAULT 80.00,
    "extraHolidayDayPct" DECIMAL(6,2) NOT NULL DEFAULT 205.00,
    "extraHolidayNightPct" DECIMAL(6,2) NOT NULL DEFAULT 255.00,
    "employeeHealthPct" DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    "employeePensionPct" DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    "fspBasePct" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "employerHealthPct" DECIMAL(5,2) NOT NULL DEFAULT 8.50,
    "employerPensionPct" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "ccfPct" DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    "senaPct" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "icbfPct" DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_holidays" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isNational" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_concepts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nature" "PayrollConceptNature" NOT NULL DEFAULT 'DEVENGO',
    "proportionality" "PayrollProportionality" NOT NULL DEFAULT 'DAYS',
    "isDeletableOnLiquidation" BOOLEAN NOT NULL DEFAULT true,
    "isConstitutiveOfSalary" BOOLEAN NOT NULL DEFAULT true,
    "adminPucAccount" VARCHAR(30),
    "operativePucAccount" VARCHAR(30),
    "commercialPucAccount" VARCHAR(30),
    "creditCounterpartPuc" VARCHAR(30),
    "thirdPartyNit" VARCHAR(30),
    "thirdPartyName" VARCHAR(150),
    "dianNieCode" VARCHAR(20),
    "dianNieFieldName" VARCHAR(80),
    "inLiq" BOOLEAN NOT NULL DEFAULT false,
    "inPri" BOOLEAN NOT NULL DEFAULT false,
    "inTis" BOOLEAN NOT NULL DEFAULT false,
    "inVac" BOOLEAN NOT NULL DEFAULT false,
    "inCes" BOOLEAN NOT NULL DEFAULT false,
    "inIbcEpsAfp" BOOLEAN NOT NULL DEFAULT false,
    "inIbcArl" BOOLEAN NOT NULL DEFAULT false,
    "inIbcCcf" BOOLEAN NOT NULL DEFAULT false,
    "inLhex" BOOLEAN NOT NULL DEFAULT false,
    "inLnr" BOOLEAN NOT NULL DEFAULT false,
    "inUgpp40Pct" BOOLEAN NOT NULL DEFAULT false,
    "defaultRatePct" DECIMAL(6,2),
    "shiftCodeMap" VARCHAR(15),
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_entities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "entityType" "SocialSecurityEntityType" NOT NULL,
    "nit" VARCHAR(30) NOT NULL,
    "dv" VARCHAR(5),
    "pluCode" VARCHAR(20) NOT NULL,
    "legacyConceptCode" INTEGER,
    "fspCode" VARCHAR(20),
    "address" VARCHAR(180),
    "phone" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_banks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "achCode" VARCHAR(20),
    "exportFormat" VARCHAR(40) NOT NULL DEFAULT 'STANDARD_ACH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_exit_reasons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "isJustCause" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_exit_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_cie10_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "familyCode" VARCHAR(10),
    "name" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_cie10_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_hiring_requirements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "hasExpiry" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_hiring_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_svsp_levels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 365,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_svsp_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_security_academies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "nit" VARCHAR(30) NOT NULL,
    "address" VARCHAR(180),
    "phone" VARCHAR(60),
    "email" VARCHAR(150),
    "legalRepName" VARCHAR(150),
    "city" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_security_academies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_branches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "daneCityCode" VARCHAR(15),
    "pilaBranchCode" VARCHAR(20),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_shift_modalities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "shiftClass" "ShiftModalityClass" NOT NULL DEFAULT 'ROTATING',
    "hoursPerShift" INTEGER NOT NULL DEFAULT 12,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_shift_modalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_modality_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modalityId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "percentage" DECIMAL(6,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_modality_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_dependencies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT NOT NULL,
    "clientId" TEXT,
    "serviceOrderPositionId" TEXT,
    "omegaCode" VARCHAR(50),
    "accountingCostCenter" VARCHAR(40),
    "accountingSubCostCenter" VARCHAR(40),
    "monthlyPaidValue" DECIMAL(14,2) NOT NULL DEFAULT 1750905.00,
    "prestacionalAmount" DECIMAL(14,2) NOT NULL DEFAULT 1750905.00,
    "dailyValue" DECIMAL(12,2) NOT NULL DEFAULT 58363.50,
    "settlementType" "DependencySettlementType" NOT NULL DEFAULT 'BY_AVERAGE_GUARANTEED',
    "modalityId" TEXT,
    "arlRiskClass" "ArlRiskClass" NOT NULL DEFAULT 'RISK_IV',
    "cotizanteTypeCode" VARCHAR(10) NOT NULL DEFAULT '01',
    "isVariable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "paymentDate" DATE,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_settings_tenantId_key" ON "payroll_settings"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_settings_tenantId_idx" ON "payroll_settings"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_holidays_tenantId_year_idx" ON "payroll_holidays"("tenantId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_holidays_tenantId_date_key" ON "payroll_holidays"("tenantId", "date");

-- CreateIndex
CREATE INDEX "payroll_concepts_tenantId_nature_isActive_idx" ON "payroll_concepts"("tenantId", "nature", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_concepts_tenantId_code_key" ON "payroll_concepts"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_entities_tenantId_entityType_isActive_idx" ON "payroll_entities"("tenantId", "entityType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entities_tenantId_code_key" ON "payroll_entities"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_banks_tenantId_isActive_idx" ON "payroll_banks"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_banks_tenantId_code_key" ON "payroll_banks"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_exit_reasons_tenantId_isActive_idx" ON "payroll_exit_reasons"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_exit_reasons_tenantId_code_key" ON "payroll_exit_reasons"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_cie10_codes_tenantId_code_idx" ON "payroll_cie10_codes"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_cie10_codes_tenantId_code_key" ON "payroll_cie10_codes"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_hiring_requirements_tenantId_isActive_idx" ON "payroll_hiring_requirements"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_hiring_requirements_tenantId_code_key" ON "payroll_hiring_requirements"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_svsp_levels_tenantId_isActive_idx" ON "payroll_svsp_levels"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_svsp_levels_tenantId_code_key" ON "payroll_svsp_levels"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_security_academies_tenantId_isActive_idx" ON "payroll_security_academies"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_security_academies_tenantId_code_key" ON "payroll_security_academies"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_branches_tenantId_isActive_idx" ON "payroll_branches"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_branches_tenantId_code_key" ON "payroll_branches"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_shift_modalities_tenantId_isActive_idx" ON "payroll_shift_modalities"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_shift_modalities_tenantId_code_key" ON "payroll_shift_modalities"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_modality_items_tenantId_modalityId_idx" ON "payroll_modality_items"("tenantId", "modalityId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_modality_items_modalityId_conceptId_key" ON "payroll_modality_items"("modalityId", "conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_dependencies_serviceOrderPositionId_key" ON "payroll_dependencies"("serviceOrderPositionId");

-- CreateIndex
CREATE INDEX "payroll_dependencies_tenantId_clientId_idx" ON "payroll_dependencies"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "payroll_dependencies_tenantId_branchId_idx" ON "payroll_dependencies"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "payroll_dependencies_tenantId_isActive_idx" ON "payroll_dependencies"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_dependencies_tenantId_code_key" ON "payroll_dependencies"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_periods_tenantId_year_month_idx" ON "payroll_periods"("tenantId", "year", "month");

-- CreateIndex
CREATE INDEX "payroll_periods_tenantId_status_idx" ON "payroll_periods"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_tenantId_code_key" ON "payroll_periods"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_tenantId_startDate_endDate_periodNumber_key" ON "payroll_periods"("tenantId", "startDate", "endDate", "periodNumber");

-- AddForeignKey
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_holidays" ADD CONSTRAINT "payroll_holidays_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_concepts" ADD CONSTRAINT "payroll_concepts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entities" ADD CONSTRAINT "payroll_entities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_banks" ADD CONSTRAINT "payroll_banks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_exit_reasons" ADD CONSTRAINT "payroll_exit_reasons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_cie10_codes" ADD CONSTRAINT "payroll_cie10_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_hiring_requirements" ADD CONSTRAINT "payroll_hiring_requirements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_svsp_levels" ADD CONSTRAINT "payroll_svsp_levels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_security_academies" ADD CONSTRAINT "payroll_security_academies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_branches" ADD CONSTRAINT "payroll_branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_shift_modalities" ADD CONSTRAINT "payroll_shift_modalities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_modality_items" ADD CONSTRAINT "payroll_modality_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_modality_items" ADD CONSTRAINT "payroll_modality_items_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "payroll_shift_modalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_modality_items" ADD CONSTRAINT "payroll_modality_items_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_dependencies" ADD CONSTRAINT "payroll_dependencies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_dependencies" ADD CONSTRAINT "payroll_dependencies_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "payroll_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_dependencies" ADD CONSTRAINT "payroll_dependencies_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_dependencies" ADD CONSTRAINT "payroll_dependencies_serviceOrderPositionId_fkey" FOREIGN KEY ("serviceOrderPositionId") REFERENCES "service_order_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_dependencies" ADD CONSTRAINT "payroll_dependencies_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "payroll_shift_modalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

