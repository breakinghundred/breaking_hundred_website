"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { runDailyJobs } from "@/lib/jobs";
import { completeSpaces, grantSpaces, importInterest, normaliseEmail, openPayments } from "@/lib/members";
import { SETTING_FIELDS, saveSettings, type Settings } from "@/lib/settings";

export type AdminState = { message?: string; error?: string };

async function guarded(fn: () => Promise<string>): Promise<AdminState> {
  await requireAdmin();
  try {
    const message = await fn();
    revalidatePath("/admin");
    return { message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function openPaymentsAction(): Promise<AdminState> {
  return guarded(async () => {
    const r = await openPayments();
    return `Opened payments for ${r.processed} members (${r.sent} C02 emails sent). ${r.remaining ? `${r.remaining} still to do: press again.` : "Everyone on the interest list now has their link."}`;
  });
}

export async function runJobsAction(): Promise<AdminState> {
  return guarded(async () => {
    const r = await runDailyJobs();
    const sent = Object.entries(r.counts).map(([k, v]) => `${k}: ${v}`).join(", ") || "nothing due";
    return `Daily jobs ran. ${sent}.${r.errors.length ? ` Errors: ${r.errors.join("; ")}` : ""}`;
  });
}

export async function importAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const rows = String(formData.get("csv") ?? "")
      .split(/\r?\n/)
      .map((line) => line.split(/[,\t;]/).map((c) => c.trim().replace(/^"|"$/g, "")))
      .filter((cells) => cells.some((c) => c.includes("@")))
      .map((cells) => {
        const email = cells.find((c) => c.includes("@"))!;
        const names = cells.filter((c) => c && c !== email);
        return { email, firstName: names[0] ?? "", lastName: names[1] ?? "" };
      });
    const r = await importInterest(rows);
    return `Imported ${rows.length} rows: ${r.created} new, ${r.updated} merged into existing records.`;
  });
}

export async function saveSettingsAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const values: Partial<Settings> = {};
    for (const { key } of SETTING_FIELDS) values[key] = String(formData.get(key) ?? "").trim();
    await saveSettings(values);
    return "Settings saved.";
  });
}

export async function memberAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    const id = String(formData.get("id"));
    const op = String(formData.get("op"));
    switch (op) {
      case "retry-spaces": {
        const r = await grantSpaces(id);
        return `Spaces: ${r.result}.`;
      }
      case "spaces-added": {
        const r = await completeSpaces(id);
        return r.result === "in_circle" ? "Marked in the Circle; C07 sent and C08 scheduled." : "Nothing to do (she is not at joined_network).";
      }
      case "link-mighty": {
        // A1: she signed up on Mighty Networks with a different email.
        const mnEmail = normaliseEmail(String(formData.get("mnEmail") ?? ""));
        if (!mnEmail.includes("@")) throw new Error("Enter the email she used on Mighty Networks.");
        const m = await db().member.update({ where: { id }, data: { mnEmail } });
        if (m.status === "paid" || m.status === "invited") {
          await db().member.update({ where: { id }, data: { status: "joined_network", mnJoinedAt: new Date() } });
          const r = await grantSpaces(id);
          return `Linked ${mnEmail}. Spaces: ${r.result}.`;
        }
        return `Linked ${mnEmail}.`;
      }
      case "mentor": {
        const m = await db().member.findUniqueOrThrow({ where: { id } });
        await db().member.update({ where: { id }, data: { mentorMatched: !m.mentorMatched } });
        return `Mentor matched: ${!m.mentorMatched ? "yes" : "no"}.`;
      }
      case "clear-flag":
        await db().member.update({ where: { id }, data: { followUpFlag: false, followUpReason: null } });
        return "Follow-up flag cleared.";
      case "note":
        await db().member.update({ where: { id }, data: { notes: String(formData.get("notes") ?? "") } });
        return "Note saved.";
    }
    throw new Error(`Unknown action ${op}`);
  });
}

export async function resolveAlertAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return guarded(async () => {
    await db().alert.update({ where: { id: String(formData.get("id")) }, data: { resolvedAt: new Date() } });
    return "Alert resolved.";
  });
}
