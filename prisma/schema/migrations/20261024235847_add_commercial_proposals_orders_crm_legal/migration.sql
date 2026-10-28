-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('COMPLIANCE', 'WAGES_AND_BENEFITS', 'SERVICE_QUALITY', 'CIVIL_LIABILITY_PLO', 'GLOBAL_THEFT');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AnsCommitmentType" AS ENUM ('SECURITY_STUDY_DELIVERY', 'PRIOR_TAKEOVER_EMPALME', 'FREE_GUARD_SUPPORT_12H', 'QUARTERLY_MANAGEMENT_REP');

-- CreateEnum
CREATE TYPE "AnsCommitmentStatus" AS ENUM ('PENDING', 'FULFILLED', 'BREACHED');

-- CreateEnum
CREATE TYPE "LeadSourceChannel" AS ENUM ('RESIDENT_REFERRAL', 'GUARD_REFERRAL', 'ADMINISTRATOR_REFERRAL', 'COMMERCIAL_PROSPECTION', 'PUBLIC_TENDER', 'COMMERCIAL_ALLIANCE', 'WEBSITE_INBOUND', 'OTHER');

-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('PHONE_CALL', 'WHATSAPP_MESSAGE', 'EMAIL', 'IN_PERSON_MEETING', 'VIDEO_CONFERENCE', 'TECHNICAL_VISIT');

-- CreateEnum
CREATE TYPE "FollowUpMilestoneStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'REJECTED');

-- CreateEnum
CREATE TYPE "DealLossReasonCategory" AS ENUM ('COMPETITOR_PRICE', 'AUTOMATIC_RENEWAL', 'PERMANENCE_CLAUSE', 'HIGHER_VALUE_ADDED', 'BUDGET_LIMITATION', 'PREFERS_CONCIERGE', 'NO_DECISION_CANCELLED', 'FAILED_COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED_INTERNAL', 'SENT_TO_CLIENT', 'WON', 'LOST', 'VOIDED');

-- CreateEnum
CREATE TYPE "ProposalContractType" AS ENUM ('NEW_CONTRACT', 'RENEWAL', 'ADDITION');

-- CreateEnum
CREATE TYPE "PnlHealthStatus" AS ENUM ('PROFITABLE', 'WARNING_LOW_MARGIN', 'DEFICIT_BLOCKED');

