import "server-only";
import { Resend } from "resend";
import type { Member } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { optionalEnv } from "../env";
import { getSettings } from "../settings";
import { renderHtml, renderText } from "./render";
import { compile } from "./source";
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

type Raw = { to: string; subject: string; blocks: Block[]; scheduledAt?: Date; idempotencyKey?: string };

/** Low-level send. Without RESEND_API_KEY in development, prints the email instead. */
async function deliver({ to, subject, blocks, scheduledAt, idempotencyKey }: Raw): Promise<string | null> {
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
      html: renderHtml(blocks),
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
      scheduledAt: opts.scheduledAt,
      idempotencyKey: `${member.id}:${templateId}:${sendKey}`.slice(0, 256),
    });
    await db().emailLog.update({ where: { id: logId }, data: { resendId } });
    return true;
  } catch (e) {
    // Release the claim so a retry can send it.
    await db().emailLog.delete({ where: { id: logId } }).catch(() => {});
    throw e;
  }
}

/** Test send of a template from /admin, with sample values. Not logged. */
export async function sendPreview(to: string, subject: string, blocks: Block[]) {
  await deliver({ to, subject: `[Test] ${subject}`, blocks });
}

/** Plain email to the team inbox (alerts A1–A4). */
export async function sendTeamEmail(to: string, subject: string, lines: string[]) {
  await deliver({ to, subject, blocks: lines });
}
