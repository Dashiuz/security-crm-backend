-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('EMPLOYEE', 'RESIDENCE_MANAGER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'EMPLOYEE';
