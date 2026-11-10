-- CreateTable
CREATE TABLE "FormAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormAttempt_key_createdAt_idx" ON "FormAttempt"("key", "createdAt");
