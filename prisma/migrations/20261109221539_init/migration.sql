-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('eoi_registered', 'payment_open', 'paid', 'invited', 'joined_network', 'in_circle', 'academy_complete', 'lapsed');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'payment_failed', 'cancelling', 'cancelled');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailConsent" BOOLEAN NOT NULL DEFAULT false,
    "eoiSubmittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MemberStatus" NOT NULL DEFAULT 'eoi_registered',
    "priceTier" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus",
    "failedPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "paymentOpenedAt" TIMESTAMP(3),
    "mnInvitedAt" TIMESTAMP(3),
    "mnJoinedAt" TIMESTAMP(3),
    "mnUserId" TEXT,
    "mnEmail" TEXT,
    "spacesAddedAt" TIMESTAMP(3),
    "welcomedAt" TIMESTAMP(3),
    "academyProgressPct" INTEGER NOT NULL DEFAULT 0,
    "academyProgressAt" TIMESTAMP(3),
    "lastMilestoneSent" INTEGER NOT NULL DEFAULT 0,
    "paymentReminders" INTEGER NOT NULL DEFAULT 0,
    "joinReminders" INTEGER NOT NULL DEFAULT 0,
    "startNudges" INTEGER NOT NULL DEFAULT 0,
    "progressNudges" INTEGER NOT NULL DEFAULT 0,
    "progressNudgedAt" TIMESTAMP(3),
    "renewalReminders" INTEGER NOT NULL DEFAULT 0,
    "followUpFlag" BOOLEAN NOT NULL DEFAULT false,
    "followUpReason" TEXT,
    "contributorTrack" TEXT,
    "contributorNote" TEXT,
    "contributorAt" TIMESTAMP(3),
    "mentorMatched" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "templateId" TEXT NOT NULL,
    "sendKey" TEXT NOT NULL DEFAULT '',
    "toEmail" TEXT NOT NULL,
    "resendId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MightyEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MightyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "result" JSONB,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_paymentReference_key" ON "Member"("paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "Member_stripeCustomerId_key" ON "Member"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_stripeSubscriptionId_key" ON "Member"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_mnEmail_key" ON "Member"("mnEmail");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "EmailLog_templateId_idx" ON "EmailLog"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_memberId_templateId_sendKey_key" ON "EmailLog"("memberId", "templateId", "sendKey");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
