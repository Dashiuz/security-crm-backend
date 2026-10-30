-- CreateEnum
CREATE TYPE "LeaveAndAbsenceType" AS ENUM ('SICK_LEAVE_EG', 'WORK_ACCIDENT_AT', 'MATERNITY_PATERNITY_LMA', 'PAID_LEAVE_LR', 'UNPAID_LEAVE_LNR', 'DISCIPLINARY_SUSPENSION_SAN', 'UNJUSTIFIED_ABSENCE_AUS', 'VACATION_TIME_VAC');

-- CreateEnum
CREATE TYPE "EpsClaimStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_FILING', 'FILED_IN_AUDIT', 'APPROVED_PENDING_PAYMENT', 'PAID_RECOVERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollLoanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'PAID_OFF', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoveltyPeriodicityRule" AS ENUM ('FIRST_FORTNIGHT', 'SECOND_FORTNIGHT', 'ALL_PERIODS');

-- CreateEnum
CREATE TYPE "PermanentConceptScope" AS ENUM ('BY_EMPLOYEE', 'BY_DEPENDENCY');

-- CreateEnum
CREATE TYPE "NoveltyOriginType" AS ENUM ('MANUAL', 'CSV_IMPORT', 'SHIFT_ENGINE', 'LEAVE_ENGINE', 'LOAN_ENGINE');

-- CreateEnum
CREATE TYPE "DependencyAssignmentRole" AS ENUM ('TITULAR', 'RELEVANTE', 'SUPERVISOR', 'REFUERZO');

-- CreateEnum
CREATE TYPE "ShiftDayCode" AS ENUM ('D', 'N', 'X', 'R', 'INC', 'AT', 'LMA', 'LR', 'LNR', 'SAN', 'AUS', 'VAC');

-- AlterTable
ALTER TABLE "payroll_settings" ADD COLUMN     "employerSickLeaveRatePct" DECIMAL(5,2) NOT NULL DEFAULT 66.67,
ADD COLUMN     "epsSickLeaveRateDays3To90Pct" DECIMAL(5,2) NOT NULL DEFAULT 66.67,
ADD COLUMN     "epsSickLeaveRateDays91To180Pct" DECIMAL(5,2) NOT NULL DEFAULT 50.00;

