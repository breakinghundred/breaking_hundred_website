"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPayments } from "@/lib/stripe";
import { requireAdminAction, requireStaff } from "@/lib/staff";
import { db } from "@/lib/db";
import { runDailyJobs } from "@/lib/jobs";
import { changePaymentStatus, changeStage, completeSpaces, deleteMember, resendPaymentLink, resendPaymentLinks, grantSpaces, importInterest, markJoinedPlatform, normaliseEmail, openPayments, type PaymentChange } from "@/lib/members";
import { SETTING_FIELDS, getMembershipPrice, saveSettings, type Settings } from "@/lib/settings";
import { DEFAULT_PRICE_POUNDS, formatPounds, parsePounds } from "@/lib/price-format";
import { pausedIds } from "@/lib/email/paused";
import type { TemplateId } from "@/lib/email/templates";
import { PAYMENT_CHANGE_EMAILS, STAGES } from "./labels";
import type { MemberStatus } from "@/generated/prisma/client";
import { MAX_IMPORT_BYTES, readPeopleFile, type ImportResult } from "@/lib/import-file";

export type AdminState = { message?: string; error?: string };

const SPACES_MESSAGE = {
  in_circle: "Done. She has been added to her spaces and sent her welcome email.",
  manual: "We could not add her automatically. Please add her to the five spaces on Mighty Networks, then press Spaces added.",
  skipped: "Nothing to do: she has already been added.",
} as const;

/** Runs an admin action. `adminOnly` actions are refused for the team role. */
async function guarded(fn: () => Promise<string>, adminOnly = false): Promise<AdminState> {
  await requireStaff();
  try {
    if (adminOnly) await requireAdminAction();
    const message = await fn();
    revalidatePath("/admin", "layout");
    return { message };
  } catch (e) {
    console.error("Admin action failed", e);
    // Our own messages are written for the team; anything else is a system error.
    const msg = e instanceof Error ? e.message : String(e);
    return { error: /^(Please|No email|Something)/.test(msg) ? msg : "Sorry, that did not work. Please try again, and tell your developer if it keeps happening." };
  }
}

/** Payment links are useless while Stripe can't open a checkout, so don't send them. */
async function paymentsReady() {
  const check = await checkPayments();
  if (!check.ok) {
    throw new Error("Please fix the payment set-up first: Stripe can't take payments yet, so the links wouldn't work. Open Settings, then Payments, to see what's wrong.");
  }
}

export async function openPaymentsAction(): Promise<AdminState> {
  return guarded(async () => {
    await paymentsReady();
    const r = await openPayments();
    const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
    return r.remaining
      ? `Payment links sent to ${people(r.sent)}. ${people(r.remaining)} still to go: please press the button again.`
      : `Done. Payment links sent to ${people(r.sent)}.`;
  }, true);
}

export async function resendPaymentLinksAction(): Promise<AdminState> {
  return guarded(async () => {
    await paymentsReady();
    const r = await resendPaymentLinks();
    const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
    if (!r.sent && !r.remaining) return "Everyone waiting to pay has already had their link again today.";
    return r.remaining
      ? `Payment links resent to ${people(r.sent)}. ${people(r.remaining)} still to go: please press the button again.`
      : `Done. Payment links resent to ${people(r.sent)}.`;
  });
}

export async function runJobsAction(): Promise<AdminState> {
  return guarded(async () => {
    const r = await runDailyJobs();
    const emails = Object.entries(r.counts).filter(([k]) => !k.startsWith("flagged")).reduce((n, [, v]) => n + v, 0);
    const flagged = Object.entries(r.counts).filter(([k]) => k.startsWith("flagged")).reduce((n, [, v]) => n + v, 0);
    const parts = [
      emails ? `${emails} reminder ${emails === 1 ? "email" : "emails"} sent` : "No reminders were due",
      flagged ? `${flagged} ${flagged === 1 ? "person" : "people"} added to Needs your attention` : "",
    ].filter(Boolean);
    if (r.errors.length) console.error("Daily jobs errors", r.errors);
    return `Check finished. ${parts.join(". ")}.${r.errors.length ? " Some steps had a problem; your developer can see the details in the server logs." : ""}`;
  }, true);
}

export async function importAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Please choose a CSV or Excel file to upload.");
    if (file.size > MAX_IMPORT_BYTES) throw new Error("Please upload a smaller file (up to 2 MB), or split it into two.");
    let result: ImportResult;
    try {
      result = await readPeopleFile(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      throw new Error(msg.startsWith("Please") ? msg : "Please check the file: it couldn't be read. Save it as CSV or .xlsx and try again.");
    }
    const { people, skipped } = result;
    if (!people.length) throw new Error("No email addresses found. Please check the file has a column of email addresses.");
    const r = await importInterest(people);
    const parts = [`Added ${r.created} new ${r.created === 1 ? "person" : "people"}`];
    if (r.updated) parts.push(`${r.updated} ${r.updated === 1 ? "was" : "were"} already on the list`);
    if (skipped) parts.push(`${skipped} ${skipped === 1 ? "row was" : "rows were"} skipped because ${skipped === 1 ? "it had" : "they had"} no valid email address`);
    return `${parts.join("; ")}.`;
  }, true);
}

