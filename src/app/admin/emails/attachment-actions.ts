"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { addAttachment, type AttachmentOwner } from "@/lib/email/attachments";
import { TEMPLATE_IDS } from "@/lib/email/catalogue";
import type { TemplateId } from "@/lib/email/templates";
import { ADMIN_ONLY, currentStaff } from "@/lib/staff";

export type AttachmentResult = { message?: string; error?: string };

/** "draft:<id>" or "template:<C04>", from the attachments box. */
async function ownerFrom(raw: string): Promise<AttachmentOwner | null> {
  const [kind, id] = raw.split(":");
  if (kind === "template" && TEMPLATE_IDS.includes(id as TemplateId)) return { templateId: id as TemplateId };
  if (kind === "draft" && /^[a-z0-9]{10,40}$/i.test(id ?? "")) {
    const draft = await db().emailDraft.findUnique({ where: { id }, select: { id: true } });
    return draft ? { draftId: draft.id } : null;
  }
  return null;
}

const pathFor = (owner: AttachmentOwner) =>
  "draftId" in owner ? `/admin/emails/drafts/${owner.draftId}` : `/admin/emails/${owner.templateId}`;

export async function uploadAttachmentAction(formData: FormData): Promise<AttachmentResult> {
  const staff = await currentStaff();
  if (!staff) return { error: "Please sign in again." };
  if (staff.role !== "admin") return { error: ADMIN_ONLY };
  const owner = await ownerFrom(String(formData.get("owner") ?? ""));
  if (!owner) return { error: "This email has been deleted. Please go back and refresh the page." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to attach." };
  try {
    const result = await addAttachment(owner, file, staff.email);
    if ("error" in result) return { error: result.error };
    revalidatePath(pathFor(owner));
    if ("templateId" in owner) revalidatePath("/admin/emails");
    return { message: `Attached “${result.filename}”.` };
  } catch (e) {
    console.error("Attachment upload failed", e);
    return { error: "Sorry, the file could not be saved. Please try again." };
  }
}

export async function removeAttachmentAction(formData: FormData): Promise<AttachmentResult> {
  const staff = await currentStaff();
  if (!staff) return { error: "Please sign in again." };
  if (staff.role !== "admin") return { error: ADMIN_ONLY };
  const owner = await ownerFrom(String(formData.get("owner") ?? ""));
  if (!owner) return { error: "This email has been deleted. Please go back and refresh the page." };
  const id = String(formData.get("id") ?? "");
  const removed = await db().emailAttachment.deleteMany({ where: { id, ...("draftId" in owner ? { draftId: owner.draftId } : { templateId: owner.templateId }) } });
  revalidatePath(pathFor(owner));
  if ("templateId" in owner) revalidatePath("/admin/emails");
  return removed.count ? { message: "Removed. It won't be sent with this email any more." } : {};
}
