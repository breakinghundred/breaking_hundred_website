import "server-only";
import type { Member } from "@/generated/prisma/client";
import { db } from "./db";
import { DAY, daysAgo, formatDate, hoursAgo } from "./dates";
import { sendMemberEmail } from "./email/send";
import { throttle } from "./members";
import { getSettings, onboardingCallAt } from "./settings";

type Counts = Record<string, number>;

/**
 * Daily scheduled jobs. Every reminder is capped by its counter, and every
 * send goes through email_log, so running twice in a day sends nothing twice.
 */
export async function runDailyJobs(now = new Date()) {
  const counts: Counts = {};
  const errors: string[] = [];
  const bump = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);

  const jobs: [string, () => Promise<void>][] = [
    ["C03 payment reminders", () => paymentReminders(now, bump)],
    ["C06 join reminders", () => joinReminders(now, bump)],
    ["C09 onboarding call", () => onboardingCall(now, bump)],
    ["C10 start nudge", () => startNudge(now, bump)],
    ["C13 progress nudge", () => progressNudge(now, bump)],
    ["C14 give back", () => giveBack(now, bump)],
    ["C15 renewal reminders", () => renewalReminders(now, bump)],
  ];
  for (const [name, job] of jobs) {
    try {
      await job();
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const result = { counts, errors };
  await db().jobRun.create({ data: { job: "daily", ok: errors.length === 0, result } });
  return result;
}

async function send(m: Member, id: Parameters<typeof sendMemberEmail>[1], opts: Parameters<typeof sendMemberEmail>[2], bump: (k: string) => void) {
  if (await sendMemberEmail(m, id, opts)) {
    bump(id);
    await throttle();
    return true;
  }
  return false;
}

/** C03 at 3 and 7 days after C02, maximum two, then follow_up_flag. */
async function paymentReminders(now: Date, bump: (k: string) => void) {
  const open = await db().member.findMany({ where: { status: "payment_open", paymentOpenedAt: { not: null } } });
  for (const m of open) {
    const opened = m.paymentOpenedAt!;
    if (m.paymentReminders === 0 && opened <= daysAgo(3, now)) {
      await send(m, "C03", { sendKey: "3d" }, bump);
      await db().member.update({ where: { id: m.id }, data: { paymentReminders: 1 } });
    } else if (m.paymentReminders === 1 && opened <= daysAgo(7, now)) {
      await send(m, "C03", { sendKey: "7d" }, bump);
      await db().member.update({ where: { id: m.id }, data: { paymentReminders: 2 } });
    } else if (m.paymentReminders >= 2 && !m.followUpFlag && opened <= daysAgo(8, now)) {
      await db().member.update({ where: { id: m.id }, data: { followUpFlag: true, followUpReason: "Not paid after two reminders" } });
      bump("flagged:payment");
    }
  }
}

/** C06 at 48 hours and 5 days after the invitation, then follow_up_flag. */
async function joinReminders(now: Date, bump: (k: string) => void) {
  const invited = await db().member.findMany({ where: { status: "invited", mnInvitedAt: { not: null } } });
  for (const m of invited) {
    const at = m.mnInvitedAt!;
    if (m.joinReminders === 0 && at <= hoursAgo(48, now)) {
      await send(m, "C06", { sendKey: "48h" }, bump);
      await db().member.update({ where: { id: m.id }, data: { joinReminders: 1 } });
    } else if (m.joinReminders === 1 && at <= daysAgo(5, now)) {
      await send(m, "C06", { sendKey: "5d" }, bump);
      await db().member.update({ where: { id: m.id }, data: { joinReminders: 2 } });
    } else if (m.joinReminders >= 2 && !m.followUpFlag && at <= daysAgo(6, now)) {
      await db().member.update({ where: { id: m.id }, data: { followUpFlag: true, followUpReason: "Not joined Mighty Networks after two reminders" } });
      bump("flagged:join");
    }
  }
}

const PAID_JOURNEY = ["paid", "invited", "joined_network", "in_circle", "academy_complete"] as const;

/** C09 to every paid member 7 days and 24 hours before the onboarding call. */
export async function onboardingCall(now: Date, bump: (k: string) => void, force?: "7d" | "24h") {
  const settings = await getSettings();
  const call = onboardingCallAt(settings);
  if (!call || call <= now) return;
  const until = call.getTime() - now.getTime();
  const key = force ?? (until <= DAY ? "24h" : until <= 7 * DAY ? "7d" : null);
  if (!key) return;
  const members = await db().member.findMany({ where: { status: { in: [...PAID_JOURNEY] } } });
  for (const m of members) await send(m, "C09", { sendKey: `${call.toISOString()}:${key}` }, bump);
}

/** C10 once, 5 days after C07, if Academy progress is still 0. */
async function startNudge(now: Date, bump: (k: string) => void) {
  const ms = await db().member.findMany({
    where: { status: "in_circle", welcomedAt: { lte: daysAgo(5, now) }, academyProgressPct: 0, startNudges: 0 },
  });
  for (const m of ms) {
    await send(m, "C10", {}, bump);
    await db().member.update({ where: { id: m.id }, data: { startNudges: 1 } });
  }
}

/** C13 when progress has not changed for 21 days and is below 100, maximum two. */
async function progressNudge(now: Date, bump: (k: string) => void) {
  const cutoff = daysAgo(21, now);
  const ms = await db().member.findMany({
    where: {
      status: "in_circle",
      academyProgressPct: { gt: 0, lt: 100 },
      academyProgressAt: { lte: cutoff },
      progressNudges: { lt: 2 },
      OR: [{ progressNudgedAt: null }, { progressNudgedAt: { lte: cutoff } }],
    },
  });
  for (const m of ms) {
    // A new nudge cycle starts if she has made progress since the last one.
    const sinceLast = m.progressNudgedAt && m.academyProgressAt! > m.progressNudgedAt;
    const n = sinceLast ? 0 : m.progressNudges;
    if (n >= 2) continue;
    await send(m, "C13", { sendKey: `${m.academyProgressAt!.toISOString()}:${n + 1}` }, bump);
    await db().member.update({ where: { id: m.id }, data: { progressNudges: n + 1, progressNudgedAt: now } });
  }
}

/** C14 90 days after C07 unless contributor_track is filled. */
async function giveBack(now: Date, bump: (k: string) => void) {
  const ms = await db().member.findMany({
    where: { status: { in: ["in_circle", "academy_complete"] }, welcomedAt: { lte: daysAgo(90, now) }, contributorTrack: null },
  });
  for (const m of ms) await send(m, "C14", {}, bump);
}

/** C15 30 and 7 days before renewal_date, to active subscriptions. */
async function renewalReminders(now: Date, bump: (k: string) => void) {
  const ms = await db().member.findMany({
    where: { subscriptionStatus: "active", renewalDate: { gt: now, lte: new Date(now.getTime() + 30 * DAY) } },
  });
  for (const m of ms) {
    const left = m.renewalDate!.getTime() - now.getTime();
    const key = left <= 7 * DAY ? "7d" : "30d";
    await send(m, "C15", { sendKey: `${formatDate(m.renewalDate)}:${key}` }, bump);
  }
}
