/**
 * Admin session cookie: "<staffId>.<sessionVersion>.<expiresAtMs>.<signature>".
 * No "server-only" import because src/proxy.ts uses it too (proxy runs on Node.js).
 * The proxy only checks the signature and expiry; requireStaff() (src/lib/staff.ts)
 * also checks the account is still active and the session version is current.
 *
 * The signing key mixes ADMIN_PASSWORD with LINK_SECRET, so changing the main
 * admin password signs everyone out.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "circle_admin";
export const SESSION_HOURS = 12;
/** Staff id used for the ADMIN_PASSWORD account, which has no database row. */
export const OWNER_ID = "owner";

function key(): string | null {
  const secret = process.env.LINK_SECRET;
  return secret ? `${secret}:${process.env.ADMIN_PASSWORD ?? ""}` : null;
}

function sign(payload: string, k: string) {
  return createHmac("sha256", k).update(`admin-session:${payload}`).digest("base64url");
}

export function createSession(staffId: string, version: number): { value: string; expires: Date } | null {
  const k = key();
  if (!k) return null;
  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = `${staffId}.${version}.${expires}`;
  return { value: `${payload}.${sign(payload, k)}`, expires: new Date(expires) };
}

/** Returns who the cookie belongs to, or null if it is missing, forged or expired. */
export function readSession(value: string | undefined | null): { staffId: string; version: number } | null {
  const k = key();
  if (!k || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [staffId, version, expires, sig] = parts;
  if (!/^[\w-]+$/.test(staffId) || !/^\d+$/.test(version) || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return null;
  const expected = Buffer.from(sign(`${staffId}.${version}.${expires}`, k));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { staffId, version: Number(version) };
}

export const verifySession = (value: string | undefined | null) => readSession(value) !== null;

/** Constant-time comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Only allow redirects back into /admin after sign-in. */
export function safeNext(next: unknown): string {
  return typeof next === "string" &&
    /^\/admin(\/[\w\-/?=&%.]*)?$/.test(next) &&
    !next.startsWith("/admin/login") &&
    !next.startsWith("/admin/welcome")
    ? next
    : "/admin";
}
