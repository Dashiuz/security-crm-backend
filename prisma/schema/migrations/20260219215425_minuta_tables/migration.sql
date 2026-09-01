-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'CORRECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('WEB', 'MOBILE', 'IMPORT', 'API');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('GOOD', 'BAD');

-- CreateEnum
CREATE TYPE "VisitorMode" AS ENUM ('PEDESTRIAN', 'VEHICLE');

-- CreateEnum
CREATE TYPE "CorrespondenceType" AS ENUM ('BOX', 'ENVELOPE', 'OTHER');

-- CreateEnum
CREATE TYPE "CorrespondenceStatus" AS ENUM ('RECEIVED', 'DELIVERED', 'RETURNED', 'VOIDED');

-- CreateTable
CREATE TABLE "correspondence_received_control" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedTime" TIME NOT NULL,
    "destination" TEXT NOT NULL,
    "sender" TEXT,
    "courierCompany" TEXT,
    "trackingNumber" TEXT,
    "guardOnDutyId" TEXT,
    "guardOnDutyNameSnapshot" TEXT,
    "receivedByName" TEXT,
    "correspondenceType" "CorrespondenceType" NOT NULL,
    "status" "CorrespondenceStatus" NOT NULL DEFAULT 'RECEIVED',
    "deliveredAt" TIMESTAMP(3),
    "deliveredToName" TEXT,
    "observations" TEXT,
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'WEB',
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "correspondence_received_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minuta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "annotation" TEXT NOT NULL,
    "category" TEXT,
    "priority" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'WEB',
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "minuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_resident_vehicle_control" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "entryTime" TIME NOT NULL,
    "exitTime" TIME,
    "exitAt" TIMESTAMP(3),
    "parkingNumber" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "interior" TEXT,
    "apartment" TEXT,
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "color" TEXT,
    "mirrors" BOOLEAN,
    "antenna" BOOLEAN,
    "radio" BOOLEAN,
    "spareTire" BOOLEAN,
    "hubcaps" BOOLEAN,
    "vehicleChecklist" JSONB,
    "condition" "VehicleCondition" NOT NULL DEFAULT 'GOOD',
    "guardId" TEXT,
    "guardNameSnapshot" TEXT,
    "observations" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'WEB',
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "parking_resident_vehicle_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_entry_control" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "visitorFullName" TEXT NOT NULL,
    "visitorIdNumber" TEXT NOT NULL,
    "visitorIdType" TEXT,
    "entryTime" TIME NOT NULL,
    "exitTime" TIME,
    "exitAt" TIMESTAMP(3),
    "authorizedByFullName" TEXT,
    "peopleCount" INTEGER NOT NULL DEFAULT 1,
    "mode" "VisitorMode" NOT NULL,
    "destination" TEXT,
    "block" TEXT,
    "apartment" TEXT,
    "ticketNumber" TEXT,
    "brand" TEXT,
    "plate" TEXT,
    "observations" TEXT,
    "guardId" TEXT,
    "guardNameSnapshot" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'WEB',
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "visitor_entry_control_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "correspondence_received_control_tenantId_idx" ON "correspondence_received_control"("tenantId");

-- CreateIndex
CREATE INDEX "correspondence_received_control_tenantId_date_idx" ON "correspondence_received_control"("tenantId", "date");

-- CreateIndex
CREATE INDEX "correspondence_received_control_tenantId_occurredAt_idx" ON "correspondence_received_control"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "correspondence_received_control_tenantId_status_idx" ON "correspondence_received_control"("tenantId", "status");

-- CreateIndex
CREATE INDEX "correspondence_received_control_trackingNumber_idx" ON "correspondence_received_control"("trackingNumber");

-- CreateIndex
CREATE INDEX "correspondence_received_control_guardOnDutyId_idx" ON "correspondence_received_control"("guardOnDutyId");

-- CreateIndex
CREATE INDEX "minuta_tenantId_idx" ON "minuta"("tenantId");

-- CreateIndex
CREATE INDEX "minuta_tenantId_date_idx" ON "minuta"("tenantId", "date");

-- CreateIndex
CREATE INDEX "minuta_tenantId_occurredAt_idx" ON "minuta"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "minuta_createdById_idx" ON "minuta"("createdById");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_tenantId_idx" ON "parking_resident_vehicle_control"("tenantId");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_tenantId_date_idx" ON "parking_resident_vehicle_control"("tenantId", "date");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_tenantId_occurredAt_idx" ON "parking_resident_vehicle_control"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_tenantId_plate_idx" ON "parking_resident_vehicle_control"("tenantId", "plate");

-- CreateIndex
CREATE INDEX "parking_resident_vehicle_control_guardId_idx" ON "parking_resident_vehicle_control"("guardId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_tenantId_idx" ON "visitor_entry_control"("tenantId");

-- CreateIndex
CREATE INDEX "visitor_entry_control_tenantId_date_idx" ON "visitor_entry_control"("tenantId", "date");

-- CreateIndex
CREATE INDEX "visitor_entry_control_tenantId_occurredAt_idx" ON "visitor_entry_control"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "visitor_entry_control_tenantId_visitorIdNumber_idx" ON "visitor_entry_control"("tenantId", "visitorIdNumber");

-- CreateIndex
CREATE INDEX "visitor_entry_control_tenantId_plate_idx" ON "visitor_entry_control"("tenantId", "plate");

-- CreateIndex
CREATE INDEX "visitor_entry_control_guardId_idx" ON "visitor_entry_control"("guardId");

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_guardOnDutyId_fkey" FOREIGN KEY ("guardOnDutyId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence_received_control" ADD CONSTRAINT "correspondence_received_control_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minuta" ADD CONSTRAINT "minuta_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_resident_vehicle_control" ADD CONSTRAINT "parking_resident_vehicle_control_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entry_control" ADD CONSTRAINT "visitor_entry_control_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
