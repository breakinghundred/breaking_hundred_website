"use server";

import { revalidatePath } from "next/cache";
import { checkPayments } from "@/lib/stripe";
import { requireAdminAction, requireStaff } from "@/lib/staff";
import { db } from "@/lib/db";
import { runDailyJobs } from "@/lib/jobs";
import { changePaymentStatus, completeSpaces, resendPaymentLink, resendPaymentLinks, grantSpaces, importInterest, normaliseEmail, openPayments, type PaymentChange } from "@/lib/members";
import { SETTING_FIELDS, getMembershipPrice, saveSettings, type Settings } from "@/lib/settings";
import { DEFAULT_PRICE_POUNDS, formatPounds, parsePounds } from "@/lib/price-format";
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

export async function paymentStatusAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const id = String(formData.get("id"));
    const change = String(formData.get("change")) as PaymentChange;
    if (!(change in PAYMENT_DONE)) throw new Error("Please choose the new payment status.");
    let amountPence: number | undefined;
    if (change === "paid") {
      const raw = String(formData.get("amount") ?? "").replace(/[£,\s]/g, "");
      const price = await getMembershipPrice();
      const pounds = raw ? Number(raw) : price.pounds;
      if (!Number.isFinite(pounds) || pounds <= 0 || pounds > 10000) throw new Error(`Please enter the amount she paid in pounds, for example ${price.pounds}.`);
      amountPence = Math.round(pounds * 100);
    }
    await changePaymentStatus(id, change, { amountPence, reference: String(formData.get("reference") ?? "") });
    return PAYMENT_DONE[change];
  }, true);
}

export async function resolveAlertAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    await db().alert.update({ where: { id: String(formData.get("id")) }, data: { resolvedAt: new Date() } });
    return "Marked as done.";
  });
}
