import "server-only";
import { Prisma, type Member, type MemberStatus } from "@/generated/prisma/client";
import { raiseAlert } from "./alerts";
import { db } from "./db";
import { DAY, renewalDateFor } from "./dates";
import { sendMemberEmail } from "./email/send";
import {
  addToPrivateSpaces,
  findMemberByEmail,
  mightyConfigured,
  removeFromPrivateSpaces,
} from "./mighty";

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Stay under Resend's default rate limit when sending in bulk. */
export const throttle = () => sleep(550);

/* ---------- Stage 1: interest ---------- */

/** "Mary Ann Okafor" → first "Mary", last "Ann Okafor". Emails greet her by first name. */
export function splitName(fullName: string) {
  const [firstName = "", ...rest] = fullName.trim().replace(/\s+/g, " ").split(" ");
  return { firstName, lastName: rest.join(" ") };
}

export async function registerInterest(input: {
  firstName: string;
  lastName: string;
  email: string;
  consent: boolean;
  phone?: string;
  country?: string;
}) {
  const email = normaliseEmail(input.email);
  const details = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    emailConsent: input.consent,
    ...(input.phone ? { phone: input.phone.trim() } : {}),
    ...(input.country ? { country: input.country } : {}),
  };
  const member = await db().member.upsert({
    where: { email },
    create: { email, ...details },
    // A repeat submission updates the record; it never moves her status back.
    update: details,
  });
  await sendMemberEmail(member, "C01");
  return member;
}

/** Import the existing interest list. Emails are lower-cased and duplicates merged. No email is sent. */
export async function importInterest(rows: { firstName: string; lastName: string; email: string }[]) {
  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const email = normaliseEmail(r.email);
    if (!email.includes("@")) continue;
    const existing = await db().member.findUnique({ where: { email } });
    if (existing) {
      await db().member.update({
        where: { email },
        data: { firstName: existing.firstName || r.firstName, lastName: existing.lastName || r.lastName },
      });
      updated++;
    } else {
      await db().member.create({ data: { email, firstName: r.firstName, lastName: r.lastName, emailConsent: true } });
      created++;
    }
  }
  return { created, updated };
}

/* ---------- Stage 2: Open payments ---------- */

/** Moves eoi_registered → payment_open and sends C02. Processes a batch; run again until 0 remain. */
export async function openPayments(limit = 200) {
  const batch = await db().member.findMany({ where: { status: "eoi_registered" }, take: limit, orderBy: { createdAt: "asc" } });
  let sent = 0;
  for (const m of batch) {
    // Send first (idempotent), then move status, so a failure never leaves her open without C02.
    if (await sendMemberEmail(m, "C02")) {
      sent++;
      await throttle();
    }
    await db().member.update({ where: { id: m.id }, data: { status: "payment_open", paymentOpenedAt: new Date() } });
  }
  const remaining = await db().member.count({ where: { status: "eoi_registered" } });
  return { processed: batch.length, sent, remaining };
}

/* ---------- Stage 3 → 4: after a verified payment ---------- */

/**
 * C04 now, C05 five minutes later; status moves paid → invited.
 * `sendKey` is only set for a payment the team records by hand, so a second recorded payment still gets its emails.
 */
export async function afterPayment(member: Member, sendKey = "") {
  await sendMemberEmail(member, "C04", { sendKey });
  const inviteAt = new Date(Date.now() + 5 * 60 * 1000);
  await sendMemberEmail(member, "C05", { sendKey, scheduledAt: inviteAt });
  await db().member.updateMany({
    where: { id: member.id, status: "paid" },
    data: { status: "invited", mnInvitedAt: inviteAt },
  });
}

/* ---------- Payment status changed by the team in /admin ---------- */

export type PaymentChange = "paid" | "unpaid" | "up_to_date" | "failed" | "ended";

const NOT_PAID: MemberStatus[] = ["eoi_registered", "payment_open", "lapsed"];
/** Paid but not yet in her spaces: can still be set back to not paid without removing access. */
const PAID_NOT_IN: MemberStatus[] = ["paid", "invited"];

/** Which payment changes make sense for a member at this stage. */
export function paymentChangesFor(status: MemberStatus): PaymentChange[] {
  if (NOT_PAID.includes(status)) return status === "payment_open" ? ["paid"] : ["paid", "unpaid"];
  const options: PaymentChange[] = ["up_to_date", "failed", "ended"];
  return PAID_NOT_IN.includes(status) ? ["unpaid", ...options] : options;
}

