import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Personal links carry `<memberId>.<signature>` instead of the plain member id,
 * so one member cannot open another member's page by guessing an id.
 * The purpose is mixed into the signature so a payment token cannot open the
 * contributor form, and vice versa.
 */
export type TokenPurpose = "join" | "billing" | "contribute";

function sign(memberId: string, purpose: TokenPurpose) {
  return createHmac("sha256", env("LINK_SECRET"))
    .update(`${purpose}:${memberId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function makeToken(memberId: string, purpose: TokenPurpose) {
  return `${memberId}.${sign(memberId, purpose)}`;
}

export function readToken(token: string | undefined | null, purpose: TokenPurpose): string | null {
  if (!token) return null;
  const [memberId, sig] = token.split(".");
  if (!memberId || !sig) return null;
  const expected = Buffer.from(sign(memberId, purpose));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return memberId;
}
