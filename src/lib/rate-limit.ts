import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";
import { optionalEnv } from "./env";

/** The client IP as Vercel reports it, hashed so raw IPs are never stored. */
export async function clientKey(scope: string) {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${scope}:${ip}:${optionalEnv("LINK_SECRET") ?? ""}`).digest("hex").slice(0, 32);
}

/**
 * Sliding-window limit backed by Postgres (works across serverless instances).
 * Records this attempt and returns false if the key is over `max` in `windowMs`.
 */
export async function allow(key: string, max: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  const recent = await db().formAttempt.count({ where: { key, createdAt: { gte: since } } });
  if (recent >= max) return false;
  await db().formAttempt.create({ data: { key } });
  // Opportunistic clean-up of old rows.
  if (Math.random() < 0.02) await db().formAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  return true;
}
