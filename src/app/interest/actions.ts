"use server";

import { checkBotId } from "botid/server";
import { z } from "zod";
import { registerInterest } from "@/lib/members";
import { allow, clientKey } from "@/lib/rate-limit";

export type InterestState = { ok?: boolean; error?: string; firstName?: string };

const schema = z.object({
  firstName: z.string().trim().min(1, "Please add your first name").max(100),
  lastName: z.string().trim().min(1, "Please add your last name").max(100),
  email: z.email("Please enter a valid email address").max(254),
  consent: z.literal("on", { error: "Please tick the box to receive Circle emails" }),
});

/** People take longer than this to type a name and email. */
const MIN_FILL_MS = 2500;

/**
 * Bot defences, cheapest first:
 * 1. honeypot field, 2. minimum time to fill, 3. Vercel BotID, 4. per-IP rate limit.
 * Bots get a fake success so they learn nothing; nothing is stored or emailed.
 */
export async function submitInterest(_prev: InterestState, formData: FormData): Promise<InterestState> {
  const fakeOk: InterestState = { ok: true };

  if (formData.get("company")) return fakeOk;

  const startedAt = Number(formData.get("startedAt"));
  if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) return fakeOk;

  const verdict = await checkBotId();
  if (verdict.isBot) return fakeOk;

  if (!(await allow(await clientKey("interest"), 5, 10 * 60 * 1000))) {
    return { error: "Too many attempts from this connection. Please wait a few minutes and try again." };
  }

  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: String(formData.get("email") ?? "").trim(),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };

  try {
    await registerInterest({ ...parsed.data, consent: true });
  } catch (e) {
    console.error("registerInterest failed", e);
    return { error: "Something went wrong. Please try again, or email admin@breakinghundred.org." };
  }
  return { ok: true, firstName: parsed.data.firstName };
}
