-- AlterEnum
ALTER TYPE "NoveltyOriginType" ADD VALUE IF NOT EXISTS 'BENEFITS_ENGINE';

-- AlterEnum
ALTER TYPE "PayrollDisbursementType" ADD VALUE IF NOT EXISTS 'SOCIAL_BENEFITS';
ALTER TYPE "PayrollDisbursementType" ADD VALUE IF NOT EXISTS 'VACATION_SETTLEMENT';
ALTER TYPE "PayrollDisbursementType" ADD VALUE IF NOT EXISTS 'FINAL_LIQUIDATION';

-- CreateEnum
CREATE TYPE "VacationSettlementType" AS ENUM ('ENJOYED_IN_TIME', 'COMPENSATED_IN_CASH');

-- CreateEnum
CREATE TYPE "SocialBenefitType" AS ENUM ('PRIMA_FIRST_SEMESTER', 'PRIMA_SECOND_SEMESTER', 'SEVERANCE_ANNUAL', 'SEVERANCE_INTERESTS');

-- AlterTable payroll_settlement_lines
ALTER TABLE "payroll_settlement_lines"
  ADD COLUMN IF NOT EXISTS "inPri" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "inCes" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "inVac" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "inLiq" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable payroll_bank_disbursement_batches
ALTER TABLE "payroll_bank_disbursement_batches"
  ADD COLUMN IF NOT EXISTS "socialBenefitBatchId" TEXT,
  ADD COLUMN IF NOT EXISTS "finalSettlementId" TEXT;

-- CreateTable payroll_vacation_settlements
CREATE TABLE "payroll_vacation_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "vacationType" "VacationSettlementType" NOT NULL DEFAULT 'ENJOYED_IN_TIME',
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "accrualStartDate" DATE NOT NULL,
    "accrualEndDate" DATE NOT NULL,
    "enjoymentStartDate" DATE NOT NULL,
    "enjoymentEndDate" DATE NOT NULL,
    "returnDate" DATE NOT NULL,
    "businessDays" DECIMAL(6,2) NOT NULL DEFAULT 15.00,
    "nonWorkingDaysIncluded" INTEGER NOT NULL DEFAULT 3,
    "calendarDaysPaid" INTEGER NOT NULL DEFAULT 18,
    "saturdayWasWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "currentBasicSalary" DECIMAL(14,2) NOT NULL,
    "averageVariableVacBase" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalVacationBase" DECIMAL(14,2) NOT NULL,
    "dailyVacationRate" DECIMAL(14,2) NOT NULL,
    "grossVacationAmount" DECIMAL(14,2) NOT NULL,
    "healthDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pensionDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "loansDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "netPayAmount" DECIMAL(14,2) NOT NULL,
    "linkedLeaveId" TEXT,
    "injectedNoveltyId" TEXT,
    "isInjectedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_vacation_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable payroll_social_benefit_batches
CREATE TABLE "payroll_social_benefit_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "benefitType" "SocialBenefitType" NOT NULL,
    "year" INTEGER NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "periodStartDate" DATE NOT NULL,
    "cutoffDate" DATE NOT NULL,
    "projectionEndDate" DATE NOT NULL,
    "paymentDate" DATE,
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalBenefitAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalInterestAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_social_benefit_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable payroll_social_benefit_items
CREATE TABLE "payroll_social_benefit_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dependencyId" TEXT,
    "cesantiasEntityId" TEXT,
    "hireDateSnapshot" DATE NOT NULL,
    "grossDaysInPeriod" INTEGER NOT NULL DEFAULT 180,
    "unpaidLeaveDaysDeducted" INTEGER NOT NULL DEFAULT 0,
    "projectedDaysAdded" INTEGER NOT NULL DEFAULT 0,
    "netDaysWorked" INTEGER NOT NULL DEFAULT 180,
    "basicSalaryMonthly" DECIMAL(14,2) NOT NULL,
    "averageVariableEarnings" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "transportAllowanceBase" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalComputationBase" DECIMAL(14,2) NOT NULL,
    "calculatedBenefitAmount" DECIMAL(14,2) NOT NULL,
    "approvedBenefitAmount" DECIMAL(14,2) NOT NULL,
    "interestRatePct" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "calculatedInterestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "approvedInterestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "bankId" TEXT,
    "bankAccountType" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "bankAccountNumber" VARCHAR(50),
    "hasBankWarning" BOOLEAN NOT NULL DEFAULT false,
    "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "isInjectedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "injectedPeriodId" TEXT,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_social_benefit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable payroll_final_contract_settlements
