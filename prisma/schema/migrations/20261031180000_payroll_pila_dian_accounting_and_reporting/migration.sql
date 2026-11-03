-- CreateEnum
CREATE TYPE "PilaBatchStatus" AS ENUM ('DRAFT', 'VALIDATED', 'EXPORTED', 'PAID_FILED');

-- CreateEnum
CREATE TYPE "DianProviderMode" AS ENUM ('INTERNAL_DIAN_STANDARD', 'DATAICO', 'THE_FACTORY_HKA');

-- CreateEnum
CREATE TYPE "DianEnvironmentType" AS ENUM ('HABILITACION_2', 'PRODUCCION_1');

-- CreateEnum
CREATE TYPE "ElectronicPayrollStatus" AS ENUM ('DRAFT', 'VALIDATED', 'TRANSMITTED_ACCEPTED', 'REJECTED', 'REPLACED_BY_NOTE');

-- CreateEnum
CREATE TYPE "ElectronicDocumentType" AS ENUM ('INDIVIDUAL_PAYROLL', 'ADJUSTMENT_NOTE_REPLACE', 'ADJUSTMENT_NOTE_DELETE');

-- CreateEnum
CREATE TYPE "AccountingExportFormat" AS ENUM ('WORLD_OFFICE', 'HELISA');

-- AlterTable
ALTER TABLE "payroll_settings" ADD COLUMN     "defaultAccountingFormat" "AccountingExportFormat" NOT NULL DEFAULT 'WORLD_OFFICE',
ADD COLUMN     "defaultDianProviderMode" "DianProviderMode" NOT NULL DEFAULT 'INTERNAL_DIAN_STANDARD',
ADD COLUMN     "dianAdjustmentPrefix" VARCHAR(10) NOT NULL DEFAULT 'NA',
ADD COLUMN     "dianApiToken" VARCHAR(255),
ADD COLUMN     "dianEnvironment" "DianEnvironmentType" NOT NULL DEFAULT 'HABILITACION_2',
ADD COLUMN     "dianNextConsecutive" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "dianPrefix" VARCHAR(10) NOT NULL DEFAULT 'NE',
ADD COLUMN     "dianSoftwareId" VARCHAR(120),
ADD COLUMN     "dianSoftwarePin" VARCHAR(30);