/**
 * The team changes a member's payment status by hand (e.g. she paid by bank transfer).
 * Every change emails her. This updates our records only: it never charges or refunds in Stripe.
 */
export async function changePaymentStatus(
  memberId: string,
  change: PaymentChange,
  opts: { amountPence?: number; reference?: string } = {},
) {
  const member = await db().member.findUniqueOrThrow({ where: { id: memberId } });
  if (!paymentChangesFor(member.status).includes(change)) {
    throw new Error("Please refresh the page: that change does not apply to her any more.");
  }
  // A fresh key per change, so the email always goes even if she had it before.
  const sendKey = `admin-${Date.now()}`;
  const now = new Date();

  switch (change) {
    case "paid": {
      const reference = opts.reference?.trim() || `MANUAL-${now.getTime().toString(36).toUpperCase()}`;
      let updated: Member;
      try {
        updated = await db().member.update({
          where: { id: member.id },
          data: {
            status: "paid",
            paidAt: now,
            amount: opts.amountPence ?? 29900,
            currency: "gbp",
            priceTier: "manual",
            paymentReference: reference,
            renewalDate: renewalDateFor(now),
            subscriptionStatus: "active",
            failedPaymentCount: 0,
            followUpFlag: false,
            followUpReason: null,
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          throw new Error("Please use a different payment reference: that one is already recorded for someone else.");
        }
        throw e;
      }
      await afterPayment(updated, sendKey);
      return;
    }
    case "unpaid": {
      const updated = await db().member.update({
        where: { id: member.id },
        data: {
          status: "payment_open",
          paymentOpenedAt: member.paymentOpenedAt ?? now,
          paidAt: null,
          amount: null,
          currency: null,
          priceTier: null,
          paymentReference: null,
          renewalDate: null,
          subscriptionStatus: null,
          failedPaymentCount: 0,
          mnInvitedAt: null,
        },
      });
      await sendMemberEmail(updated, "C19", { sendKey });
      return;
    }
    case "up_to_date": {
      const updated = await db().member.update({
        where: { id: member.id },
        data: { subscriptionStatus: "active", failedPaymentCount: 0 },
      });
      await sendMemberEmail(updated, "C20", { sendKey });
      return;
    }
    case "failed": {
      const updated = await db().member.update({ where: { id: member.id }, data: { subscriptionStatus: "payment_failed" } });
      await sendMemberEmail(updated, "C16", {
        sendKey,
        vars: { retry_line: "Please update your details as soon as you can so your access continues." },
      });
      return;
    }
    case "ended": {
      await endMembership(member);
      await sendMemberEmail({ ...member, status: "lapsed", subscriptionStatus: "cancelled" }, "C21", { sendKey });
      return;
    }
  }
}

/* ---------- Stage 5 + 6: joined Start Here → spaces ---------- */

const PAID_STATES = ["paid", "invited"] as const;

export async function findByAnyEmail(email: string) {
  const e = normaliseEmail(email);
  return db().member.findFirst({ where: { OR: [{ email: e }, { mnEmail: e }] } });
}

/** Z1: she joined Start Here on Mighty Networks. */
export async function handleJoinedStartHere(input: { email: string; name?: string; mnUserId?: string }) {
  const member = await findByAnyEmail(input.email);

  if (!member || !(PAID_STATES as readonly string[]).includes(member.status)) {
    if (member && ["joined_network", "in_circle", "academy_complete"].includes(member.status)) {
      return { result: "already-joined" as const };
    }
    await raiseAlert(
      "A1",
      member
        ? `${input.email} joined Start Here but her record is at "${member.status}" (not paid). No spaces were added.`
        : `${input.email} joined Start Here but matches no member. No spaces were added. Link her by hand in /admin.`,
      { name: input.name ?? "", email: input.email, mighty_user_id: input.mnUserId ?? "" },
    );
    return { result: "alerted" as const };
  }

  const claimed = await db().member.updateMany({
    where: { id: member.id, status: { in: [...PAID_STATES] } },
    data: { status: "joined_network", mnJoinedAt: new Date(), mnUserId: input.mnUserId ?? member.mnUserId },
  });
  if (claimed.count === 0) return { result: "already-joined" as const };

  return grantSpaces(member.id);
}

/**
 * Z1 second half: add her to the five private spaces, set in_circle, send C07 now and C08 in 24 hours.
 * Without the Admin API configured (or if the call fails) she stays at joined_network and the team is
 * alerted to add her by hand, then presses "Spaces added" in /admin, which calls completeSpaces().
 */
export async function grantSpaces(memberId: string) {
  const member = await db().member.findUniqueOrThrow({ where: { id: memberId } });
  if (member.status !== "joined_network") return { result: "skipped" as const };

  if (!mightyConfigured()) {
    await raiseAlert("A1", `${member.email} joined Start Here. Add her to the five private spaces by hand, then press "Spaces added" in /admin.`, {
      name: `${member.firstName} ${member.lastName}`,
      email: member.email,
    });
    return { result: "manual" as const };
  }

  try {
    let userId = member.mnUserId;
    if (!userId) {
      const found = await findMemberByEmail(member.mnEmail ?? member.email);
      if (!found) throw new Error("Not found on Mighty Networks by email");
      userId = String(found.id);
      await db().member.update({ where: { id: member.id }, data: { mnUserId: userId } });
    }
    await addToPrivateSpaces(userId);
  } catch (e) {
    await raiseAlert("A1", `Could not add ${member.email} to her spaces automatically. Add her by hand, then press "Spaces added" in /admin.`, {
      email: member.email,
      error: e instanceof Error ? e.message : String(e),
    });
    return { result: "manual" as const };
  }

  return completeSpaces(member.id);
}

export async function completeSpaces(memberId: string) {
  const now = new Date();
  const moved = await db().member.updateMany({
    where: { id: memberId, status: "joined_network" },
    data: { status: "in_circle", spacesAddedAt: now, welcomedAt: now },
  });
  if (moved.count === 0) return { result: "skipped" as const };
  const member = await db().member.findUniqueOrThrow({ where: { id: memberId } });
  await sendMemberEmail(member, "C07");
  await sendMemberEmail(member, "C08", { scheduledAt: new Date(now.getTime() + DAY) });
  return { result: "in_circle" as const };
}

/* ---------- Stage 7: Academy progress (Z2) ---------- */

const MILESTONES = [
  { pct: 33, label: "one third", done: "3" },
  { pct: 67, label: "two thirds", done: "6" },
];

export async function handleCourseProgress(email: string, pct: number) {
  const member = await findByAnyEmail(email);
  if (!member || !["in_circle", "academy_complete"].includes(member.status)) return { result: "ignored" as const };
  const progress = Math.max(0, Math.min(100, Math.round(pct)));
  const changed = progress !== member.academyProgressPct;

  await db().member.update({
    where: { id: member.id },
    data: { academyProgressPct: progress, ...(changed ? { academyProgressAt: new Date() } : {}) },
  });

  if (progress >= 100 && member.lastMilestoneSent < 100) {
    await sendMemberEmail(member, "C12");
    await db().member.update({ where: { id: member.id }, data: { status: "academy_complete", lastMilestoneSent: 100 } });
    return { result: "complete" as const };
  }

  // If she jumps past both thresholds at once, send only the higher milestone.
  const crossed = [...MILESTONES].reverse().find((m) => progress >= m.pct && member.lastMilestoneSent < m.pct);
  if (crossed) {
    await sendMemberEmail(member, "C11", {
      sendKey: String(crossed.pct),
      vars: { milestone_label: crossed.label, masterclasses_done: crossed.done },
    });
    await db().member.update({ where: { id: member.id }, data: { lastMilestoneSent: crossed.pct } });
    return { result: "milestone" as const };
  }
  return { result: "updated" as const };
}

/* ---------- Stage 9: membership ended (Z3) ---------- */

export async function endMembership(member: Member) {
  await db().member.update({ where: { id: member.id }, data: { status: "lapsed", subscriptionStatus: "cancelled" } });

  if (!mightyConfigured()) {
    await raiseAlert("A4", `${member.email}'s membership has ended. Remove her from the five private spaces by hand.`, { email: member.email });
    return;
  }
  try {
    let userId = member.mnUserId;
    if (!userId) {
      const found = await findMemberByEmail(member.mnEmail ?? member.email);
      if (!found) throw new Error("Not found on Mighty Networks by email");
      userId = String(found.id);
    }
    await removeFromPrivateSpaces(userId);
  } catch (e) {
    await raiseAlert("A4", `${member.email}'s membership has ended but her access could not be removed automatically. Remove her by hand.`, {
      email: member.email,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
