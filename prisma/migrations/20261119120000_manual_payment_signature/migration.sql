-- CreateTable
CREATE TABLE "ManualPayment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "reference" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffEmail" TEXT NOT NULL,
    "signedName" TEXT NOT NULL,
    "signature" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualPayment_memberId_idx" ON "ManualPayment"("memberId");

-- AddForeignKey
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
