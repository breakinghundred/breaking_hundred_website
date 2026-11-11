"use server";

import { checkBotId } from "botid/server";
import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";
import { registerInterest, splitName } from "@/lib/members";
import { allow, clientKey } from "@/lib/rate-limit";

export type InterestValues = { fullName?: string; email?: string; phone?: string; country?: string };
export type InterestState = { ok?: boolean; error?: string; firstName?: string; values?: InterestValues };

const schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please add your full name")
    .max(200)
    .refine((v) => /\p{L}/u.test(v), "Please add your full name"),
  email: z.email("Please enter a valid email address").max(254),
  // International format is fine: +, spaces, brackets, dashes; 7 to 15 digits.
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => /^\+?[\d\s().-]+$/.test(v) && /^(\D*\d){7,15}\D*$/.test(v), "Please enter a valid phone number, including the country code"),
  country: z.string().refine((c) => COUNTRY_CODES.has(c), "Please choose your country of residence"),
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
  // Sent back so the form keeps what she typed (React resets fields after each submit).
  const values: InterestValues = {
    fullName: String(formData.get("fullName") ?? "").slice(0, 200),
    email: String(formData.get("email") ?? "").slice(0, 254),
    phone: String(formData.get("phone") ?? "").slice(0, 30),
    country: String(formData.get("country") ?? "").slice(0, 2),
  };

  if (formData.get("company")) return fakeOk;

  const startedAt = Number(formData.get("startedAt"));
  if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) return fakeOk;

  const verdict = await checkBotId();
  if (verdict.isBot) return fakeOk;

  if (!(await allow(await clientKey("interest"), 5, 10 * 60 * 1000))) {
    return { error: "Too many attempts from this connection. Please wait a few minutes and try again.", values };
  }

  const parsed = schema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? ""),
    country: String(formData.get("country") ?? ""),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form", values };

  const { firstName, lastName } = splitName(parsed.data.fullName);
  try {
    await registerInterest({
      firstName,
      lastName,
      email: parsed.data.email,
      phone: parsed.data.phone.replace(/\s+/g, " "),
      country: parsed.data.country,
      consent: true,
    });
  } catch (e) {
    console.error("registerInterest failed", e);
    return { error: "Something went wrong. Please try again, or email admin@breakinghundred.org.", values };
  }
  return { ok: true, firstName };
}
