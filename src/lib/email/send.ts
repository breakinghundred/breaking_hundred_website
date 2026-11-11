import "server-only";
import { Resend } from "resend";
import type { Member } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { optionalEnv } from "../env";
import { getSettings } from "../settings";
import { automatedLogos, logosById } from "./logos";
import { renderHtml, renderText, type LogoRef } from "./render";
import { compile, type Source } from "./source";
import { getSource } from "./store";
import type { TemplateId, Vars, Block } from "./templates";
import { memberVars } from "./vars";

let client: Resend | null = null;
function resend() {
  const key = optionalEnv("RESEND_API_KEY");
  if (!key) return null;
  return (client ??= new Resend(key));
}

const FROM = () => optionalEnv("EMAIL_FROM") ?? "Breaking Hundred <circle@breakinghundred.org>";
const REPLY_TO = () => optionalEnv("EMAIL_REPLY_TO") ?? "admin@breakinghundred.org";

type Raw = { to: string; subject: string; blocks: Block[]; logos?: LogoRef[]; scheduledAt?: Date; idempotencyKey?: string };

/** Low-level send. Without RESEND_API_KEY in development, prints the email instead. */
async function deliver({ to, subject, blocks, logos = [], scheduledAt, idempotencyKey }: Raw): Promise<string | null> {
  const r = resend();
  if (!r) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.info(`\n[email:dev] to=${to}${scheduledAt ? ` at=${scheduledAt.toISOString()}` : ""}\nSubject: ${subject}\n\n${renderText(blocks)}\n`);
    return null;
  }
  const { data, error } = await r.emails.send(
    {
      from: FROM(),
      to,
      replyTo: REPLY_TO(),
      subject,
      html: renderHtml(blocks, logos),
      text: renderText(blocks),
      ...(scheduledAt && scheduledAt.getTime() > Date.now() + 30_000 ? { scheduledAt: scheduledAt.toISOString() } : {}),
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  if (error) throw new Error(`Resend: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Send one catalogue email to a member, at most once per (template, sendKey).
 * The email_log row is claimed first, so a repeated webhook or job run is a no-op.
 * Returns false when it had already been sent.
 */
export async function sendMemberEmail(
  member: Member,
  templateId: TemplateId,
  opts: { sendKey?: string; vars?: Vars; scheduledAt?: Date } = {},
): Promise<boolean> {
  const sendKey = opts.sendKey ?? "";
  let logId: string;
  try {
    const row = await db().emailLog.create({
      data: { memberId: member.id, templateId, sendKey, toEmail: member.email, scheduledAt: opts.scheduledAt },
    });
    logId = row.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }

  try {
    const settings = await getSettings();
    const vars = { ...memberVars(member, settings), ...opts.vars };
    const { subject, blocks } = compile(await getSource(templateId), vars);
    const resendId = await deliver({
      to: member.email,
      subject,
      blocks,
      logos: await automatedLogos(),
      scheduledAt: opts.scheduledAt,
      idempotencyKey: `${member.id}:${templateId}:${sendKey}`.slice(0, 256),
    });
    await db().emailLog.update({ where: { id: logId }, data: { resendId, subject } });
    return true;
  } catch (e) {
    // Release the claim so a retry can send it.
    await db().emailLog.delete({ where: { id: logId } }).catch(() => {});
    throw e;
  }
}

/** Test send of a template from /admin, with sample values. Not logged. */
export async function sendPreview(to: string, subject: string, blocks: Block[], logos?: LogoRef[]) {
  await deliver({ to, subject: `[Test] ${subject}`, blocks, logos: logos ?? (await automatedLogos()) });
}

/**
 * Send several test emails in one request (Resend batch, up to 100), so a full set
 * doesn't hit the per-second rate limit. Not logged. Returns false when email isn't
 * set up and the emails were printed to the server log instead (development only).
 */
export async function sendPreviews(to: string, emails: { subject: string; blocks: Block[] }[]): Promise<boolean> {
  const r = resend();
  const logos = await automatedLogos();
  if (!r) {
    for (const e of emails) await deliver({ to, subject: `[Test] ${e.subject}`, blocks: e.blocks, logos });
    return false;
  }
  for (let i = 0; i < emails.length; i += 100) {
    const { error } = await r.batch.send(
      emails.slice(i, i + 100).map((e) => ({
        from: FROM(),
        to,
        replyTo: REPLY_TO(),
        subject: `[Test] ${e.subject}`,
        html: renderHtml(e.blocks, logos),
        text: renderText(e.blocks),
      })),
    );
    if (error) throw new Error(`Resend: ${error.message}`);
  }
  return true;
}

/** EmailLog.templateId for emails written by the team. */
export const CUSTOM_EMAIL = "custom";

/**
 * Send a team-written email to each member, filled with her own details.
 * Each send is logged against the member (templateId "custom"). Sent in Resend
 * batches of 100, so a large group doesn't hit the rate limit.
 */
export async function sendCustomEmail(
  members: Member[],
  source: Source,
  opts: { logoIds: string[]; sendKey: string },
): Promise<{ sent: number; skipped: number }> {
  if (!members.length) return { sent: 0, skipped: 0 };
  const [settings, logos] = await Promise.all([getSettings(), logosById(opts.logoIds)]);
  const r = resend();
  if (!r && process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
  let sent = 0;
  let skipped = 0;

  for (let i = 0; i < members.length; i += 100) {
    const chunk = members.slice(i, i + 100);
    // Claim a log row per member first, so a repeated press never sends twice.
    const claimed: { member: Member; logId: string; subject: string; blocks: Block[] }[] = [];
    for (const member of chunk) {
      const { subject, blocks } = compile(source, memberVars(member, settings));
      try {
        const row = await db().emailLog.create({
          data: { memberId: member.id, templateId: CUSTOM_EMAIL, sendKey: opts.sendKey, toEmail: member.email, subject },
        });
        claimed.push({ member, logId: row.id, subject, blocks });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          skipped++;
          continue;
        }
        throw e;
      }
    }
    if (!claimed.length) continue;

    try {
      if (!r) {
        for (const c of claimed) await deliver({ to: c.member.email, subject: c.subject, blocks: c.blocks, logos });
      } else {
        const { data, error } = await r.batch.send(
          claimed.map((c) => ({
            from: FROM(),
            to: c.member.email,
            replyTo: REPLY_TO(),
            subject: c.subject,
            html: renderHtml(c.blocks, logos),
            text: renderText(c.blocks),
          })),
          { idempotencyKey: `${opts.sendKey}:${i}`.slice(0, 256) },
        );
        if (error) throw new Error(`Resend: ${error.message}`);
        await Promise.all(
          claimed.map((c, n) => (data?.data[n]?.id ? db().emailLog.update({ where: { id: c.logId }, data: { resendId: data.data[n].id } }) : null)),
        );
      }
      sent += claimed.length;
    } catch (e) {
      // Release the claims so the send can be tried again.
      await db().emailLog.deleteMany({ where: { id: { in: claimed.map((c) => c.logId) } } }).catch(() => {});
      if (sent) throw new Error(`${sent} sent, then it stopped: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }
  return { sent, skipped };
}

/** Who test and team emails come from, for showing in /admin. */
export const senderDetails = () => ({ from: FROM(), replyTo: REPLY_TO(), configured: !!optionalEnv("RESEND_API_KEY") });

/** Plain email to the team inbox (alerts A1–A4). */
export async function sendTeamEmail(to: string, subject: string, lines: string[]) {
  await deliver({ to, subject, blocks: lines });
}
