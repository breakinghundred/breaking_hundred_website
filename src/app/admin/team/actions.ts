"use server";

import { revalidatePath } from "next/cache";
import type { StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { inviteLink, ownerEmail, requireAdminAction, requireStaff, ROLE_LABELS, sendInvite, type Staff } from "@/lib/staff";
import type { AdminState } from "../actions";

const ROLES = Object.keys(ROLE_LABELS) as StaffRole[];

/**
 * Email the set-password link. If email is not set up or the send fails, the change still stands
 * and the admin is shown the link to pass on by hand.
 */
async function deliverInvite(user: Parameters<typeof sendInvite>[0], by: string, reset = false) {
  const fallback = inviteLink(user);
  try {
    const link = await sendInvite(user, by, reset);
    return optionalEnv("RESEND_API_KEY") ? { sent: true, note: "" } : { sent: false, note: ` Emails are not set up here, so share this link with them: ${link}` };
  } catch (e) {
    console.error("Staff invite email failed", e);
    return { sent: false, note: ` The email could not be sent, so please share this link with them yourself: ${fallback}` };
  }
}

async function teamAction(fn: (me: Staff) => Promise<string>): Promise<AdminState> {
  await requireStaff();
  try {
    const me = await requireAdminAction();
    const message = await fn(me);
    revalidatePath("/admin/team");
    return { message };
  } catch (e) {
    console.error("Team action failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg.startsWith("Please") ? msg : "Sorry, that did not work. Please try again, and tell your developer if it keeps happening." };
  }
}

export async function addStaffAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return teamAction(async (me) => {
    const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = String(formData.get("role")) as StaffRole;
    if (!name) throw new Error("Please enter their name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    if (!ROLES.includes(role)) throw new Error("Please choose a role.");
    if (email === ownerEmail()) throw new Error("Please use a different email: that one belongs to the main admin account.");
    const existing = await db().staffUser.findUnique({ where: { email } });
    if (existing) {
      throw new Error(
        existing.active
          ? "Please check the list: that person is already on the team."
          : "Please use Restore access on their row below: that person was on the team before.",
      );
    }
    const user = await db().staffUser.create({ data: { name, email, role, invitedBy: me.name } });
    const invite = await deliverInvite(user, me.name);
    return `Added ${name} as ${ROLE_LABELS[role].label}.${invite.sent ? " We have emailed them a link to choose their password." : ""}${invite.note}`;
  });
}

export async function staffAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  return teamAction(async (me) => {
    const id = String(formData.get("id"));
    const op = String(formData.get("op"));
    if (id === me.id) throw new Error("Please ask another admin: you cannot change your own access.");
    const user = await db().staffUser.findUniqueOrThrow({ where: { id } });

    switch (op) {
      case "role": {
        const role = String(formData.get("role")) as StaffRole;
        if (!ROLES.includes(role)) throw new Error("Please choose a role.");
        if (role === user.role) return `${user.name} is already ${ROLE_LABELS[role].label}.`;
        await db().staffUser.update({ where: { id }, data: { role } });
        return `${user.name} is now ${ROLE_LABELS[role].label}. This applies straight away.`;
      }
      case "remove":
        // Bumping the version signs them out everywhere and cancels any unused password link.
        await db().staffUser.update({ where: { id }, data: { active: false, sessionVersion: { increment: 1 } } });
        return `${user.name} can no longer sign in. They have been signed out. You can restore their access at any time.`;
      case "restore": {
        const restored = await db().staffUser.update({ where: { id }, data: { active: true } });
        if (restored.passwordHash) return `${user.name} can sign in again with their existing password.`;
        const invite = await deliverInvite(restored, me.name);
        return `${user.name} can sign in again.${invite.sent ? " We have emailed them a link to choose their password." : ""}${invite.note}`;
      }
      case "reset": {
        if (!user.active) throw new Error("Please restore their access first.");
        const invite = await deliverInvite(user, me.name, !!user.passwordHash);
        const keep = user.passwordHash ? " Their current password keeps working until they use the link." : "";
        return `${invite.sent ? `We have emailed ${user.name} a link to set a password.` : `New password link for ${user.name} ready.`}${keep}${invite.note}`;
      }
    }
    throw new Error("Something went wrong. Please refresh the page and try again.");
  });
}
