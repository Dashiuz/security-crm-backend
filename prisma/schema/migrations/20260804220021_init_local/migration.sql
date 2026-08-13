/*
  Warnings:

  - You are about to drop the column `enabledFeatures` on the `tenant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tenant" DROP COLUMN "enabledFeatures";

-- AlterTable
ALTER TABLE "user_session" ADD COLUMN     "impersonatedTenantId" TEXT;

-- CreateTable
CREATE TABLE "feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FeatureToTenant" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FeatureToTenant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_key_key" ON "feature"("key");

-- CreateIndex
CREATE INDEX "_FeatureToTenant_B_index" ON "_FeatureToTenant"("B");

-- AddForeignKey
ALTER TABLE "_FeatureToTenant" ADD CONSTRAINT "_FeatureToTenant_A_fkey" FOREIGN KEY ("A") REFERENCES "feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FeatureToTenant" ADD CONSTRAINT "_FeatureToTenant_B_fkey" FOREIGN KEY ("B") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
