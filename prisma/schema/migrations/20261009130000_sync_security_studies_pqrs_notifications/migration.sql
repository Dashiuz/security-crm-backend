-- CreateEnum
CREATE TYPE "SecurityStudyStatus" AS ENUM ('CURRENT', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "PqrsType" AS ENUM ('PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'FELICITACION');

-- CreateEnum
CREATE TYPE "PqrsStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PqrsPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "client" ADD COLUMN     "geofence" JSONB,
ADD COLUMN     "mapboxBaseImageS3Key" TEXT,
ADD COLUMN     "mapboxBboxMaxLat" DOUBLE PRECISION,
ADD COLUMN     "mapboxBboxMaxLng" DOUBLE PRECISION,
ADD COLUMN     "mapboxBboxMinLat" DOUBLE PRECISION,
ADD COLUMN     "mapboxBboxMinLng" DOUBLE PRECISION,
ADD COLUMN     "mapboxCenterLat" DOUBLE PRECISION,
ADD COLUMN     "mapboxCenterLng" DOUBLE PRECISION,
ADD COLUMN     "mapboxZoom" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "media_attachments" ADD COLUMN     "pqrsMessageId" TEXT,
ADD COLUMN     "pqrsTicketId" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pqrs_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PqrsStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "PqrsPriority" NOT NULL DEFAULT 'MEDIUM',
    "type" "PqrsType" NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pqrs_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pqrs_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFromClient" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pqrs_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_studies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "baseImageS3Key" TEXT,
    "mapboxCenterLat" DOUBLE PRECISION,
    "mapboxCenterLng" DOUBLE PRECISION,
    "mapboxZoom" DOUBLE PRECISION,
    "mapboxBboxMinLat" DOUBLE PRECISION,
    "mapboxBboxMinLng" DOUBLE PRECISION,
    "mapboxBboxMaxLat" DOUBLE PRECISION,
    "mapboxBboxMaxLng" DOUBLE PRECISION,
    "canvasState" JSONB,
    "status" "SecurityStudyStatus" NOT NULL DEFAULT 'CURRENT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "files" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "security_studies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "pqrs_tickets_tenantId_idx" ON "pqrs_tickets"("tenantId");

-- CreateIndex
CREATE INDEX "pqrs_tickets_clientId_idx" ON "pqrs_tickets"("clientId");

-- CreateIndex
CREATE INDEX "pqrs_tickets_assignedToId_idx" ON "pqrs_tickets"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "pqrs_tickets_tenantId_code_key" ON "pqrs_tickets"("tenantId", "code");

-- CreateIndex
CREATE INDEX "pqrs_messages_tenantId_idx" ON "pqrs_messages"("tenantId");

-- CreateIndex
CREATE INDEX "pqrs_messages_clientId_idx" ON "pqrs_messages"("clientId");

-- CreateIndex
CREATE INDEX "pqrs_messages_ticketId_idx" ON "pqrs_messages"("ticketId");

-- CreateIndex
CREATE INDEX "security_studies_tenantId_idx" ON "security_studies"("tenantId");

-- CreateIndex
CREATE INDEX "security_studies_clientId_idx" ON "security_studies"("clientId");

-- CreateIndex
CREATE INDEX "media_attachments_pqrsTicketId_idx" ON "media_attachments"("pqrsTicketId");

-- CreateIndex
CREATE INDEX "media_attachments_pqrsMessageId_idx" ON "media_attachments"("pqrsMessageId");

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_pqrsTicketId_fkey" FOREIGN KEY ("pqrsTicketId") REFERENCES "pqrs_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_pqrsMessageId_fkey" FOREIGN KEY ("pqrsMessageId") REFERENCES "pqrs_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_tickets" ADD CONSTRAINT "pqrs_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_tickets" ADD CONSTRAINT "pqrs_tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_tickets" ADD CONSTRAINT "pqrs_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_tickets" ADD CONSTRAINT "pqrs_tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_tickets" ADD CONSTRAINT "pqrs_tickets_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_messages" ADD CONSTRAINT "pqrs_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_messages" ADD CONSTRAINT "pqrs_messages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_messages" ADD CONSTRAINT "pqrs_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "pqrs_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_messages" ADD CONSTRAINT "pqrs_messages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs_messages" ADD CONSTRAINT "pqrs_messages_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_studies" ADD CONSTRAINT "security_studies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_studies" ADD CONSTRAINT "security_studies_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_studies" ADD CONSTRAINT "security_studies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_studies" ADD CONSTRAINT "security_studies_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_studies" ADD CONSTRAINT "security_studies_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

