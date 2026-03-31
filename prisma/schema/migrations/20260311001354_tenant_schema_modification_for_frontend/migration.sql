-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#1976d2',
ADD COLUMN     "secondaryColor" TEXT DEFAULT '#9c27b0',
ADD COLUMN     "sidebarColor" TEXT;
