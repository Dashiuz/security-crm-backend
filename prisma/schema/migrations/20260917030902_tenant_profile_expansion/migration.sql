-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "PasswordPolicy" AS ENUM ('LOW', 'MEDIUM', 'STRICT');

-- CreateTable
CREATE TABLE "tenant_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalName" VARCHAR(150) NOT NULL,
    "taxId" VARCHAR(50) NOT NULL,
    "contactEmail" VARCHAR(100) NOT NULL,
    "contactPhone" VARCHAR(50),
    "address" VARCHAR(200),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "legalRepresentative" VARCHAR(150),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "maxClients" INTEGER NOT NULL DEFAULT 5,
    "maxUsers" INTEGER NOT NULL DEFAULT 50,
    "maxEmployees" INTEGER NOT NULL DEFAULT 50,
    "subscriptionEndsAt" TIMESTAMP(3),
    "paymentGatewayId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Bogota',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "dateFormat" VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    "mfaRequired" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "passwordPolicy" "PasswordPolicy" NOT NULL DEFAULT 'MEDIUM',
    "faviconUrl" VARCHAR(255),
    "loginBackgroundUrl" VARCHAR(255),
    "supportEmail" VARCHAR(100),
    "supportPhone" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_profiles_tenantId_key" ON "tenant_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenantId_key" ON "tenant_subscriptions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