export async function saveSettingsAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    // Each section saves only its own fields, so the others are left as they are.
    const values: Partial<Settings> = {};
    for (const f of SETTING_FIELDS) {
      if (!formData.has(f.key)) continue;
      const value = String(formData.get(f.key) ?? "").trim();
      if ("type" in f && f.type === "price") {
        const pounds = parsePounds(value);
        if (!pounds) throw new Error("Please enter the membership price in pounds, for example 299 or 299.50.");
        values[f.key] = String(pounds);
        continue;
      } else if ("type" in f && f.type === "discount") {
        // Empty means no discount.
        if (!value) {
          values[f.key] = "";
          continue;
        }
        const pounds = parsePounds(value);
        if (!pounds) throw new Error("Please enter the discounted price in pounds, for example 199 or 199.50, or leave it empty for no discount.");
        // The main price is saved in the same form (and checked just above); fall back to the stored one.
        const main = parsePounds(values.membership_price) ?? (await getMembershipPrice()).full?.pounds ?? DEFAULT_PRICE_POUNDS;
        if (pounds >= main) throw new Error(`The discounted price must be less than the main price (${formatPounds(main)}). Leave it empty for no discount.`);
        values[f.key] = String(pounds);
        continue;
      } else if ("type" in f) {
        if (value && Number.isNaN(new Date(`${value}Z`).getTime())) throw new Error("Please choose the date and time of the call again.");
      } else if (value && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(value)) {
        throw new Error(`Please check “${f.label}”: it should be a full web address starting with https://`);
      }
      values[f.key] = value;
    }
    if (!Object.keys(values).length) throw new Error("Something went wrong. Please refresh the page and try again.");
    await saveSettings(values);
    // The public pages quote the price too.
    if ("membership_price" in values || "membership_discount_price" in values) {
      revalidatePath("/", "layout");
      const price = await getMembershipPrice();
      return price.full
        ? `Saved. The website shows ${price.full.label} crossed out, and new payments and emails use the discounted ${price.label}.`
        : `Saved. New payments, the website and emails now use ${price.label}.`;
    }
    return "Saved. New emails will use these details.";
  }, true);
}

export async function memberAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const id = String(formData.get("id"));
    const op = String(formData.get("op"));
    switch (op) {
      case "retry-spaces": {
        const r = await grantSpaces(id);
        return SPACES_MESSAGE[r.result];
      }
      case "mark-joined": {
        const r = await markJoinedPlatform(id);
        if (r.result === "skipped") return "Nothing to do: she is already marked as joined.";
        return r.result === "manual"
          ? "Marked as joined. Now add her to the five private spaces on Mighty Networks, then press Spaces added on the dashboard."
          : SPACES_MESSAGE[r.result];
      }
      case "spaces-added": {
        const r = await completeSpaces(id);
        return r.result === "in_circle" ? "Thank you. She is now an active member and her welcome email has been sent." : "Nothing to do: she has already been added.";
      }
      case "link-mighty": {
        // A1: she signed up on Mighty Networks with a different email.
        const mnEmail = normaliseEmail(String(formData.get("mnEmail") ?? ""));
        if (!mnEmail.includes("@")) throw new Error("Please enter the email address she used on Mighty Networks.");
        const m = await db().member.update({ where: { id }, data: { mnEmail } });
        if (m.status === "paid" || m.status === "invited") {
          await db().member.update({ where: { id }, data: { status: "joined_network", mnJoinedAt: new Date() } });
          const r = await grantSpaces(id);
          return `Linked to ${mnEmail}. ${SPACES_MESSAGE[r.result]}`;
        }
        return `Linked to ${mnEmail}.`;
      }
      case "resend-link": {
        await paymentsReady();
        await resendPaymentLink(id);
        return "Done. Her payment link has been emailed again.";
      }
      case "mentor": {
        const m = await db().member.findUniqueOrThrow({ where: { id } });
        await db().member.update({ where: { id }, data: { mentorMatched: !m.mentorMatched } });
        return !m.mentorMatched ? "Marked as matched with a mentor." : "Mentor match removed.";
      }
      case "clear-flag":
        await db().member.update({ where: { id }, data: { followUpFlag: false, followUpReason: null } });
        return "Marked as done.";
      case "note":
        await db().member.update({ where: { id }, data: { notes: String(formData.get("notes") ?? "") } });
        return "Note saved.";
    }
    throw new Error("Something went wrong. Please refresh the page and try again.");
  });
}

