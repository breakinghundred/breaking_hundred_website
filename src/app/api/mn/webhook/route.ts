import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env, optionalEnv } from "@/lib/env";
import { handleCourseProgress, handleJoinedStartHere } from "@/lib/members";

/**
 * Mighty Networks Admin API webhooks (replaces Zapier Z1 trigger and Z2).
 * Subscribe in Mighty Networks to MemberJoined (scoped to Start Here) and
 * MemberCourseProgressUpdated / MemberCourseProgressCompleted (Academy), with
 * this URL and an Authorization key equal to MN_WEBHOOK_SECRET.
 *
 * Mighty Networks does not sign deliveries, so the key is the only check, and
 * every handler is idempotent (deliveries are retried on timeout or error).
 * The raw payload is stored in MightyEvent so field names can be confirmed
 * against live data before go-live.
 */
export async function POST(req: Request) {
  if (!authorised(req.headers.get("authorization"))) return new Response("Unauthorised", { status: 401 });

  const raw = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const type = String(pick(payload, ["event_type", "type", "event", "name"]) ?? "unknown");
  const id = String(pick(payload, ["id", "event_id", "uuid"]) ?? createHash("sha256").update(raw).digest("hex"));

  try {
    await db().mightyEvent.create({ data: { id, type, payload: payload as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return Response.json({ duplicate: true });
    throw e;
  }

  try {
    const result = await route(type, payload);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    await db().mightyEvent.delete({ where: { id } }).catch(() => {});
    console.error(`Mighty ${type} failed`, e);
    return new Response("Handler error", { status: 500 });
  }
}

function authorised(header: string | null) {
  if (!header) return false;
  const secret = env("MN_WEBHOOK_SECRET");
  const given = header.replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function route(type: string, payload: Record<string, unknown>) {
  const t = type.toLowerCase().replace(/[^a-z]/g, "");
  const data = (pick(payload, ["payload", "data", "object"]) as Record<string, unknown>) ?? payload;
  const member = (pick(data, ["member", "user"]) as Record<string, unknown>) ?? data;
  const email = String(pick(member, ["email"]) ?? pick(data, ["email", "member_email", "user_email"]) ?? "");
  const spaceId = String(pick(data, ["space_id"]) ?? pick((pick(data, ["space"]) as Record<string, unknown>) ?? {}, ["id"]) ?? "");
  if (!email) return { result: "no-email" };

  if (t === "memberjoined") {
    const startHere = optionalEnv("MN_START_HERE_SPACE_ID");
    if (startHere && spaceId && spaceId !== startHere) return { result: "other-space" };
    const name = [pick(member, ["first_name"]), pick(member, ["last_name"])].filter(Boolean).join(" ") || String(pick(member, ["name"]) ?? "");
    const mnUserId = pick(member, ["id", "user_id"]) ?? pick(data, ["member_id", "user_id"]);
    return handleJoinedStartHere({ email, name, mnUserId: mnUserId != null ? String(mnUserId) : undefined });
  }

  if (t.startsWith("membercourseprogress")) {
    const academy = optionalEnv("MN_ACADEMY_SPACE_ID");
    if (academy && spaceId && spaceId !== academy) return { result: "other-space" };
    const raw = pick(data, ["progress", "percent_complete", "completion_percentage", "progress_percentage", "percentage"]);
    const pct = t.endsWith("completed") ? 100 : Number(raw);
    if (!Number.isFinite(pct)) return { result: "no-progress" };
    // Assumes a 0–100 percentage; confirm against a stored live payload before go-live.
    return handleCourseProgress(email, pct);
  }

  return { result: "ignored" };
}

function pick(obj: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) if (obj[k] != null && obj[k] !== "") return obj[k];
  return undefined;
}
