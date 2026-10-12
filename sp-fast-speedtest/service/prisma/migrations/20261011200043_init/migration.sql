-- CreateTable
CREATE TABLE "ToolUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipAddress" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "SpeedTestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usageId" TEXT NOT NULL,
    "downloadMbps" REAL NOT NULL,
    "uploadMbps" REAL NOT NULL,
    "latencyMs" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ToolUsage_fingerprint_idx" ON "ToolUsage"("fingerprint");

-- CreateIndex
CREATE INDEX "ToolUsage_ipAddress_idx" ON "ToolUsage"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTransfer_ipAddress_date_key" ON "DailyTransfer"("ipAddress", "date");