-- CreateTable
CREATE TABLE "employee_dependency_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dependencyId" TEXT NOT NULL,
    "branchId" TEXT,
    "assignmentRole" "DependencyAssignmentRole" NOT NULL DEFAULT 'TITULAR',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_dependency_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_leaves_and_absences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodId" TEXT,
    "leaveType" "LeaveAndAbsenceType" NOT NULL,
    "conceptId" TEXT NOT NULL,
    "cie10Id" TEXT,
    "isExtension" BOOLEAN NOT NULL DEFAULT false,
    "parentLeaveId" TEXT,
    "accumulatedPriorDays" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL DEFAULT 1,
    "employerDays" INTEGER NOT NULL DEFAULT 0,
    "entityDays" INTEGER NOT NULL DEFAULT 0,
    "baseSalaryMonthly" DECIMAL(14,2) NOT NULL DEFAULT 1750905.00,
    "ibcDailyValue" DECIMAL(12,2) NOT NULL DEFAULT 58363.50,
    "employerRecognizedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "entityRecognizedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalLiquidatedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "affectsSeventhDay" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT,
    "certificateNumber" VARCHAR(60),
    "claimStatus" "EpsClaimStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "filingDate" DATE,
    "paymentDate" DATE,
    "reimbursedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "s3SupportKey" VARCHAR(500),
    "fileName" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_leaves_and_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_loans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "creditorEntityId" TEXT,
    "loanCode" VARCHAR(40) NOT NULL,
    "description" VARCHAR(180) NOT NULL,
    "disbursementDate" DATE NOT NULL,
    "startDeductionDate" DATE NOT NULL,
    "principalAmount" DECIMAL(14,2) NOT NULL,
    "installmentAmount" DECIMAL(14,2) NOT NULL,
    "totalInstallments" INTEGER NOT NULL DEFAULT 1,
    "paidInstallments" INTEGER NOT NULL DEFAULT 0,
    "totalPaidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "remainingBalance" DECIMAL(14,2) NOT NULL,
    "deductionRule" "NoveltyPeriodicityRule" NOT NULL DEFAULT 'ALL_PERIODS',
    "status" "PayrollLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_loan_installments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "periodId" TEXT,
    "installmentNumber" INTEGER NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "paymentMethod" VARCHAR(40) NOT NULL DEFAULT 'PAYROLL_DEDUCTION',
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_permanent_concepts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" "PermanentConceptScope" NOT NULL DEFAULT 'BY_EMPLOYEE',
    "employeeId" TEXT,
    "dependencyId" TEXT,
    "conceptId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "isProportionalToDays" BOOLEAN NOT NULL DEFAULT true,
    "applicationRule" "NoveltyPeriodicityRule" NOT NULL DEFAULT 'ALL_PERIODS',
    "validFrom" DATE,
    "validUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_permanent_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_period_novelties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dependencyId" TEXT,
    "conceptId" TEXT NOT NULL,
    "noveltyDate" DATE NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "unitValue" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "origin" "NoveltyOriginType" NOT NULL DEFAULT 'MANUAL',
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_period_novelties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_shift_sequences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "patternJson" JSONB NOT NULL,
    "cycleDaysLength" INTEGER NOT NULL DEFAULT 6,
    "dayShiftHours" INTEGER NOT NULL DEFAULT 12,
    "nightShiftHours" INTEGER NOT NULL DEFAULT 12,
    "defaultDayStartTime" VARCHAR(10) NOT NULL DEFAULT '06:00',
    "defaultNightStartTime" VARCHAR(10) NOT NULL DEFAULT '18:00',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_shift_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_shift_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dependencyId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "shiftCode" "ShiftDayCode" NOT NULL DEFAULT 'D',
    "isReinforcement" BOOLEAN NOT NULL DEFAULT false,
    "isHolidayOrSunday" BOOLEAN NOT NULL DEFAULT false,
    "ordinaryDayHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "nightSurchargeHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "sundayHolidayHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "overtimeDayHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "overtimeNightHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "overtimeHolidayDayHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "overtimeHolidayNightHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "leaveId" TEXT,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_shift_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_dependency_assignments_tenantId_employeeId_startDa_idx" ON "employee_dependency_assignments"("tenantId", "employeeId", "startDate");

-- CreateIndex
CREATE INDEX "employee_dependency_assignments_tenantId_dependencyId_isAct_idx" ON "employee_dependency_assignments"("tenantId", "dependencyId", "isActive");

-- CreateIndex
CREATE INDEX "payroll_leaves_and_absences_tenantId_employeeId_startDate_idx" ON "payroll_leaves_and_absences"("tenantId", "employeeId", "startDate");

-- CreateIndex
CREATE INDEX "payroll_leaves_and_absences_tenantId_leaveType_idx" ON "payroll_leaves_and_absences"("tenantId", "leaveType");

-- CreateIndex
CREATE INDEX "payroll_leaves_and_absences_tenantId_claimStatus_idx" ON "payroll_leaves_and_absences"("tenantId", "claimStatus");