-- CreateTable
CREATE TABLE "payroll_pila_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "branchId" TEXT,
    "status" "PilaBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "operatorName" VARCHAR(50) NOT NULL DEFAULT 'SOI',
    "payrollType" VARCHAR(5) NOT NULL DEFAULT 'E',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "totalIbcHealth" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalIbcPension" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalIbcArl" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalIbcCcf" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalHealthEmployee" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalHealthEmployer" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalPensionEmployee" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalPensionEmployer" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalFsp" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalArl" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalCcf" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalSena" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalIcbf" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalExoneratedLaw1607" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "grandTotalAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "fileNameTxt" VARCHAR(180),
    "fileNameCsv" VARCHAR(180),
    "paymentReferencePila" VARCHAR(50),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_pila_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_pila_record_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "lineType" INTEGER NOT NULL DEFAULT 2,
    "documentType" VARCHAR(5) NOT NULL DEFAULT 'CC',
    "documentNumber" VARCHAR(30) NOT NULL,
    "contributorType" VARCHAR(5) NOT NULL DEFAULT '01',
    "contributorSubtype" VARCHAR(5) NOT NULL DEFAULT '00',
    "daneDepartmentCode" VARCHAR(10) NOT NULL DEFAULT '11',
    "daneCityCode" VARCHAR(10) NOT NULL DEFAULT '11001',
    "firstLastName" VARCHAR(80) NOT NULL,
    "secondLastName" VARCHAR(80),
    "firstName" VARCHAR(80) NOT NULL,
    "secondName" VARCHAR(80),
    "isIng" BOOLEAN NOT NULL DEFAULT false,
    "isRet" BOOLEAN NOT NULL DEFAULT false,
    "isTde" BOOLEAN NOT NULL DEFAULT false,
    "isTae" BOOLEAN NOT NULL DEFAULT false,
    "isTdp" BOOLEAN NOT NULL DEFAULT false,
    "isTap" BOOLEAN NOT NULL DEFAULT false,
    "isVsp" BOOLEAN NOT NULL DEFAULT false,
    "isCor" BOOLEAN NOT NULL DEFAULT false,
    "isVst" BOOLEAN NOT NULL DEFAULT false,
    "isSln" BOOLEAN NOT NULL DEFAULT false,
    "isIge" BOOLEAN NOT NULL DEFAULT false,
    "isLma" BOOLEAN NOT NULL DEFAULT false,
    "isVacLr" BOOLEAN NOT NULL DEFAULT false,
    "isAvp" BOOLEAN NOT NULL DEFAULT false,
    "isVct" BOOLEAN NOT NULL DEFAULT false,
    "isIrl" BOOLEAN NOT NULL DEFAULT false,
    "ingDate" DATE,
    "retDate" DATE,
    "vspDate" DATE,
    "slnStartDate" DATE,
    "slnEndDate" DATE,
    "igeStartDate" DATE,
    "igeEndDate" DATE,
    "lmaStartDate" DATE,
    "lmaEndDate" DATE,
    "vacStartDate" DATE,
    "vacEndDate" DATE,
    "irlStartDate" DATE,
    "irlEndDate" DATE,
    "epsCodePlu" VARCHAR(20),
    "afpCodePlu" VARCHAR(20),
    "ccfCodePlu" VARCHAR(20),
    "arlRiskClass" "ArlRiskClass" NOT NULL DEFAULT 'RISK_IV',
    "arlRatePct" DECIMAL(6,4) NOT NULL DEFAULT 4.350,
    "workedDaysPension" INTEGER NOT NULL DEFAULT 30,
    "workedDaysHealth" INTEGER NOT NULL DEFAULT 30,
    "workedDaysArl" INTEGER NOT NULL DEFAULT 30,
    "workedDaysCcf" INTEGER NOT NULL DEFAULT 30,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "isIntegralSalary" BOOLEAN NOT NULL DEFAULT false,
    "ibcPension" DECIMAL(14,2) NOT NULL,
    "ibcHealth" DECIMAL(14,2) NOT NULL,
    "ibcArl" DECIMAL(14,2) NOT NULL,
    "ibcCcf" DECIMAL(14,2) NOT NULL,
    "pensionEmployeeRate" DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    "pensionEmployerRate" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "pensionTotalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "fspRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "fspAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "healthEmployeeRate" DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    "healthEmployerRate" DECIMAL(5,2) NOT NULL DEFAULT 8.50,
    "healthTotalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "arlAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ccfRate" DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    "ccfAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "senaAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "icbfAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "isExoneratedLaw1607" BOOLEAN NOT NULL DEFAULT true,
    "totalLineAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "rawPositionalRecord" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_pila_record_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_electronic_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "providerMode" "DianProviderMode" NOT NULL DEFAULT 'INTERNAL_DIAN_STANDARD',
    "environment" "DianEnvironmentType" NOT NULL DEFAULT 'HABILITACION_2',
    "prefix" VARCHAR(10) NOT NULL DEFAULT 'NE',
    "status" "ElectronicPayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "validatedDocuments" INTEGER NOT NULL DEFAULT 0,
    "acceptedDocuments" INTEGER NOT NULL DEFAULT 0,
    "rejectedDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalAccrued" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalDeductions" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "netAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "transmissionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_electronic_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_electronic_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "consecutive" INTEGER NOT NULL,
    "documentNumber" VARCHAR(40) NOT NULL,
    "documentType" "ElectronicDocumentType" NOT NULL DEFAULT 'INDIVIDUAL_PAYROLL',
    "providerMode" "DianProviderMode" NOT NULL DEFAULT 'INTERNAL_DIAN_STANDARD',
    "status" "ElectronicPayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "cune" VARCHAR(128),
    "qrUrl" VARCHAR(500),
    "issueDate" DATE NOT NULL,
    "workedDays" INTEGER NOT NULL DEFAULT 30,
    "totalAccrued" DECIMAL(14,2) NOT NULL,
    "totalDeductions" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "nieBreakdownJson" JSONB,
    "xmlContent" TEXT,
    "providerPayloadJson" JSONB,
    "rejectionErrorsJson" JSONB,
    "predecessorDocId" TEXT,
    "predecessorCune" VARCHAR(128),
    "predecessorIssueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_electronic_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_accounting_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "exportFormat" "AccountingExportFormat" NOT NULL DEFAULT 'WORLD_OFFICE',
    "batchNumber" VARCHAR(50) NOT NULL,
    "accountingDate" DATE NOT NULL,
    "totalDebit" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalCredit" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "isBalanced" BOOLEAN NOT NULL DEFAULT true,
    "fileName" VARCHAR(180),
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_accounting_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_accounting_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "pucAccount" VARCHAR(30) NOT NULL,
    "accountName" VARCHAR(150) NOT NULL,
    "thirdPartyNit" VARCHAR(30) NOT NULL,
    "thirdPartyName" VARCHAR(150) NOT NULL,
    "costCenterCode" VARCHAR(40),
    "costCenterName" VARCHAR(150),
    "dependencyCode" INTEGER,
    "conceptCode" INTEGER,
    "debitAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "creditAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "description" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_accounting_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_tax_certificates_220" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "issueDate" DATE NOT NULL,
    "certifiedFromDate" DATE NOT NULL,
    "certifiedToDate" DATE NOT NULL,
    "expeditionCity" VARCHAR(100) NOT NULL DEFAULT 'BOGOT├ü D.C.',
    "retentionAgentNit" VARCHAR(30) NOT NULL,
    "retentionAgentName" VARCHAR(180) NOT NULL,
    "employeeDocument" VARCHAR(30) NOT NULL,
    "employeeFullName" VARCHAR(180) NOT NULL,
    "row36Salaries" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row37Honoraries" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row38SocialBenefits" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row39AllowancesNonSalarial" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row40OtherIncome" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row41Indemnifications" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row46SeverancePaid" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row47PensionsIncome" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row49TotalGrossIncome" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row50HealthDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row51PensionAndFspDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row52VoluntaryPensionDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row53AfcDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "row55WithholdingTax" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "qrCodeData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_tax_certificates_220_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_pila_batches_tenantId_periodId_status_idx" ON "payroll_pila_batches"("tenantId", "periodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_pila_batches_tenantId_periodId_branchId_key" ON "payroll_pila_batches"("tenantId", "periodId", "branchId");

-- CreateIndex
CREATE INDEX "payroll_pila_record_lines_tenantId_batchId_idx" ON "payroll_pila_record_lines"("tenantId", "batchId");

-- CreateIndex
CREATE INDEX "payroll_pila_record_lines_tenantId_employeeId_idx" ON "payroll_pila_record_lines"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_electronic_batches_tenantId_year_month_status_idx" ON "payroll_electronic_batches"("tenantId", "year", "month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_electronic_batches_tenantId_periodId_providerMode_key" ON "payroll_electronic_batches"("tenantId", "periodId", "providerMode");

-- CreateIndex
CREATE INDEX "payroll_electronic_documents_tenantId_batchId_status_idx" ON "payroll_electronic_documents"("tenantId", "batchId", "status");

-- CreateIndex
CREATE INDEX "payroll_electronic_documents_tenantId_employeeId_idx" ON "payroll_electronic_documents"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_electronic_documents_tenantId_cune_idx" ON "payroll_electronic_documents"("tenantId", "cune");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_electronic_documents_tenantId_documentNumber_key" ON "payroll_electronic_documents"("tenantId", "documentNumber");

-- CreateIndex
CREATE INDEX "payroll_accounting_batches_tenantId_periodId_idx" ON "payroll_accounting_batches"("tenantId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_accounting_batches_tenantId_periodId_exportFormat_key" ON "payroll_accounting_batches"("tenantId", "periodId", "exportFormat");

-- CreateIndex
CREATE INDEX "payroll_accounting_lines_tenantId_batchId_idx" ON "payroll_accounting_lines"("tenantId", "batchId");

-- CreateIndex
CREATE INDEX "payroll_accounting_lines_tenantId_pucAccount_idx" ON "payroll_accounting_lines"("tenantId", "pucAccount");

-- CreateIndex
CREATE INDEX "payroll_tax_certificates_220_tenantId_year_idx" ON "payroll_tax_certificates_220"("tenantId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_tax_certificates_220_tenantId_employeeId_year_key" ON "payroll_tax_certificates_220"("tenantId", "employeeId", "year");

-- AddForeignKey
ALTER TABLE "payroll_pila_batches" ADD CONSTRAINT "payroll_pila_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_pila_batches" ADD CONSTRAINT "payroll_pila_batches_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_pila_batches" ADD CONSTRAINT "payroll_pila_batches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "payroll_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_pila_record_lines" ADD CONSTRAINT "payroll_pila_record_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_pila_record_lines" ADD CONSTRAINT "payroll_pila_record_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payroll_pila_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_pila_record_lines" ADD CONSTRAINT "payroll_pila_record_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_electronic_batches" ADD CONSTRAINT "payroll_electronic_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_electronic_batches" ADD CONSTRAINT "payroll_electronic_batches_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_electronic_documents" ADD CONSTRAINT "payroll_electronic_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_electronic_documents" ADD CONSTRAINT "payroll_electronic_documents_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payroll_electronic_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_electronic_documents" ADD CONSTRAINT "payroll_electronic_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_accounting_batches" ADD CONSTRAINT "payroll_accounting_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_accounting_batches" ADD CONSTRAINT "payroll_accounting_batches_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_accounting_lines" ADD CONSTRAINT "payroll_accounting_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_accounting_lines" ADD CONSTRAINT "payroll_accounting_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payroll_accounting_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_tax_certificates_220" ADD CONSTRAINT "payroll_tax_certificates_220_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_tax_certificates_220" ADD CONSTRAINT "payroll_tax_certificates_220_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "payroll_bank_disbursement_batches_tenantId_advanceSettlement_id" RENAME TO "payroll_bank_disbursement_batches_tenantId_advanceSettlemen_idx";

