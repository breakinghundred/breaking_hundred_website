import "server-only";
import type { Member } from "@/generated/prisma/client";
import { formatDate, formatMoney, formatTime, renewalDateFor } from "../dates";
import { siteUrl } from "../env";
import { onboardingCallAt, type Settings } from "../settings";
import { makeToken } from "../token";
import type { Vars } from "./templates";

export function links(memberId: string) {
  const base = siteUrl();
  return {
    payment_link: `${base}/join?t=${makeToken(memberId, "join")}`,
    manage_billing_link: `${base}/billing?t=${makeToken(memberId, "billing")}`,
    contributor_form_link: `${base}/contribute?t=${makeToken(memberId, "contribute")}`,
  };
}

/** Every merge field a template can use, for one member. */
export function memberVars(member: Member, settings: Settings, now = new Date()): Vars {
  const call = onboardingCallAt(settings);
  const callFuture = call && call > now;
  const callDate = call ? formatDate(call) : "";
  let callLine = "";
  if (callFuture) {
    callLine = `Add our onboarding call to your diary: ${callDate}, ${settings.onboarding_call_link}`.replace(/, $/, "");
  } else if (call && settings.recording_link) {
    callLine = `Watch the onboarding call recording: ${settings.recording_link}`;
  }

  return {
    ...settings,
    ...links(member.id),
    first_name: member.firstName,
    last_name: member.lastName,
    email: member.email,
    renewal_date: formatDate(member.renewalDate ?? renewalDateFor(now)),
    amount: formatMoney(member.amount, member.currency ?? "gbp"),
    currency: (member.currency ?? "gbp").toUpperCase(),
    payment_reference: member.paymentReference ?? "",
    paid_at: formatDate(member.paidAt),
    onboarding_call_date: callDate,
    onboarding_call_time: call ? formatTime(call) : "",
    onboarding_call_date_or_tbc: callDate || "date to be confirmed shortly",
    timezone: "UK time",
    onboarding_call_line: callLine,
    academy_progress_pct: String(member.academyProgressPct),
    access_end_date: formatDate(member.renewalDate),
  };
}