CREATE TABLE "payroll_final_contract_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "exitReasonId" TEXT NOT NULL,
    "primaryDependencyId" TEXT,
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "contractTypeSnapshot" "EmploymentContractType" NOT NULL DEFAULT 'FIXED_TERM',
    "hireDate" DATE NOT NULL,
    "retirementDate" DATE NOT NULL,
    "contractEndDateSnapshot" DATE,
    "paymentDate" DATE,
    "totalContractDays360" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveDaysTotal" INTEGER NOT NULL DEFAULT 0,
    "netServiceDaysTotal" INTEGER NOT NULL DEFAULT 0,
    "lastBasicSalary" DECIMAL(14,2) NOT NULL,
    "transportAllowanceApplicable" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "cesantiasAverageBase" DECIMAL(14,2) NOT NULL,
    "primaAverageBase" DECIMAL(14,2) NOT NULL,
    "vacationAverageBase" DECIMAL(14,2) NOT NULL,
    "cesantiasPendingDays" INTEGER NOT NULL DEFAULT 0,
    "cesantiasAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "interestsCesantiasAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "primaPendingDays" INTEGER NOT NULL DEFAULT 0,
    "primaAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "vacationTotalAccruedDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "vacationEnjoyedDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "vacationPendingBusinessDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "vacationAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "includePendingPayroll" BOOLEAN NOT NULL DEFAULT true,
    "pendingPayrollDays" INTEGER NOT NULL DEFAULT 0,
    "pendingBasicSalaryAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingTransportAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingOvertimeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingHealthDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingPensionDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "applyIndemnification" BOOLEAN NOT NULL DEFAULT false,
    "indemnificationDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "indemnificationAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherEarningsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherEarningsConcept" VARCHAR(180),
    "loansDeductedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherDeductionsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherDeductionsConcept" VARCHAR(180),
    "totalBenefitsAndEarnings" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalDeductions" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "netPayAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "blockForRehireBdn" BOOLEAN NOT NULL DEFAULT false,
    "bankId" TEXT,
    "bankAccountType" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "bankAccountNumber" VARCHAR(50),
    "hasBankWarning" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_final_contract_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_vacation_settlements_tenantId_employeeId_idx" ON "payroll_vacation_settlements"("tenantId", "employeeId");
CREATE INDEX "payroll_vacation_settlements_tenantId_status_idx" ON "payroll_vacation_settlements"("tenantId", "status");
CREATE UNIQUE INDEX "payroll_social_benefit_batches_tenantId_benefitType_year_key" ON "payroll_social_benefit_batches"("tenantId", "benefitType", "year");
CREATE INDEX "payroll_social_benefit_batches_tenantId_year_status_idx" ON "payroll_social_benefit_batches"("tenantId", "year", "status");
CREATE UNIQUE INDEX "payroll_social_benefit_items_batchId_employeeId_key" ON "payroll_social_benefit_items"("batchId", "employeeId");
CREATE INDEX "payroll_social_benefit_items_tenantId_employeeId_idx" ON "payroll_social_benefit_items"("tenantId", "employeeId");
CREATE INDEX "payroll_social_benefit_items_tenantId_cesantiasEntityId_idx" ON "payroll_social_benefit_items"("tenantId", "cesantiasEntityId");
CREATE INDEX "payroll_final_contract_settlements_tenantId_employeeId_idx" ON "payroll_final_contract_settlements"("tenantId", "employeeId");
CREATE INDEX "payroll_final_contract_settlements_tenantId_status_idx" ON "payroll_final_contract_settlements"("tenantId", "status");
CREATE INDEX "payroll_final_contract_settlements_tenantId_retirementDate_idx" ON "payroll_final_contract_settlements"("tenantId", "retirementDate");

-- AddForeignKey
ALTER TABLE "payroll_vacation_settlements" ADD CONSTRAINT "payroll_vacation_settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_vacation_settlements" ADD CONSTRAINT "payroll_vacation_settlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_vacation_settlements" ADD CONSTRAINT "payroll_vacation_settlements_linkedLeaveId_fkey" FOREIGN KEY ("linkedLeaveId") REFERENCES "payroll_leaves_and_absences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_social_benefit_batches" ADD CONSTRAINT "payroll_social_benefit_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payroll_social_benefit_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_cesantiasEntityId_fkey" FOREIGN KEY ("cesantiasEntityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_exitReasonId_fkey" FOREIGN KEY ("exitReasonId") REFERENCES "payroll_exit_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_primaryDependencyId_fkey" FOREIGN KEY ("primaryDependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_socialBenefitBatchId_fkey" FOREIGN KEY ("socialBenefitBatchId") REFERENCES "payroll_social_benefit_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_finalSettlementId_fkey" FOREIGN KEY ("finalSettlementId") REFERENCES "payroll_final_contract_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