const PAYMENT_DONE: Record<PaymentChange, string> = {
  paid: "Saved as paid. She has been emailed her payment confirmation, and her platform invite follows in 5 minutes.",
  unpaid: "Saved as not paid. She has been emailed her payment link.",
  up_to_date: "Saved as up to date. She has been emailed to let her know.",
  failed: "Saved as renewal payment failed. She has been emailed to update her payment details.",
  ended: "Membership ended. She has been emailed to let her know.",
};

const MAX_SIGNATURE_BYTES = 200_000;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The signature pad sends a PNG data URL. Check it really is a PNG of a sensible size. */
function readSignature(dataUrl: string): Buffer {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) throw new Error("Please sign in the signature box before saving.");
  const bytes = Buffer.from(dataUrl.slice(prefix.length), "base64");
  if (bytes.length < PNG_MAGIC.length || !PNG_MAGIC.every((b, i) => bytes[i] === b)) throw new Error("Please clear the signature box and sign again.");
  if (bytes.length > MAX_SIGNATURE_BYTES) throw new Error("Please clear the signature box and sign again: that signature is too large.");
  return bytes;
}

/** The confirmation message, saying so when the email for that change is turned off. */
async function paymentDone(change: PaymentChange) {
  const paused = await pausedIds();
  const ids = PAYMENT_CHANGE_EMAILS[change];
  const off = ids.filter((t) => paused.has(t as TemplateId));
  if (!off.length) return PAYMENT_DONE[change];
  const saved = PAYMENT_DONE[change].split(". ")[0];
  return off.length === ids.length
    ? `${saved}. No email was sent, because that email is turned off in Automated emails.`
    : `${PAYMENT_DONE[change]} (Part of this is turned off in Automated emails and was not sent.)`;
}

export async function paymentStatusAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const id = String(formData.get("id"));
    const change = String(formData.get("change")) as PaymentChange;
    if (!(change in PAYMENT_DONE)) throw new Error("Please choose the new payment status.");
    if (change !== "paid") {
      await changePaymentStatus(id, change);
      return paymentDone(change);
    }
    // Recording a payment by hand: every field is compulsory, and the admin signs it.
    const staff = await requireAdminAction();
    const raw = String(formData.get("amount") ?? "").replace(/[£,\s]/g, "");
    const price = await getMembershipPrice();
    const pounds = Number(raw);
    if (!raw || !Number.isFinite(pounds) || pounds <= 0 || pounds > 10000) throw new Error(`Please enter the amount she paid in pounds, for example ${price.pounds}.`);
    const reference = String(formData.get("reference") ?? "").trim();
    if (!reference) throw new Error("Please enter the payment reference, for example the bank transfer reference.");
    if (reference.length > 80) throw new Error("Please shorten the payment reference to 80 characters or fewer.");
    const signedName = String(formData.get("signedName") ?? "").trim().replace(/\s+/g, " ");
    if (signedName.length < 2 || signedName.length > 100) throw new Error("Please type your full name under your signature.");
    const signature = readSignature(String(formData.get("signature") ?? ""));
    await changePaymentStatus(id, change, {
      amountPence: Math.round(pounds * 100),
      reference,
      signedBy: { staffId: staff.id, staffEmail: staff.email, name: signedName, signature },
    });
    return paymentDone(change);
  }, true);
}

export async function stageAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const staff = await requireAdminAction();
    const id = String(formData.get("id"));
    const from = String(formData.get("from")) as MemberStatus;
    const to = String(formData.get("to")) as MemberStatus;
    if (!(from in STAGES) || !(to in STAGES)) throw new Error("Please choose the new stage.");
    const reason = String(formData.get("reason") ?? "").trim().replace(/\s+/g, " ");
    if (reason.length < 3) throw new Error("Please say briefly why you are changing her stage.");
    if (reason.length > 300) throw new Error("Please shorten the reason to 300 characters or fewer.");
    await changeStage(id, from, to, { staffId: staff.id, staffEmail: staff.email, reason });
    return `Done. She is now at "${STAGES[to].label}". No email was sent.`;
  }, true);
}

export async function resolveAlertAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    await db().alert.update({ where: { id: String(formData.get("id")) }, data: { resolvedAt: new Date() } });
    return "Marked as done.";
  });
}

/** Permanently delete a member (admins only), then go back to the dashboard. */
export async function deleteMemberAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  let notCancelled = 0;
  const state = await guarded(async () => {
    const staff = await requireAdminAction();
    const r = await deleteMember(String(formData.get("id")), String(formData.get("confirmEmail") ?? ""), { staffId: staff.id, staffEmail: staff.email });
    notCancelled = r.notCancelled;
    return `${r.name} has been deleted.`;
  }, true);
  if (state.error) return state;
  // Her page no longer exists, so leave it. redirect() must be called outside guarded's try/catch.
  redirect(`/admin?deleted=${notCancelled ? "unsent" : "1"}`);
}
