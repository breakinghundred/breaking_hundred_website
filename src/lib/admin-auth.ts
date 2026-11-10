import "server-only";
import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

/** HTTP Basic auth for /admin: user "admin", password ADMIN_PASSWORD. */
export function checkBasicAuth(header: string | null): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !header?.startsWith("Basic ")) return false;
  const [user, ...rest] = Buffer.from(header.slice(6), "base64").toString().split(":");
  const given = Buffer.from(rest.join(":"));
  const expected = Buffer.from(password);
  return user === "admin" && given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called inside every admin page render and Server Action, not only in the proxy. */
export async function requireAdmin() {
  if (!checkBasicAuth((await headers()).get("authorization"))) throw new Error("Unauthorised");
}
