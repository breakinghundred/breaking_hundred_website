-- CreateTable
CREATE TABLE "StageChange" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "fromStatus" "MemberStatus" NOT NULL,
    "toStatus" "MemberStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageChange_memberId_idx" ON "StageChange"("memberId");

-- AddForeignKey
ALTER TABLE "StageChange" ADD CONSTRAINT "StageChange_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
