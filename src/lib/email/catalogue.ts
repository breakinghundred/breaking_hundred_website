/**
 * Metadata for the editable email catalogue (pure; shared by server and admin preview).
 * The code templates in ./templates.ts are the defaults; edits are stored in the
 * EmailTemplate table and override them.
 */
import { fieldsIn, serialize, type Source } from "./source";
import { templates, type TemplateId, type Vars } from "./templates";

export const TEMPLATE_IDS = Object.keys(templates) as TemplateId[];

export const TEMPLATE_INFO: Record<TemplateId, { name: string; trigger: string; extra?: string[] }> = {
  C01: { name: "Your place in The Circle", trigger: "Interest form submitted, immediately" },
  C02: { name: "Membership is now open", trigger: "Admin runs Open payments" },
  C03: { name: "Your place is waiting", trigger: "Still unpaid 3 and 7 days after C02" },
  C04: { name: "Payment confirmed", trigger: "Verified Stripe payment, immediately" },
  C05: { name: "Join The Circle on Mighty Networks", trigger: "5 minutes after C04" },
  C06: { name: "Reminder: join the platform", trigger: "Not joined 48 hours and 5 days after C05" },
  C07: { name: "Welcome to The Circle", trigger: "Added to her spaces, immediately" },
  C08: { name: "Finding your way around", trigger: "24 hours after C07" },
  C09: { name: "Your onboarding call", trigger: "7 days and 24 hours before the call" },
  C10: { name: "Ready to start?", trigger: "Academy still at 0%, 5 days after C07" },
  C11: { name: "Academy milestone", trigger: "Progress crosses 33% or 67%", extra: ["milestone_label", "masterclasses_done"] },
  C12: { name: "Academy complete", trigger: "Progress reaches 100%" },
  C13: { name: "Pick up where you left off", trigger: "No progress for 21 days, maximum 2" },
  C14: { name: "Give back through The Circle", trigger: "90 days after C07, no contributor track yet" },
  C15: { name: "Your membership renews soon", trigger: "30 and 7 days before renewal" },
  C16: { name: "Renewal payment did not go through", trigger: "Each failed renewal attempt", extra: ["retry_line"] },
  C17: { name: "Cancellation confirmed", trigger: "Member cancels in the billing portal" },
  C18: { name: "Membership has renewed", trigger: "Paid renewal (provisional wording)" },
};

/** Merge fields available in every email, with what they contain. */
export const MERGE_FIELDS: Record<string, string> = {
  first_name: "Member's first name",
  last_name: "Member's last name",
  email: "Member's email address",
  payment_link: "Her personal payment page",
  manage_billing_link: "Her personal billing link (cancel or update card)",
  contributor_form_link: "Her personal contributor form",
  renewal_date: "Next renewal date",
  access_end_date: "Date her access ends (renewal date)",
  amount: "Amount paid, e.g. £299.00",
  currency: "Currency, e.g. GBP",
  payment_reference: "Stripe payment reference",
  paid_at: "Date she paid",
  academy_progress_pct: "Academy progress, number only",
  onboarding_call_date: "Onboarding call date",
  onboarding_call_time: "Onboarding call time",
  onboarding_call_date_or_tbc: 'Call date, or "date to be confirmed shortly"',
  onboarding_call_line: "Diary line before the call, recording link after it",
  onboarding_call_link: "Onboarding call joining link",
  calendar_link: "Onboarding call calendar link",
  recording_link: "Onboarding call recording link",
  timezone: '"UK time"',
  network_url: "Mighty Networks URL",
  network_invite_link: "Mighty Networks invite link",
  start_here_space_url: "Start Here space URL",
  academy_space_url: "Academy space URL",
  monthly_live_url: "Monthly Live space URL",
  ios_app_link: "App Store link",
  android_app_link: "Google Play link",
};

export const EXTRA_FIELD_INFO: Record<string, string> = {
  milestone_label: '"one third" or "two thirds"',
  masterclasses_done: '"3" or "6"',
  retry_line: "Next retry date, or the final notice on the last attempt",
};

export function allowedFields(id: TemplateId) {
  return [...Object.keys(MERGE_FIELDS), ...(TEMPLATE_INFO[id].extra ?? [])];
}

/** Example values for the admin preview and test sends. */
export const SAMPLE_VARS: Vars = {
  first_name: "Ada",
  last_name: "Okafor",
  email: "ada@example.com",
  payment_link: "https://breakinghundred.org/join?t=example",
  manage_billing_link: "https://breakinghundred.org/billing?t=example",
  contributor_form_link: "https://breakinghundred.org/contribute?t=example",
  renewal_date: "18 December 2027",
  access_end_date: "18 December 2027",
  amount: "£299.00",
  currency: "GBP",
  payment_reference: "BH-0001",
  paid_at: "21 November 2026",
  academy_progress_pct: "44",
  onboarding_call_date: "10 December 2026",
  onboarding_call_time: "6:30 pm",
  onboarding_call_date_or_tbc: "10 December 2026",
  onboarding_call_line: "Add our onboarding call to your diary: 10 December 2026, https://zoom.us/j/example",
  onboarding_call_link: "https://zoom.us/j/example",
  calendar_link: "https://calendar.example.com/circle-onboarding",
  recording_link: "",
  timezone: "UK time",
  network_url: "https://thecircle.mn.co",
  network_invite_link: "https://thecircle.mn.co/invite/example",
  start_here_space_url: "https://thecircle.mn.co/spaces/start-here",
  academy_space_url: "https://thecircle.mn.co/spaces/academy",
  monthly_live_url: "https://thecircle.mn.co/spaces/monthly-live",
  ios_app_link: "https://apps.apple.com/app/mighty-networks/id1081683081",
  android_app_link: "https://play.google.com/store/apps/details?id=com.mightybell.mb",
  milestone_label: "one third",
  masterclasses_done: "3",
  retry_line: "We will try the payment again on 25 December 2027.",
};

/** The built-in wording, written in the editable format with {{fields}} left in place. */
export function defaultSource(id: TemplateId): Source {
  const placeholders = new Proxy({} as Vars, { get: (_, key) => `{{${String(key)}}}` });
  const { subject, blocks } = templates[id](placeholders);
  return { subject, body: serialize(blocks) };
}

/** Problems that would make an email go out wrong. Empty array = safe to save. */
export function validate(id: TemplateId, source: Source): string[] {
  const errors: string[] = [];
  if (!source.subject.trim()) errors.push("The subject is empty.");
  if (!source.body.trim()) errors.push("The email body is empty.");
  if (source.subject.length > 200) errors.push("The subject is longer than 200 characters.");
  const allowed = new Set(allowedFields(id));
  const unknown = fieldsIn(`${source.subject}\n${source.body}`).filter((f) => !allowed.has(f));
  if (unknown.length) errors.push(`Unknown merge field${unknown.length > 1 ? "s" : ""}: ${unknown.map((f) => `{{${f}}}`).join(", ")}. Check the spelling against the list.`);
  const braces = `${source.subject}${source.body}`.replace(/\{\{\s*[a-z0-9_]+\s*\}\}/gi, "");
  if (/\{\{|\}\}/.test(braces)) errors.push("There is an unfinished merge field: every {{ needs a matching }}.");
  return errors;
}
