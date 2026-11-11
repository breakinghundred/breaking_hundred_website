"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { SAMPLE_VARS, SENDABLE_TEMPLATE_IDS, validateCustom } from "@/lib/email/catalogue";
import { LOGO_MAX_BYTES, LOGO_MAX_WIDTH, LOGO_MIN_WIDTH, LOGO_TYPES, logosById } from "@/lib/email/logos";
import { sendCustomEmail, sendMemberEmail, sendPreview } from "@/lib/email/send";
import { compile } from "@/lib/email/source";
import type { TemplateId } from "@/lib/email/templates";
import { ADMIN_ONLY, currentStaff, requireAdminAction, type Staff } from "@/lib/staff";
import type { AdminState } from "../actions";
import { STAGE_ORDER } from "../labels";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Auth = { staff: Staff; error?: undefined } | { staff?: undefined; error: string };

async function adminOrError(): Promise<Auth> {
  const staff = await currentStaff();
  if (!staff) return { error: "Please sign in again." };
  if (staff.role !== "admin") return { error: ADMIN_ONLY };
  return { staff };
}

const ids = (fd: FormData, key: string) => [...new Set(fd.getAll(key).map(String).filter((v) => /^[a-z0-9]{10,40}$/i.test(v)))];

/* ---------- drafts ---------- */

export async function newDraftAction(formData: FormData) {
  const staff = await requireAdminAction();
  const to = String(formData.get("to") ?? "");
  const member = to ? await db().member.findUnique({ where: { id: to }, select: { id: true } }) : null;
  const logos = await db().emailLogo.findMany({
    where: { removedAt: null, inAutomated: true },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const draft = await db().emailDraft.create({
    data: {
      createdBy: staff.name,
      body: "Dear {{first_name}},\n\n\n\nKind regards,\nThe Breaking Hundred Team",
      recipientIds: member ? [member.id] : [],
      logoIds: logos.map((l) => l.id),
    },
  });
  redirect(`/admin/emails/drafts/${draft.id}`);
}

export type DraftState = { message?: string; errors?: string[]; savedAt?: number };

function audienceWhere(audience: string, recipientIds: string[]): Prisma.MemberWhereInput | null {
  const or: Prisma.MemberWhereInput[] = [];
  if (recipientIds.length) or.push({ id: { in: recipientIds } });
  if (audience === "all") or.push({});
  else if (STAGE_ORDER.includes(audience as MemberStatus)) or.push({ status: audience as MemberStatus });
  return or.length ? { OR: or } : null;
}

export async function draftAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const auth = await adminOrError();
  if (!auth.staff) return { errors: [auth.error] };
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "save");

  if (op === "delete") {
    await db().emailDraft.deleteMany({ where: { id } });
    revalidatePath("/admin/emails/drafts");
    redirect("/admin/emails/drafts");
  }

  const source = { subject: String(formData.get("subject") ?? "").trim(), body: String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim() };
  const audienceRaw = String(formData.get("audience") ?? "");
  const audience = audienceRaw === "all" || STAGE_ORDER.includes(audienceRaw as MemberStatus) ? audienceRaw : "";
  const data = { ...source, audience, recipientIds: ids(formData, "recipient"), logoIds: ids(formData, "logo") };

  const found = await db().emailDraft.updateMany({ where: { id }, data });
  if (!found.count) return { errors: ["This draft has been deleted."] };
  revalidatePath("/admin/emails/drafts");
  if (op === "save") return { message: "Draft saved.", savedAt: Date.now() };

  const errors = validateCustom(source);
  if (errors.length) return { errors, savedAt: Date.now() };

  if (op === "test") {
    const to = String(formData.get("testTo") ?? "").trim() || auth.staff.email;
    if (!EMAIL.test(to)) return { errors: ["Enter a valid email address for the test."], savedAt: Date.now() };
    const { subject, blocks } = compile(source, SAMPLE_VARS);
    try {
      await sendPreview(to, subject, blocks, await logosById(data.logoIds));
    } catch (e) {
      return { errors: [`The test could not be sent. ${e instanceof Error ? e.message : String(e)}`], savedAt: Date.now() };
    }
    return { message: `Draft saved, and a test sent to ${to} with example details (Ada Okafor).`, savedAt: Date.now() };
  }

  if (op === "send") {
    const where = audienceWhere(audience, data.recipientIds);
    if (!where) return { errors: ["Choose who to send it to."], savedAt: Date.now() };
    const members = await db().member.findMany({ where, orderBy: { createdAt: "asc" } });
    if (!members.length) return { errors: ["Nobody matches the people you chose."], savedAt: Date.now() };
    try {
      const { sent } = await sendCustomEmail(members, source, { logoIds: data.logoIds, sendKey: `${id}:${Date.now()}` });
      await db().emailDraft.update({ where: { id }, data: { lastSentAt: new Date(), sentCount: { increment: sent } } });
      revalidatePath("/admin", "layout");
      return { message: `Sent to ${sent} ${sent === 1 ? "person" : "people"}. You can find it on each person's details page.`, savedAt: Date.now() };
    } catch (e) {
      return { errors: [`Sending failed. ${e instanceof Error ? e.message.replace(/^Resend: /, "Resend said: ") : String(e)}`], savedAt: Date.now() };
    }
  }
  return { errors: ["Unknown action."] };
}

