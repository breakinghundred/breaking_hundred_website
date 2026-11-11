/** Plain-English wording for the admin dashboard. Keep codes out of what the team sees. */
import type { MemberStatus } from "@/generated/prisma/client";

export type Tone = "grey" | "blue" | "amber" | "green" | "plum" | "red";

export const STAGES: Record<MemberStatus, { label: string; help: string; tone: Tone }> = {
  eoi_registered: { label: "Interested", help: "Registered interest. Waiting for her payment link.", tone: "grey" },
  payment_open: { label: "Payment link sent", help: "Has her payment link but has not paid yet.", tone: "blue" },
  paid: { label: "Paid", help: "Payment received. Her platform invite is on its way.", tone: "green" },
  invited: { label: "Invited to platform", help: "Invited to Mighty Networks. Waiting for her to join.", tone: "blue" },
  joined_network: { label: "Needs spaces", help: "Joined Mighty Networks. Add her to the private spaces.", tone: "amber" },
  in_circle: { label: "Active member", help: "In The Circle with full access.", tone: "green" },
  academy_complete: { label: "Academy complete", help: "Finished every Academy masterclass.", tone: "plum" },
  lapsed: { label: "Membership ended", help: "Cancelled or did not renew. Access removed.", tone: "red" },
};

export const STAGE_ORDER = Object.keys(STAGES) as MemberStatus[];

export const ALERT_TITLES: Record<string, string> = {
  A1: "Someone joined Mighty Networks but we could not match them to a payment",
  A2: "A payment came in for someone we do not recognise",
  A3: "New contributor sign-up",
  A4: "Remove a former member's access on Mighty Networks",
};

/** Swap any status codes inside system-written text for their plain names. */
export function plain(text: string) {
  return text.replace(/"?\b(eoi_registered|payment_open|paid|invited|joined_network|in_circle|academy_complete|lapsed)\b"?/g, (m, code: MemberStatus) =>
    m.includes('"') ? `"${STAGES[code].label}"` : m,
  );
}

const BILLING: Record<string, string> = {
  active: "Paid up",
  cancelling: "Cancelling at renewal",
  payment_failed: "Renewal payment failed",
  cancelled: "Cancelled",
};
export const billingLabel = (s: string | null) => (s ? (BILLING[s] ?? s.replace(/_/g, " ")) : "");

/** The payment changes the team can make by hand, and the email each one sends her. */
export const PAYMENT_CHANGES = {
  paid: { label: "Paid (record a payment made outside the website)", email: "a payment confirmation and her platform invite" },
  unpaid: { label: "Not paid", email: "an email saying her payment has not been received, with her payment link" },
  up_to_date: { label: "Payments up to date", email: "an email saying her payments are up to date" },
  failed: { label: "Renewal payment failed", email: "an email asking her to update her payment details" },
  ended: { label: "Membership ended (removes her access)", email: "an email saying her membership has ended" },
} as const;
