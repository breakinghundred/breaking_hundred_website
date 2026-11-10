import "server-only";
import { optionalEnv } from "./env";

/**
 * Mighty Networks Admin API (replaces Zapier Z1/Z3).
 * Docs: https://docs.mightynetworks.com/admin-api
 *
 * Config:
 *   MN_API_KEY            Admin > Settings > API Keys
 *   MN_NETWORK_ID         numeric network id
 *   MN_START_HERE_SPACE_ID
 *   MN_PRIVATE_SPACE_IDS  comma list: Academy, Library, Community, Monthly Live, Partner Directory
 *   MN_ACADEMY_SPACE_ID   used to filter course progress webhooks
 */
const BASE = "https://api.mn.co/admin/v1/networks";

export function mightyConfigured() {
  return Boolean(optionalEnv("MN_API_KEY") && optionalEnv("MN_NETWORK_ID"));
}

export function privateSpaceIds(): string[] {
  return (optionalEnv("MN_PRIVATE_SPACE_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export class MightyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const url = `${BASE}/${optionalEnv("MN_NETWORK_ID")}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${optionalEnv("MN_API_KEY")}`,
      "User-Agent": "BreakingHundredCircle/1.0",
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new MightyError(res.status, `Mighty ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

type MightyMember = { id: number | string; email?: string };

export async function findMemberByEmail(email: string): Promise<MightyMember | null> {
  const res = await call<MightyMember | { data?: MightyMember }>("GET", `/members/by_email?email=${encodeURIComponent(email)}`);
  if (!res) return null;
  return "id" in res ? res : (res.data ?? null);
}

/** Add a member to each private space. 422 means she is already in it, which is fine. */
export async function addToPrivateSpaces(userId: string) {
  for (const spaceId of privateSpaceIds()) {
    try {
      await call("POST", `/spaces/${spaceId}/members?user_id=${encodeURIComponent(userId)}`);
    } catch (e) {
      if (e instanceof MightyError && e.status === 422) continue;
      throw e;
    }
  }
}

/** Remove a member from each private space, leaving her account and Start Here in place. */
export async function removeFromPrivateSpaces(userId: string) {
  for (const spaceId of privateSpaceIds()) {
    await call("DELETE", `/spaces/${spaceId}/members/${encodeURIComponent(userId)}/`);
  }
}
