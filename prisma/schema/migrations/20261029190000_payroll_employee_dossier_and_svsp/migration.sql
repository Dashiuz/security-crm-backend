-- CreateEnum
CREATE TYPE "EmploymentContractType" AS ENUM ('FIXED_TERM', 'INDEFINITE', 'WORK_OR_LABOR', 'APPRENTICE_LECTIVE', 'APPRENTICE_PRODUCTIVE');

-- CreateEnum
CREATE TYPE "EmployeeSalaryMode" AS ENUM ('BY_DEPENDENCY', 'CUSTOM_FIXED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('SAVINGS', 'CHECKING', 'ELECTRONIC_DEPOSIT', 'CASH_OR_CHECK');

-- CreateEnum
CREATE TYPE "MilitaryCardClass" AS ENUM ('FIRST_CLASS', 'SECOND_CLASS', 'PROVISIONAL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'FREE_UNION', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('PRIMARY', 'HIGH_SCHOOL', 'TECHNICAL', 'TECHNOLOGIST', 'PROFESSIONAL', 'POSTGRADUATE');

-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('OWN', 'RENTED', 'FAMILY', 'MORTGAGED');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "HiringRequirementStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'WAIVED');

-- CreateTable
CREATE TABLE "employee_payroll_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT,
    "primaryDependencyId" TEXT,
    "contractType" "EmploymentContractType" NOT NULL DEFAULT 'FIXED_TERM',
    "contractNumber" VARCHAR(50),
    "contractEndDate" DATE,
    "probationEndDate" DATE,
    "salaryMode" "EmployeeSalaryMode" NOT NULL DEFAULT 'BY_DEPENDENCY',
    "customBaseSalary" DECIMAL(14,2) NOT NULL DEFAULT 1750905.00,
    "hasTransportAllowance" BOOLEAN NOT NULL DEFAULT true,
    "customAdvanceValue" DECIMAL(14,2),
    "isIntegralSalary" BOOLEAN NOT NULL DEFAULT false,
    "pilaContributorType" VARCHAR(5) NOT NULL DEFAULT '01',
    "pilaContributorSubtype" VARCHAR(5) NOT NULL DEFAULT '00',
    "isPensioner" BOOLEAN NOT NULL DEFAULT false,
    "arlRiskClass" "ArlRiskClass" NOT NULL DEFAULT 'RISK_IV',
    "epsEntityId" TEXT,
    "afpEntityId" TEXT,
    "cesantiasEntityId" TEXT,
    "ccfEntityId" TEXT,
    "bankId" TEXT,
    "bankAccountType" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "bankAccountNumber" VARCHAR(50),
    "daneBirthCityCode" VARCHAR(10),
    "daneBirthCityName" VARCHAR(100),
    "daneCityCode" VARCHAR(10) DEFAULT '11001',
    "daneCityName" VARCHAR(100) DEFAULT 'BOGOTÁ D.C.',
    "neighborhood" VARCHAR(120),
    "stratum" INTEGER DEFAULT 2,
    "maritalStatus" "MaritalStatus" NOT NULL DEFAULT 'SINGLE',
    "bloodType" VARCHAR(10),
    "educationLevel" "EducationLevel" NOT NULL DEFAULT 'HIGH_SCHOOL',
    "housingType" "HousingType" NOT NULL DEFAULT 'RENTED',
    "transportMeans" VARCHAR(80),
    "militaryCardNumber" VARCHAR(40),
    "militaryCardClass" "MilitaryCardClass" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "militaryDistrict" VARCHAR(40),
    "shirtSize" VARCHAR(15),
    "pantsSize" VARCHAR(15),
    "footwearSize" VARCHAR(15),
    "exitReasonId" TEXT,
    "exitNotes" TEXT,
    "isBlockedForRehire" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_payroll_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_family_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fullName" VARCHAR(160) NOT NULL,
    "relationship" "FamilyRelationship" NOT NULL,
    "documentType" VARCHAR(10) NOT NULL DEFAULT 'TI',
    "document" VARCHAR(30),
    "birthdate" DATE,
    "gender" VARCHAR(20),
    "phone" VARCHAR(30),
    "isDependentForSubsidy" BOOLEAN NOT NULL DEFAULT true,
    "isScholar" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(250),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_requirement_checks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "HiringRequirementStatus" NOT NULL DEFAULT 'PENDING',
    "issueDate" DATE,
    "expiryDate" DATE,
    "verifiedAt" TIMESTAMP(3),
    "s3Key" VARCHAR(500),
    "fileName" VARCHAR(255),
    "notes" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_requirement_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_svsp_courses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "svspLevelId" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "nroCode" VARCHAR(60) NOT NULL,
    "certificateNumber" VARCHAR(60),
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "s3Key" VARCHAR(500),
    "fileName" VARCHAR(255),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_svsp_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_internal_trainings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "topic" VARCHAR(120) NOT NULL,
    "instructorName" VARCHAR(150) NOT NULL,
    "trainingDate" DATE NOT NULL,
    "durationHours" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "score" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_internal_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_payroll_profiles_employeeId_key" ON "employee_payroll_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "employee_payroll_profiles_tenantId_idx" ON "employee_payroll_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "employee_payroll_profiles_tenantId_primaryDependencyId_idx" ON "employee_payroll_profiles"("tenantId", "primaryDependencyId");

-- CreateIndex
CREATE INDEX "employee_payroll_profiles_tenantId_branchId_idx" ON "employee_payroll_profiles"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "employee_payroll_profiles_tenantId_contractEndDate_idx" ON "employee_payroll_profiles"("tenantId", "contractEndDate");

-- CreateIndex
CREATE INDEX "employee_family_members_tenantId_employeeId_idx" ON "employee_family_members"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "employee_requirement_checks_tenantId_employeeId_idx" ON "employee_requirement_checks"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_requirement_checks_tenantId_employeeId_requirementId_key" ON "employee_requirement_checks"("tenantId", "employeeId", "requirementId");

-- CreateIndex
CREATE INDEX "employee_svsp_courses_tenantId_employeeId_idx" ON "employee_svsp_courses"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "employee_svsp_courses_tenantId_expiryDate_idx" ON "employee_svsp_courses"("tenantId", "expiryDate");

-- CreateIndex
CREATE INDEX "employee_internal_trainings_tenantId_employeeId_idx" ON "employee_internal_trainings"("tenantId", "employeeId");

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "payroll_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_primaryDependencyId_fkey" FOREIGN KEY ("primaryDependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_epsEntityId_fkey" FOREIGN KEY ("epsEntityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_afpEntityId_fkey" FOREIGN KEY ("afpEntityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_cesantiasEntityId_fkey" FOREIGN KEY ("cesantiasEntityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_ccfEntityId_fkey" FOREIGN KEY ("ccfEntityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_exitReasonId_fkey" FOREIGN KEY ("exitReasonId") REFERENCES "payroll_exit_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_family_members" ADD CONSTRAINT "employee_family_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_family_members" ADD CONSTRAINT "employee_family_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requirement_checks" ADD CONSTRAINT "employee_requirement_checks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requirement_checks" ADD CONSTRAINT "employee_requirement_checks_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requirement_checks" ADD CONSTRAINT "employee_requirement_checks_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "payroll_hiring_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_svsp_courses" ADD CONSTRAINT "employee_svsp_courses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_svsp_courses" ADD CONSTRAINT "employee_svsp_courses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_svsp_courses" ADD CONSTRAINT "employee_svsp_courses_svspLevelId_fkey" FOREIGN KEY ("svspLevelId") REFERENCES "payroll_svsp_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_svsp_courses" ADD CONSTRAINT "employee_svsp_courses_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "payroll_security_academies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_internal_trainings" ADD CONSTRAINT "employee_internal_trainings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_internal_trainings" ADD CONSTRAINT "employee_internal_trainings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

