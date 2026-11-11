import "server-only";
import type { Attachment } from "resend";
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

/** The logos for one email: header references, plus inline attachments when they travel inside the email. */
export type EmailLogos = { refs: LogoRef[]; attachments: Attachment[] };
export const NO_LOGOS: EmailLogos = { refs: [], attachments: [] };

/**
 * Inboxes can only load a logo from a public https address. While SITE_URL is
 * localhost (or unset), logos are attached inside the email instead (cid: images),
 * so they still show.
 */
export function linksArePublic(base = siteUrl()) {
  return /^https:\/\//i.test(base) && !/\/\/(localhost|127\.0\.0\.1|\[::1\]|[^/]*\.local)(:|\/|$)/i.test(base);
}

type Row = { id: string; name: string; width: number; contentType: string; data: Uint8Array };
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif" };

function build(rows: Row[]): EmailLogos {
  if (linksArePublic()) {
    const base = siteUrl();
    return { refs: rows.map((l) => ({ src: `${base}${logoPath(l.id)}`, width: l.width, alt: l.name })), attachments: [] };
  }
  return {
    refs: rows.map((l) => ({ src: `cid:logo-${l.id}`, width: l.width, alt: l.name })),
    attachments: rows.map((l) => ({
      filename: `logo-${l.id}.${EXT[l.contentType] ?? "png"}`,
      content: Buffer.from(l.data),
      contentType: l.contentType,
      contentId: `logo-${l.id}`,
    })),
  };
}

const FULL = { id: true, name: true, width: true, contentType: true, data: true } as const;

/** A logo problem (e.g. the table not migrated yet) must never stop an email going out. */
async function safely(load: () => Promise<Row[]>): Promise<EmailLogos> {
  try {
    return build(await load());
  } catch (e) {
    console.warn("[email] logos skipped:", e instanceof Error ? e.message : e);
    return NO_LOGOS;
  }
}

/** Logos at the top of the automated emails. */
export function automatedLogos(): Promise<EmailLogos> {
  return safely(() =>
    db().emailLogo.findMany({
      where: { removedAt: null, inAutomated: true },
      select: FULL,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  );
}

/** The chosen logos for a custom email, in the chosen order. Removed ones are skipped. */
export function logosById(ids: string[]): Promise<EmailLogos> {
  if (!ids.length) return Promise.resolve(NO_LOGOS);
  return safely(async () => {
    const rows = await db().emailLogo.findMany({ where: { id: { in: ids }, removedAt: null }, select: FULL });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  });
}
