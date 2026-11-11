import "server-only";
import { db } from "../db";
import { siteUrl } from "../env";
import type { LogoRef } from "./render";

export const LOGO_TYPES: Record<string, string> = { "image/png": "PNG", "image/jpeg": "JPG", "image/gif": "GIF" };
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIN_WIDTH = 40;
export const LOGO_MAX_WIDTH = 560;

/** Public path of a logo. The id never changes content, so it can be cached for ever. */
export const logoPath = (id: string) => `/email-logo/${id}`;

/** Logos in the library (not removed), without the image bytes. */
export async function listLogos() {
  return db().emailLogo.findMany({
    where: { removedAt: null },
    select: { id: true, name: true, width: true, inAutomated: true, contentType: true, createdAt: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

const toRef = (l: { id: string; name: string; width: number }): LogoRef => ({
  src: `${siteUrl()}${logoPath(l.id)}`,
  width: l.width,
  alt: l.name,
});

/** Logos at the top of the automated emails. */
export async function automatedLogos(): Promise<LogoRef[]> {
  return (await listLogos()).filter((l) => l.inAutomated).map(toRef);
}

/** The chosen logos for a custom email, in the chosen order. Removed ones are skipped. */
export async function logosById(ids: string[]): Promise<LogoRef[]> {
  if (!ids.length) return [];
  const rows = await db().emailLogo.findMany({
    where: { id: { in: ids }, removedAt: null },
    select: { id: true, name: true, width: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => (byId.has(id) ? [toRef(byId.get(id)!)] : []));
}