/* ---------- contacts ---------- */

/** Send an automated email or a saved draft to one contact. */
export async function sendToContactAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const auth = await adminOrError();
  if (!auth.staff) return { error: auth.error };
  const member = await db().member.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!member) return { error: "We couldn't find that person." };
  const what = String(formData.get("what") ?? "");
  const stamp = Date.now();

  try {
    if (what.startsWith("draft:")) {
      const draft = await db().emailDraft.findUnique({ where: { id: what.slice(6) } });
      if (!draft) return { error: "That draft has been deleted." };
      const problems = validateCustom(draft);
      if (problems.length) return { error: `That draft isn't ready: ${problems[0]}` };
      await sendCustomEmail([member], draft, { logoIds: draft.logoIds, sendKey: `${draft.id}:${stamp}` });
      await db().emailDraft.update({ where: { id: draft.id }, data: { lastSentAt: new Date(), sentCount: { increment: 1 } } });
    } else if (SENDABLE_TEMPLATE_IDS.includes(what as TemplateId)) {
      await sendMemberEmail(member, what as TemplateId, { sendKey: `manual-${stamp}` });
    } else {
      return { error: "Choose an email to send." };
    }
  } catch (e) {
    return { error: `The email could not be sent. ${e instanceof Error ? e.message.replace(/^Resend: /, "Resend said: ") : String(e)}` };
  }
  revalidatePath("/admin", "layout");
  return { message: `Sent to ${member.email}.` };
}

/* ---------- logos ---------- */

function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  return null;
}

const clampWidth = (raw: FormDataEntryValue | null, fallback: number) => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(LOGO_MAX_WIDTH, Math.max(LOGO_MIN_WIDTH, n)) : fallback;
};

export async function uploadLogoAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const auth = await adminOrError();
  if (!auth.staff) return { error: auth.error };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file to upload." };
  if (file.size > LOGO_MAX_BYTES) return { error: "That image is larger than 2 MB. Please use a smaller version." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniff(bytes);
  if (!contentType || !LOGO_TYPES[contentType])
    return { error: "Please upload a PNG, JPG or GIF. (SVG and WebP don't show in many email apps.)" };
  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Logo";
  const last = await db().emailLogo.aggregate({ _max: { sortOrder: true } });
  await db().emailLogo.create({
    data: {
      name,
      contentType,
      data: bytes,
      width: clampWidth(formData.get("width"), 160),
      inAutomated: formData.get("inAutomated") === "on",
      sortOrder: (last._max.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/admin/emails", "layout");
  return { message: `Added “${name}”.` };
}

export async function logoAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const auth = await adminOrError();
  if (!auth.staff) return { error: auth.error };
  const id = String(formData.get("id") ?? "");
  const logo = await db().emailLogo.findFirst({ where: { id, removedAt: null }, select: { id: true, name: true, width: true, sortOrder: true } });
  if (!logo) return { error: "That logo has already been removed." };
  const op = String(formData.get("op") ?? "");

  if (op === "remove") {
    await db().emailLogo.update({ where: { id }, data: { removedAt: new Date() } });
    revalidatePath("/admin/emails", "layout");
    return { message: `Removed “${logo.name}”. It won't be added to any more emails.` };
  }
  if (op === "up" || op === "down") {
    const all = await db().emailLogo.findMany({
      where: { removedAt: null },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const i = all.findIndex((l) => l.id === id);
    const j = op === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return {};
    [all[i], all[j]] = [all[j], all[i]];
    await db().$transaction(all.map((l, n) => db().emailLogo.update({ where: { id: l.id }, data: { sortOrder: n } })));
    revalidatePath("/admin/emails", "layout");
    return {};
  }
  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || logo.name;
  await db().emailLogo.update({
    where: { id },
    data: { name, width: clampWidth(formData.get("width"), logo.width), inAutomated: formData.get("inAutomated") === "on" },
  });
  revalidatePath("/admin/emails", "layout");
  return { message: "Saved." };
}
