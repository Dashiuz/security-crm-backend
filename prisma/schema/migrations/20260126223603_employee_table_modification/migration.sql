/*
  Warnings:

  - You are about to drop the column `department` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `departmentNameSnapshot` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employee" DROP COLUMN "department",
DROP COLUMN "departmentNameSnapshot",
DROP COLUMN "position",
ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "createdBy" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "role_permission" ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "assignedBy" TEXT;

-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "user_role" ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "assignedBy" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createdBy" TEXT;