-- CreateIndex
CREATE INDEX "payroll_loans_tenantId_employeeId_status_idx" ON "payroll_loans"("tenantId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_loans_tenantId_loanCode_key" ON "payroll_loans"("tenantId", "loanCode");

-- CreateIndex
CREATE INDEX "payroll_loan_installments_tenantId_loanId_idx" ON "payroll_loan_installments"("tenantId", "loanId");

-- CreateIndex
CREATE INDEX "payroll_permanent_concepts_tenantId_scope_isActive_idx" ON "payroll_permanent_concepts"("tenantId", "scope", "isActive");

-- CreateIndex
CREATE INDEX "payroll_permanent_concepts_tenantId_employeeId_idx" ON "payroll_permanent_concepts"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_permanent_concepts_tenantId_dependencyId_idx" ON "payroll_permanent_concepts"("tenantId", "dependencyId");

-- CreateIndex
CREATE INDEX "payroll_period_novelties_tenantId_periodId_employeeId_idx" ON "payroll_period_novelties"("tenantId", "periodId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_period_novelties_tenantId_conceptId_idx" ON "payroll_period_novelties"("tenantId", "conceptId");

-- CreateIndex
CREATE INDEX "payroll_shift_sequences_tenantId_isActive_idx" ON "payroll_shift_sequences"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_shift_sequences_tenantId_code_key" ON "payroll_shift_sequences"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_shift_records_tenantId_dependencyId_year_month_idx" ON "payroll_shift_records"("tenantId", "dependencyId", "year", "month");

-- CreateIndex
CREATE INDEX "payroll_shift_records_tenantId_employeeId_year_month_idx" ON "payroll_shift_records"("tenantId", "employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_shift_records_tenantId_employeeId_shiftDate_isReinf_key" ON "payroll_shift_records"("tenantId", "employeeId", "shiftDate", "isReinforcement");

-- AddForeignKey
ALTER TABLE "employee_dependency_assignments" ADD CONSTRAINT "employee_dependency_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_dependency_assignments" ADD CONSTRAINT "employee_dependency_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_dependency_assignments" ADD CONSTRAINT "employee_dependency_assignments_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_dependency_assignments" ADD CONSTRAINT "employee_dependency_assignments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "payroll_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_leaves_and_absences" ADD CONSTRAINT "payroll_leaves_and_absences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_leaves_and_absences" ADD CONSTRAINT "payroll_leaves_and_absences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_leaves_and_absences" ADD CONSTRAINT "payroll_leaves_and_absences_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_leaves_and_absences" ADD CONSTRAINT "payroll_leaves_and_absences_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_leaves_and_absences" ADD CONSTRAINT "payroll_leaves_and_absences_cie10Id_fkey" FOREIGN KEY ("cie10Id") REFERENCES "payroll_cie10_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_leaves_and_absences" ADD CONSTRAINT "payroll_leaves_and_absences_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_loans" ADD CONSTRAINT "payroll_loans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_loans" ADD CONSTRAINT "payroll_loans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_loans" ADD CONSTRAINT "payroll_loans_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_loans" ADD CONSTRAINT "payroll_loans_creditorEntityId_fkey" FOREIGN KEY ("creditorEntityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_loan_installments" ADD CONSTRAINT "payroll_loan_installments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_loan_installments" ADD CONSTRAINT "payroll_loan_installments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "payroll_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_loan_installments" ADD CONSTRAINT "payroll_loan_installments_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_permanent_concepts" ADD CONSTRAINT "payroll_permanent_concepts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_permanent_concepts" ADD CONSTRAINT "payroll_permanent_concepts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_permanent_concepts" ADD CONSTRAINT "payroll_permanent_concepts_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_permanent_concepts" ADD CONSTRAINT "payroll_permanent_concepts_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_novelties" ADD CONSTRAINT "payroll_period_novelties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_novelties" ADD CONSTRAINT "payroll_period_novelties_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_novelties" ADD CONSTRAINT "payroll_period_novelties_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_novelties" ADD CONSTRAINT "payroll_period_novelties_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_period_novelties" ADD CONSTRAINT "payroll_period_novelties_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_shift_sequences" ADD CONSTRAINT "payroll_shift_sequences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_shift_records" ADD CONSTRAINT "payroll_shift_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_shift_records" ADD CONSTRAINT "payroll_shift_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_shift_records" ADD CONSTRAINT "payroll_shift_records_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_shift_records" ADD CONSTRAINT "payroll_shift_records_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "payroll_leaves_and_absences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "employee_requirement_checks_tenantId_employeeId_requirementId_k" RENAME TO "employee_requirement_checks_tenantId_employeeId_requirement_key";