-- CreateEnum
CREATE TYPE "BenefitPeriodicity" AS ENUM ('SINGLE_ONE_TIME', 'MONTHLY_RECURRING', 'ANNUAL_RENEWAL');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('DRAFT_CONFIGURING', 'ISSUED_DISPATCHED', 'IN_OPERATION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceOrderType" AS ENUM ('NEW_SITE', 'CONTRACT_RENEWAL', 'POSITION_ADDITION');

-- CreateEnum
CREATE TYPE "EquipmentDeliveryStatus" AS ENUM ('PENDING_WAREHOUSE', 'DISPATCHED_TO_SITE', 'DELIVERED_ON_SITE');

-- AlterTable
ALTER TABLE "client" ADD COLUMN     "administratorBirth" DATE,
ADD COLUMN     "councilPresidentBirth" DATE,
ADD COLUMN     "councilPresidentEmail" VARCHAR(150),
ADD COLUMN     "councilPresidentName" VARCHAR(150),
ADD COLUMN     "councilPresidentPhone" VARCHAR(50),
ADD COLUMN     "leadSource" "LeadSourceChannel",
ADD COLUMN     "leadSourceDetail" VARCHAR(255),
ADD COLUMN     "maxDeliveryDate" DATE,
ADD COLUMN     "quoteDeliveryFormat" TEXT DEFAULT 'EMAIL',
ADD COLUMN     "recaptationAlertSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recaptationTargetDate" DATE,
ADD COLUMN     "stratum" INTEGER,
ADD COLUMN     "treasurerBirth" DATE,
ADD COLUMN     "treasurerName" VARCHAR(150),
ADD COLUMN     "treasurerPhone" VARCHAR(50);

-- CreateTable
CREATE TABLE "client_insurance_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "policyType" "PolicyType" NOT NULL,
    "insuranceCompanyName" VARCHAR(150) NOT NULL,
    "policyCertificateNumber" VARCHAR(100) NOT NULL,
    "insuredAmount" DECIMAL(14,2) NOT NULL,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "mediaAttachmentId" TEXT,
    "alertSent30Days" BOOLEAN NOT NULL DEFAULT false,
    "alertSent7Days" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_addendums" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "addendumNumber" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE NOT NULL,
    "durationYears" INTEGER NOT NULL DEFAULT 1,
    "reinvestmentAmountPact" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disbursedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disbursementDate" DATE,
    "disbursementReceiptS3Key" TEXT,
    "description" TEXT,
    "mediaAttachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_addendums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_ans_commitments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "commitmentType" "AnsCommitmentType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "dueDate" DATE NOT NULL,
    "deliveredDate" DATE,
    "status" "AnsCommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_ans_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_follow_ups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "interactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactChannel" "InteractionChannel" NOT NULL,
    "contactPersonName" VARCHAR(150) NOT NULL,
    "contactPersonRole" VARCHAR(100),
    "managementSummary" TEXT NOT NULL,
    "nextContactDate" DATE,
    "statusAfterFollowUp" "FollowUpMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "lossReasonCategory" "DealLossReasonCategory",
    "lossReasonDescription" TEXT,
    "winningCompetitorName" VARCHAR(150),
    "competitorPriceQuoted" DECIMAL(12,2),
    "competitorGuardsSalary" DECIMAL(12,2),
    "assignedCommercialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_proposals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tariffPeriodId" TEXT NOT NULL,
    "proposalFolioCode" VARCHAR(50) NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "contractType" "ProposalContractType" NOT NULL DEFAULT 'NEW_CONTRACT',
    "contractDurationMonths" INTEGER NOT NULL DEFAULT 12,
    "includePresentation" BOOLEAN NOT NULL DEFAULT true,
    "includeTechSecurityStudy" BOOLEAN NOT NULL DEFAULT true,
    "includeEconomicQuote" BOOLEAN NOT NULL DEFAULT true,
    "includeValuesAdded" BOOLEAN NOT NULL DEFAULT true,
    "includeHseqAnnexes" BOOLEAN NOT NULL DEFAULT false,
    "subtotalMonthlyPreDisc" DECIMAL(14,2) NOT NULL,
    "promptPaymentDiscPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "promptPaymentDiscAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotalMonthlyAfterDisc" DECIMAL(14,2) NOT NULL,
    "aiuBaseAmount" DECIMAL(14,2) NOT NULL,
    "ivaAmount" DECIMAL(14,2) NOT NULL,
    "totalMonthlyWithTax" DECIMAL(14,2) NOT NULL,
    "totalAnnualContractValue" DECIMAL(16,2) NOT NULL,
    "estimatedMonthlyRealCost" DECIMAL(14,2) NOT NULL,
    "monthlyVagAmortization" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalMonthlyOperatingCost" DECIMAL(14,2) NOT NULL,
    "netMonthlyMarginAmount" DECIMAL(14,2) NOT NULL,
    "netMarginPercentage" DECIMAL(6,2) NOT NULL,
    "pnlStatus" "PnlHealthStatus" NOT NULL DEFAULT 'PROFITABLE',
    "draftSnapshotJson" JSONB,
    "mediaAttachmentId" TEXT,
    "documentSha256" VARCHAR(64),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_service_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "positionTitle" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "scheduleType" "ShiftScheduleType" NOT NULL,
    "weaponModality" "WeaponModality" NOT NULL DEFAULT 'NO_WEAPON',
    "tariffCategory" "CommercialSector" NOT NULL DEFAULT 'RESIDENTIAL_STRATA_4_6',
    "unitMonthlyBilledPrice" DECIMAL(14,2) NOT NULL,
    "totalMonthlyBilledPrice" DECIMAL(14,2) NOT NULL,
    "unitMonthlyRealCost" DECIMAL(14,2) NOT NULL,
    "totalMonthlyRealCost" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_value_added_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "valueAddedCatalogItemId" TEXT,
    "itemName" VARCHAR(150) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "periodicity" "BenefitPeriodicity" NOT NULL DEFAULT 'SINGLE_ONE_TIME',
    "itemInternalCost" DECIMAL(14,2) NOT NULL,
    "totalInternalCost" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_value_added_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalId" TEXT,
    "orderFolioCode" VARCHAR(50) NOT NULL,
    "omegaCode" VARCHAR(50) NOT NULL,
    "orderType" "ServiceOrderType" NOT NULL DEFAULT 'NEW_SITE',
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'DRAFT_CONFIGURING',
    "installationDate" DATE NOT NULL,
    "contractEndDate" DATE NOT NULL,
    "empalmeDaysPrior" INTEGER NOT NULL DEFAULT 3,
    "siteAddress" VARCHAR(255) NOT NULL,
    "siteCity" VARCHAR(100) NOT NULL,
    "sitePhone" VARCHAR(50),
    "legalRepName" VARCHAR(150) NOT NULL,
    "legalRepPhone" VARCHAR(50),
    "administratorName" VARCHAR(150) NOT NULL,
    "administratorPhone" VARCHAR(50),
    "administratorEmail" VARCHAR(150),
    "assignedCoordinatorId" TEXT,
    "assignedCoordinatorName" VARCHAR(150),
    "commercialUserId" TEXT NOT NULL,
    "totalMonthlyBeforeTax" DECIMAL(14,2) NOT NULL,
    "totalMonthlyWithTax" DECIMAL(14,2) NOT NULL,
    "operationalNotes" TEXT,
    "mediaAttachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_positions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "positionTitle" VARCHAR(100) NOT NULL,
    "quantityGuards" INTEGER NOT NULL DEFAULT 1,
    "scheduleType" "ShiftScheduleType" NOT NULL,
    "weaponModality" "WeaponModality" NOT NULL DEFAULT 'NO_WEAPON',
    "netMonthlySalaryToPay" DECIMAL(12,2) NOT NULL,
    "minYearsExperiencePh" INTEGER NOT NULL DEFAULT 1,
    "preferredGender" VARCHAR(20),
    "requiresCurrentCourse" BOOLEAN NOT NULL DEFAULT true,
    "requiresGalaUniform" BOOLEAN NOT NULL DEFAULT false,
    "specificProfileTraits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_equipment_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "itemName" VARCHAR(150) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isMandatoryOnSite" BOOLEAN NOT NULL DEFAULT true,
    "deliveryStatus" "EquipmentDeliveryStatus" NOT NULL DEFAULT 'PENDING_WAREHOUSE',
    "serialNumbers" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_order_equipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_dispatch_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "department" "InternalDepartment" NOT NULL,
    "recipientEmail" VARCHAR(150) NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasEmailSuccess" BOOLEAN NOT NULL DEFAULT true,
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_dispatch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_insurance_policies_mediaAttachmentId_key" ON "client_insurance_policies"("mediaAttachmentId");

-- CreateIndex
CREATE INDEX "client_insurance_policies_tenantId_clientId_status_idx" ON "client_insurance_policies"("tenantId", "clientId", "status");

-- CreateIndex
CREATE INDEX "client_insurance_policies_tenantId_effectiveEndDate_idx" ON "client_insurance_policies"("tenantId", "effectiveEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "client_insurance_policies_tenantId_policyCertificateNumber_key" ON "client_insurance_policies"("tenantId", "policyCertificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "contract_addendums_mediaAttachmentId_key" ON "contract_addendums"("mediaAttachmentId");

-- CreateIndex
CREATE INDEX "contract_addendums_tenantId_clientId_idx" ON "contract_addendums"("tenantId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_addendums_tenantId_clientId_addendumNumber_key" ON "contract_addendums"("tenantId", "clientId", "addendumNumber");

-- CreateIndex
CREATE INDEX "client_ans_commitments_tenantId_clientId_status_idx" ON "client_ans_commitments"("tenantId", "clientId", "status");

-- CreateIndex
CREATE INDEX "client_ans_commitments_tenantId_dueDate_idx" ON "client_ans_commitments"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "commercial_follow_ups_tenantId_clientId_idx" ON "commercial_follow_ups"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "commercial_follow_ups_tenantId_interactionDate_idx" ON "commercial_follow_ups"("tenantId", "interactionDate");

-- CreateIndex
CREATE INDEX "commercial_follow_ups_tenantId_statusAfterFollowUp_idx" ON "commercial_follow_ups"("tenantId", "statusAfterFollowUp");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_proposals_mediaAttachmentId_key" ON "commercial_proposals"("mediaAttachmentId");

-- CreateIndex
CREATE INDEX "commercial_proposals_tenantId_clientId_idx" ON "commercial_proposals"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "commercial_proposals_tenantId_status_idx" ON "commercial_proposals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "commercial_proposals_tenantId_pnlStatus_idx" ON "commercial_proposals"("tenantId", "pnlStatus");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_proposals_tenantId_proposalFolioCode_versionNumb_key" ON "commercial_proposals"("tenantId", "proposalFolioCode", "versionNumber");

-- CreateIndex
CREATE INDEX "proposal_service_items_tenantId_proposalId_idx" ON "proposal_service_items"("tenantId", "proposalId");

-- CreateIndex
CREATE INDEX "proposal_value_added_items_tenantId_proposalId_idx" ON "proposal_value_added_items"("tenantId", "proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_proposalId_key" ON "service_orders"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_mediaAttachmentId_key" ON "service_orders"("mediaAttachmentId");

-- CreateIndex
CREATE INDEX "service_orders_tenantId_clientId_idx" ON "service_orders"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "service_orders_tenantId_status_idx" ON "service_orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "service_orders_tenantId_installationDate_idx" ON "service_orders"("tenantId", "installationDate");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_tenantId_orderFolioCode_key" ON "service_orders"("tenantId", "orderFolioCode");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_tenantId_omegaCode_key" ON "service_orders"("tenantId", "omegaCode");

-- CreateIndex
CREATE INDEX "service_order_positions_tenantId_serviceOrderId_idx" ON "service_order_positions"("tenantId", "serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_equipment_items_tenantId_serviceOrderId_idx" ON "service_order_equipment_items"("tenantId", "serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_dispatch_logs_tenantId_serviceOrderId_idx" ON "service_order_dispatch_logs"("tenantId", "serviceOrderId");

-- AddForeignKey
ALTER TABLE "client_insurance_policies" ADD CONSTRAINT "client_insurance_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_insurance_policies" ADD CONSTRAINT "client_insurance_policies_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_insurance_policies" ADD CONSTRAINT "client_insurance_policies_mediaAttachmentId_fkey" FOREIGN KEY ("mediaAttachmentId") REFERENCES "media_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_addendums" ADD CONSTRAINT "contract_addendums_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_addendums" ADD CONSTRAINT "contract_addendums_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_addendums" ADD CONSTRAINT "contract_addendums_mediaAttachmentId_fkey" FOREIGN KEY ("mediaAttachmentId") REFERENCES "media_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_ans_commitments" ADD CONSTRAINT "client_ans_commitments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_ans_commitments" ADD CONSTRAINT "client_ans_commitments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_follow_ups" ADD CONSTRAINT "commercial_follow_ups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_follow_ups" ADD CONSTRAINT "commercial_follow_ups_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_follow_ups" ADD CONSTRAINT "commercial_follow_ups_assignedCommercialId_fkey" FOREIGN KEY ("assignedCommercialId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_proposals" ADD CONSTRAINT "commercial_proposals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_proposals" ADD CONSTRAINT "commercial_proposals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_proposals" ADD CONSTRAINT "commercial_proposals_tariffPeriodId_fkey" FOREIGN KEY ("tariffPeriodId") REFERENCES "tariff_period_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_proposals" ADD CONSTRAINT "commercial_proposals_mediaAttachmentId_fkey" FOREIGN KEY ("mediaAttachmentId") REFERENCES "media_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_proposals" ADD CONSTRAINT "commercial_proposals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_proposals" ADD CONSTRAINT "commercial_proposals_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_service_items" ADD CONSTRAINT "proposal_service_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_service_items" ADD CONSTRAINT "proposal_service_items_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "commercial_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_service_items" ADD CONSTRAINT "proposal_service_items_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "security_service_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_value_added_items" ADD CONSTRAINT "proposal_value_added_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_value_added_items" ADD CONSTRAINT "proposal_value_added_items_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "commercial_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_value_added_items" ADD CONSTRAINT "proposal_value_added_items_valueAddedCatalogItemId_fkey" FOREIGN KEY ("valueAddedCatalogItemId") REFERENCES "value_added_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "commercial_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_commercialUserId_fkey" FOREIGN KEY ("commercialUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_mediaAttachmentId_fkey" FOREIGN KEY ("mediaAttachmentId") REFERENCES "media_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_positions" ADD CONSTRAINT "service_order_positions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_positions" ADD CONSTRAINT "service_order_positions_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_equipment_items" ADD CONSTRAINT "service_order_equipment_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_equipment_items" ADD CONSTRAINT "service_order_equipment_items_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_dispatch_logs" ADD CONSTRAINT "service_order_dispatch_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_dispatch_logs" ADD CONSTRAINT "service_order_dispatch_logs_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
