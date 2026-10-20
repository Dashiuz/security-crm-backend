-- CreateTable
CREATE TABLE "user_client_access" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "roleName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_client_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_client_access_tenantId_idx" ON "user_client_access"("tenantId");

-- CreateIndex
CREATE INDEX "user_client_access_userId_idx" ON "user_client_access"("userId");

-- CreateIndex
CREATE INDEX "user_client_access_clientId_idx" ON "user_client_access"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "user_client_access_userId_clientId_key" ON "user_client_access"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "user_client_access" ADD CONSTRAINT "user_client_access_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_client_access" ADD CONSTRAINT "user_client_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_client_access" ADD CONSTRAINT "user_client_access_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
