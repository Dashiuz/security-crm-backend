-- AlterTable
ALTER TABLE "commercial_settings" ADD COLUMN "defaultPromptPaymentDays" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "defaultPromptPaymentDisc" DECIMAL(5,4) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "tariff_period_configs" ALTER COLUMN "strata46Multiplier" SET DEFAULT 9.77;

-- AlterTable
ALTER TABLE "commercial_proposals" ADD COLUMN "promptPaymentDays" INTEGER NOT NULL DEFAULT 10;
