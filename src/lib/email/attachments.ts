import "server-only";
import type { Attachment } from "resend";
import { db } from "../db";
import type { TemplateId } from "./templates";

/**
 * Files sent with an email. Stored in Postgres like logos. Each belongs to one
 * team-written draft or one automated email.
 *
 * Limits: one upload is a single Server Action request, and Vercel caps request
 * bodies at 4.5 MB, so one file can be at most 4 MB. Resend accepts 40 MB per
 * email; we keep well under that so emails don't bounce from members' inboxes.
 */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
export const ATTACHMENTS_TOTAL_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENTS_MAX_COUNT = 10;

/**
 * Automated emails sent on a delay (members.ts schedules C05 and C08 with
 * `scheduledAt`). Resend can't schedule an email with attachments, so these
 * can't have any.
 */
export const DELAYED_TEMPLATES: readonly TemplateId[] = ["C05", "C08"];

export type AttachmentOwner = { draftId: string } | { templateId: TemplateId };
export type AttachmentInfo = { id: string; filename: string; size: number; contentType: string };

/** What people may attach, by file extension. Each is checked against the file's first bytes. */
const KINDS: Record<string, { type: string; magic: "pdf" | "png" | "jpg" | "gif" | "zip" | "ole" | "text" }> = {
  pdf: { type: "application/pdf", magic: "pdf" },
  png: { type: "image/png", magic: "png" },
  jpg: { type: "image/jpeg", magic: "jpg" },
  jpeg: { type: "image/jpeg", magic: "jpg" },
  gif: { type: "image/gif", magic: "gif" },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: "zip" },
  xlsx: { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magic: "zip" },
  pptx: { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", magic: "zip" },
  doc: { type: "application/msword", magic: "ole" },
  xls: { type: "application/vnd.ms-excel", magic: "ole" },
  ppt: { type: "application/vnd.ms-powerpoint", magic: "ole" },
  txt: { type: "text/plain", magic: "text" },
  csv: { type: "text/csv", magic: "text" },
  ics: { type: "text/calendar", magic: "text" },
};

/** For the file picker's `accept` and the help text. */
export const ATTACHMENT_ACCEPT = Object.keys(KINDS).map((e) => `.${e}`).join(",");
export const ATTACHMENT_KINDS_LABEL = "PDF, Word, Excel, PowerPoint, PNG, JPG, GIF, TXT, CSV or calendar (.ics) files";

const starts = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);

function looksLike(bytes: Uint8Array, magic: (typeof KINDS)[string]["magic"]) {
  switch (magic) {
    case "pdf": return starts(bytes, [0x25, 0x50, 0x44, 0x46]);
    case "png": return starts(bytes, [0x89, 0x50, 0x4e, 0x47]);
    case "jpg": return starts(bytes, [0xff, 0xd8, 0xff]);
    case "gif": return starts(bytes, [0x47, 0x49, 0x46]);
    case "zip": return starts(bytes, [0x50, 0x4b, 0x03, 0x04]);
    case "ole": return starts(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case "text": {
      if (bytes.includes(0)) return false;
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return true;
      } catch {
        return false;
      }
    }
  }
}

/** A safe file name for inboxes: no folders, no control characters, a sensible length. */
export function cleanFilename(raw: string, ext: string) {
  const base = raw.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "").replace(/\s+/g, " ").trim();
  const stem = base.replace(/\.[^.]*$/, "").slice(0, 100).trim() || "attachment";
  return `${stem}.${ext}`;
}

export const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const where = (owner: AttachmentOwner) => ("draftId" in owner ? { draftId: owner.draftId } : { templateId: owner.templateId });

/** The files on one email, without their bytes, oldest first. */
export function listAttachments(owner: AttachmentOwner): Promise<AttachmentInfo[]> {
  return db().emailAttachment.findMany({
    where: where(owner),
    select: { id: true, filename: true, size: true, contentType: true },
    orderBy: { createdAt: "asc" },
  });
}

/** The files on one email, ready for Resend. Throws if they can't be loaded. */
export async function loadAttachments(owner: AttachmentOwner): Promise<Attachment[]> {
  const rows = await db().emailAttachment.findMany({
    where: where(owner),
    select: { filename: true, contentType: true, data: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ filename: r.filename, content: Buffer.from(r.data), contentType: r.contentType }));
}

/**
 * The files for an automated email. Like logos, a problem loading them never
 * stops the email (a payment confirmation must still go out); it is logged.
 */
export async function automatedAttachments(templateId: TemplateId): Promise<Attachment[]> {
  try {
    return await loadAttachments({ templateId });
  } catch (e) {
    console.error(`[email] attachments for ${templateId} skipped:`, e instanceof Error ? e.message : e);
    return [];
  }
}

/** Check and store an uploaded file. Returns an everyday-language error, or the stored file name. */
export async function addAttachment(owner: AttachmentOwner, file: File, by: string): Promise<{ error: string } | { filename: string }> {
  if ("templateId" in owner && DELAYED_TEMPLATES.includes(owner.templateId))
    return { error: "This email is sent on a delay, and delayed emails can't carry files. Put a link to the file in the text instead." };
  if (file.size === 0) return { error: "That file is empty. Please choose another." };
  if (file.size > ATTACHMENT_MAX_BYTES)
    return { error: `That file is ${formatBytes(file.size)}. Files can be up to ${formatBytes(ATTACHMENT_MAX_BYTES)}: please make it smaller, or put a link to it in the email instead.` };

  const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  const kind = KINDS[ext];
  if (!kind) return { error: `Please attach ${ATTACHMENT_KINDS_LABEL}. Other kinds of file are often blocked by email apps.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLike(bytes, kind.magic)) return { error: `That file doesn't look like a real .${ext} file. Please save it again and retry.` };

  const existing = await db().emailAttachment.aggregate({ where: where(owner), _sum: { size: true }, _count: true });
  if (existing._count >= ATTACHMENTS_MAX_COUNT) return { error: `An email can carry up to ${ATTACHMENTS_MAX_COUNT} files. Remove one first.` };
  const total = (existing._sum.size ?? 0) + bytes.length;
  if (total > ATTACHMENTS_TOTAL_MAX_BYTES)
    return { error: `All the files together would be ${formatBytes(total)}. The limit for one email is ${formatBytes(ATTACHMENTS_TOTAL_MAX_BYTES)}.` };

  const filename = cleanFilename(file.name, ext);
  await db().emailAttachment.create({
    data: { ...where(owner), filename, contentType: kind.type, size: bytes.length, data: bytes, createdBy: by },
  });
  return { filename };
}
