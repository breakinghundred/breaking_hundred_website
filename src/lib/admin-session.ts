/**
 * Admin session cookie: "<expiresAtMs>.<signature>".
 * No "server-only" import because src/proxy.ts uses it too (proxy runs on Node.js).
 *
 * The signing key mixes ADMIN_PASSWORD with LINK_SECRET, so changing the
 * admin password signs everyone out.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "circle_admin";
export const SESSION_HOURS = 12;

function key(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.LINK_SECRET;
  return password && secret ? `${secret}:${password}` : null;
}

function sign(expires: string, k: string) {
  return createHmac("sha256", k).update(`admin-session:${expires}`).digest("base64url");
}

export function createSession(): { value: string; expires: Date } | null {
  const k = key();
  if (!k) return null;
  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  return { value: `${expires}.${sign(String(expires), k)}`, expires: new Date(expires) };
}

export function verifySession(value: string | undefined | null): boolean {
  const k = key();
  if (!k || !value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(expires, k));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Constant-time password check. */
export function passwordMatches(given: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Only allow redirects back into /admin after sign-in. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/[\w\-/?=&%.]*)?$/.test(next) && !next.startsWith("/admin/login")
    ? next
    : "/admin";
}
