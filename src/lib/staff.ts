import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffRole } from "@/generated/prisma/client";
import { ADMIN_COOKIE, OWNER_ID, readSession, safeEqual } from "./admin-session";
import { db } from "./db";
import { sendTeamEmail } from "./email/send";
import { env, optionalEnv, siteUrl } from "./env";

/**
 * Who can sign in to /admin, and what they can do.
 *
 *   admin  everything, including payments, settings, email wording and the Team page
 *   team   day-to-day work: members, to-dos, resending payment links, notes
 *
 * The main admin signs in with ADMIN_EMAIL (or ALERT_EMAIL) and ADMIN_PASSWORD from the
 * environment. That account has no database row and cannot be removed, so the team can
 * never lock itself out.
 */

export type Staff = { id: string; name: string; email: string; role: StaffRole; owner: boolean };

export const ROLE_LABELS: Record<StaffRole, { label: string; help: string }> = {
  admin: { label: "Admin", help: "Can do everything, including payments, settings, email wording and managing the team." },
  team: { label: "Team", help: "Can see members and handle day-to-day tasks, but cannot change payments, settings or emails." },
};

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
export const MIN_PASSWORD = 10;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function checkPassword(password: string, stored: string | null) {
  // Hash anyway when there is no account, so timing does not reveal which emails exist.
  const [, salt = "c2FsdA", hash = ""] = (stored ?? "").split("$");
  const given = (await scrypt(password, Buffer.from(salt, "base64url"), 64)).toString("base64url");
  return !!stored && safeEqual(given, hash);
}

export const ownerEmail = () => (optionalEnv("ADMIN_EMAIL") ?? optionalEnv("ALERT_EMAIL") ?? "admin@breakinghundred.org").trim().toLowerCase();

function owner(): Staff {
  return { id: OWNER_ID, name: "Main admin", email: ownerEmail(), role: "admin", owner: true };
}

/** Check an email and password. Returns the account and its session version, or null. */
export async function authenticate(emailRaw: string, password: string): Promise<{ staff: Staff; version: number } | null> {
  const email = emailRaw.trim().toLowerCase();
  const ownerPassword = process.env.ADMIN_PASSWORD;
  if (ownerPassword && email === ownerEmail() && safeEqual(password, ownerPassword)) return { staff: owner(), version: 0 };

  const user = await db().staffUser.findUnique({ where: { email } });
  const ok = await checkPassword(password, user?.active ? user.passwordHash : null);
  if (!user || !ok) return null;
  await db().staffUser.update({ where: { id: user.id }, data: { lastSignInAt: new Date() } });
  return { staff: { id: user.id, name: user.name, email: user.email, role: user.role, owner: false }, version: user.sessionVersion };
}

/** The signed-in person, or null. Checks the account is still active and the session not revoked. */
export async function currentStaff(): Promise<Staff | null> {
  const session = readSession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  if (session.staffId === OWNER_ID) return process.env.ADMIN_PASSWORD ? owner() : null;
  const user = await db().staffUser.findUnique({ where: { id: session.staffId } });
  if (!user || !user.active || user.sessionVersion !== session.version) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, owner: false };
}

/** Any signed-in team member. Used in every admin page and Server Action. */
export async function requireStaff(): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

/** Admin-only pages: team members are sent back to the dashboard. */
export async function requireAdminPage(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");
  return staff;
}

export const ADMIN_ONLY = "Please ask an admin: only admins can do this.";

/** Admin-only actions: a friendly error for team members. */
export async function requireAdminAction(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new Error(ADMIN_ONLY);
  return staff;
}

/* ---------- Invite / set-password links ---------- */

const INVITE_DAYS = 7;

function signInvite(payload: string) {
  return createHmac("sha256", env("LINK_SECRET")).update(`staff-invite:${payload}`).digest("base64url").slice(0, 32);
}

/** A link to set a password. It stops working after 7 days, or once a password is set with it. */
export function inviteLink(user: { id: string; sessionVersion: number }) {
  const payload = `${user.id}.${user.sessionVersion}.${Date.now() + INVITE_DAYS * 86_400_000}`;
  return `${siteUrl()}/admin/welcome?t=${payload}.${signInvite(payload)}`;
}

export async function readInvite(token: string | undefined | null) {
  const parts = (token ?? "").split(".");
  if (parts.length !== 4) return null;
  const [id, version, expires, sig] = parts;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return null;
  if (!safeEqual(sig, signInvite(`${id}.${version}.${expires}`))) return null;
  const user = await db().staffUser.findUnique({ where: { id } });
  return user && user.active && String(user.sessionVersion) === version ? user : null;
}

export async function sendInvite(user: { id: string; name: string; email: string; role: StaffRole; sessionVersion: number }, by: string, reset = false) {
  const link = inviteLink(user);
  const first = user.name.split(" ")[0] || user.name;
  await sendTeamEmail(
    user.email,
    reset ? "Set a new password for The Circle admin" : "You have been added to The Circle admin",
    [
      `Dear ${first},`,
      reset
        ? `${by} has sent you a link to set a new password for The Circle admin.`
        : `${by} has added you to The Circle admin as ${ROLE_LABELS[user.role].label === "Admin" ? "an admin" : "a member of the team"}.`,
      `Choose your password here: ${link}`,
      `The link works once and expires in ${INVITE_DAYS} days. After that, sign in at ${siteUrl()}/admin/login with this email address and your password.`,
      "If you were not expecting this, you can ignore this email.",
    ],
  );
  return link;
}
