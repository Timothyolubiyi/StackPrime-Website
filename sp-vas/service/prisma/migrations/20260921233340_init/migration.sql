-- CreateTable
CREATE TABLE "ToolUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "riskGrade" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "reportPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ToolUsage_fingerprint_ipAddress_idx" ON "ToolUsage"("fingerprint", "ipAddress");
