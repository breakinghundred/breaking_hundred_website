"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ONLY, requireStaff } from "@/lib/staff";
import { SAMPLE_VARS, TEMPLATE_IDS } from "@/lib/email/catalogue";
import { sendPreview } from "@/lib/email/send";
import { compile } from "@/lib/email/source";
import { designChoices, saveTemplateDesign } from "@/lib/email/design-store";
import { isDesign } from "@/lib/email/designs";
import { getSource, resetSource, saveSource, validate } from "@/lib/email/store";
import type { TemplateId } from "@/lib/email/templates";
import { optionalEnv } from "@/lib/env";

export type EditorState = { message?: string; errors?: string[] };

function templateId(raw: FormDataEntryValue | null): TemplateId {
  const id = String(raw) as TemplateId;
  if (!TEMPLATE_IDS.includes(id)) throw new Error("Unknown template");
  return id;
}

export async function editorAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  if ((await requireStaff()).role !== "admin") return { errors: [ADMIN_ONLY] };
  const id = templateId(formData.get("id"));
  const source = { subject: String(formData.get("subject") ?? ""), body: String(formData.get("body") ?? "") };
  const op = String(formData.get("op"));
  const designRaw = String(formData.get("design") ?? "");
  const own = isDesign(designRaw) ? designRaw : null;

  if (op === "reset") {
    await resetSource(id);
    revalidatePath("/admin/emails");
    revalidatePath(`/admin/emails/${id}`);
    return { message: "Reset to the original wording." };
  }

  const errors = validate(id, source);
  if (errors.length) return { errors };

  if (op === "test") {
    const to = String(formData.get("testTo") ?? "").trim() || optionalEnv("ALERT_EMAIL") || "admin@breakinghundred.org";
    if (!to.includes("@")) return { errors: ["Enter an email address for the test."] };
    const { subject, blocks } = compile(source, SAMPLE_VARS);
    try {
      await sendPreview(to, subject, blocks, undefined, own ?? (await designChoices()).house);
    } catch (e) {
      return { errors: [`Test email failed: ${e instanceof Error ? e.message : String(e)}`] };
    }
    return { message: `Test sent to ${to} with example details (not saved yet).` };
  }

  // Changing only the design keeps the email on its original wording.
  const current = await getSource(id);
  const wordingChanged = current.subject !== source.subject.trim() || current.body !== source.body.replace(/\r\n/g, "\n").trim();
  if (wordingChanged) await saveSource(id, source);
  await saveTemplateDesign(id, own);
  revalidatePath("/admin/emails", "layout");
  return { message: wordingChanged ? "Saved. The next email sent will use this wording and design." : "Saved. The next email sent will use this design." };
}
