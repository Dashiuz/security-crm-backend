-- AlterEnum
ALTER TYPE "EmployeeSalaryMode" ADD VALUE IF NOT EXISTS 'MINIMUM_WAGE';

-- CreateEnum
CREATE TYPE "SalaryAdjustmentOrigin" AS ENUM ('INITIAL_CONTRACT', 'INDIVIDUAL_INCREASE', 'SMMLV_GLOBAL_UPDATE');

-- CreateEnum
CREATE TYPE "PayrollSettlementStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'ANNULLED');

-- CreateEnum
CREATE TYPE "PayrollLineOrigin" AS ENUM ('DEPENDENCY_SPAN', 'MODALITY_GUARANTEED', 'SHIFT_SCHEDULE', 'REINFORCEMENT', 'TRANSPORT_ALLOWANCE', 'SEVENTH_DAY_DEDUCTION', 'LEAVE_OR_INCAPACITY', 'PERMANENT_CONCEPT', 'PERIOD_NOVELTY', 'LOAN_INSTALLMENT', 'FORTNIGHT_ADVANCE', 'SOCIAL_SECURITY', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "PayslipDeliveryStatus" AS ENUM ('NOT_SENT', 'SENT', 'FAILED', 'NO_EMAIL');

-- CreateEnum
CREATE TYPE "PayrollDisbursementType" AS ENUM ('PAYROLL_PERIOD', 'FORTNIGHT_ADVANCE');

-- CreateTable
CREATE TABLE "employee_salary_histories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "salaryMode" "EmployeeSalaryMode" NOT NULL DEFAULT 'CUSTOM_FIXED',
    "previousSalary" DECIMAL(14,2) NOT NULL,
    "newSalary" DECIMAL(14,2) NOT NULL,
    "variationPct" DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    "effectiveDate" DATE NOT NULL,
    "origin" "SalaryAdjustmentOrigin" NOT NULL DEFAULT 'INDIVIDUAL_INCREASE',
    "reason" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_salary_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_advance_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "cutoffDate" DATE NOT NULL,
    "paymentDate" DATE,
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_advance_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_advance_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "advanceSettlementId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dependencyId" TEXT,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "advancePctApplied" DECIMAL(5,4) NOT NULL DEFAULT 0.4000,
    "workedDaysFirstFortnight" INTEGER NOT NULL DEFAULT 15,
    "absenceDaysDeducted" INTEGER NOT NULL DEFAULT 0,
    "calculatedAmount" DECIMAL(14,2) NOT NULL,
    "approvedAmount" DECIMAL(14,2) NOT NULL,
    "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeductedInPayroll" BOOLEAN NOT NULL DEFAULT false,
    "bankId" TEXT,
    "bankAccountType" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "bankAccountNumber" VARCHAR(50),
    "hasBankWarning" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_advance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_period_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "primaryDependencyId" TEXT,
    "branchId" TEXT,
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "salaryModeSnapshot" "EmployeeSalaryMode" NOT NULL DEFAULT 'BY_DEPENDENCY',
    "baseSalaryMonthly" DECIMAL(14,2) NOT NULL DEFAULT 1750905.00,
    "workedDays" INTEGER NOT NULL DEFAULT 30,
    "paidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "incapacityDays" INTEGER NOT NULL DEFAULT 0,
    "vacationDays" INTEGER NOT NULL DEFAULT 0,
    "unpaidAbsenceDays" INTEGER NOT NULL DEFAULT 0,
    "seventhDaysLost" INTEGER NOT NULL DEFAULT 0,
    "basicSalaryEarned" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "transportAllowanceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "overtimeAndSurchargesAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "leavesAndIncapacitiesAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "bonusesNonSalarialAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherEarningsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalEarnings" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ugppTotalRemuneration" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ugppLimit40Pct" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ugppNonSalarialTotal" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ugppExcessAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ibcEps" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ibcAfp" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ibcArl" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "ibcCcf" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "healthEmployeeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pensionEmployeeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "fspAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "withholdingTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "loansDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "advanceDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherDeductionsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalDeductions" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "netPayAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "isExoneratedLaw1607" BOOLEAN NOT NULL DEFAULT true,
    "employerHealthAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "employerPensionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "employerArlAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "employerCcfAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "employerSenaAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "employerIcbfAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalEmployerCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "bankId" TEXT,
    "bankAccountType" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "bankAccountNumber" VARCHAR(50),
    "hasBankWarning" BOOLEAN NOT NULL DEFAULT false,
    "payslipEmailStatus" "PayslipDeliveryStatus" NOT NULL DEFAULT 'NOT_SENT',
    "payslipSentAt" TIMESTAMP(3),
    "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_period_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_settlement_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "dependencyId" TEXT,
    "nature" "PayrollConceptNature" NOT NULL,
    "origin" "PayrollLineOrigin" NOT NULL DEFAULT 'DEPENDENCY_SPAN',
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "unitValue" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalValue" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "isConstitutiveOfSalary" BOOLEAN NOT NULL DEFAULT true,
    "isDeletable" BOOLEAN NOT NULL DEFAULT true,
    "inIbcEpsAfp" BOOLEAN NOT NULL DEFAULT false,
    "inIbcArl" BOOLEAN NOT NULL DEFAULT false,
    "inIbcCcf" BOOLEAN NOT NULL DEFAULT false,
    "inUgpp40Pct" BOOLEAN NOT NULL DEFAULT false,
    "loanId" TEXT,
    "leaveId" TEXT,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_settlement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_bank_disbursement_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disbursementType" "PayrollDisbursementType" NOT NULL DEFAULT 'PAYROLL_PERIOD',
    "periodId" TEXT,
    "advanceSettlementId" TEXT,
    "bankId" TEXT,
    "exportFormat" VARCHAR(40) NOT NULL DEFAULT 'STANDARD_ACH',
    "fileName" VARCHAR(180) NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "skippedMissingAccountCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_bank_disbursement_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_salary_histories_tenantId_employeeId_effectiveDate_idx" ON "employee_salary_histories"("tenantId", "employeeId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_advance_settlements_tenantId_year_month_key" ON "payroll_advance_settlements"("tenantId", "year", "month");

-- CreateIndex
CREATE INDEX "payroll_advance_settlements_tenantId_status_idx" ON "payroll_advance_settlements"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_advance_items_advanceSettlementId_employeeId_key" ON "payroll_advance_items"("advanceSettlementId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_advance_items_tenantId_employeeId_idx" ON "payroll_advance_items"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_period_settlements_tenantId_periodId_employeeId_key" ON "payroll_period_settlements"("tenantId", "periodId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_period_settlements_tenantId_periodId_status_idx" ON "payroll_period_settlements"("tenantId", "periodId", "status");

-- CreateIndex
CREATE INDEX "payroll_period_settlements_tenantId_employeeId_idx" ON "payroll_period_settlements"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_settlement_lines_tenantId_settlementId_idx" ON "payroll_settlement_lines"("tenantId", "settlementId");

-- CreateIndex
CREATE INDEX "payroll_settlement_lines_tenantId_periodId_dependencyId_idx" ON "payroll_settlement_lines"("tenantId", "periodId", "dependencyId");

-- CreateIndex
CREATE INDEX "payroll_settlement_lines_tenantId_employeeId_idx" ON "payroll_settlement_lines"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_bank_disbursement_batches_tenantId_periodId_idx" ON "payroll_bank_disbursement_batches"("tenantId", "periodId");

-- CreateIndex
CREATE INDEX "payroll_bank_disbursement_batches_tenantId_advanceSettlement_idx" ON "payroll_bank_disbursement_batches"("tenantId", "advanceSettlementId");

-- AddForeignKey
ALTER TABLE "employee_salary_histories" ADD CONSTRAINT "employee_salary_histories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_histories" ADD CONSTRAINT "employee_salary_histories_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_advance_settlements" ADD CONSTRAINT "payroll_advance_settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_advance_items" ADD CONSTRAINT "payroll_advance_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_advance_items" ADD CONSTRAINT "payroll_advance_items_advanceSettlementId_fkey" FOREIGN KEY ("advanceSettlementId") REFERENCES "payroll_advance_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_advance_items" ADD CONSTRAINT "payroll_advance_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_advance_items" ADD CONSTRAINT "payroll_advance_items_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_advance_items" ADD CONSTRAINT "payroll_advance_items_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_settlements" ADD CONSTRAINT "payroll_period_settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_settlements" ADD CONSTRAINT "payroll_period_settlements_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_settlements" ADD CONSTRAINT "payroll_period_settlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_settlements" ADD CONSTRAINT "payroll_period_settlements_primaryDependencyId_fkey" FOREIGN KEY ("primaryDependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_settlements" ADD CONSTRAINT "payroll_period_settlements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "payroll_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_settlements" ADD CONSTRAINT "payroll_period_settlements_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "payroll_period_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "payroll_loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settlement_lines" ADD CONSTRAINT "payroll_settlement_lines_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "payroll_leaves_and_absences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_advanceSettlementId_fkey" FOREIGN KEY ("advanceSettlementId") REFERENCES "payroll_advance_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

