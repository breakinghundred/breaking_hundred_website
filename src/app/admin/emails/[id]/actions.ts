"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ONLY, requireStaff } from "@/lib/staff";
import { SAMPLE_VARS, TEMPLATE_IDS } from "@/lib/email/catalogue";
import { sendPreview } from "@/lib/email/send";
import { compile } from "@/lib/email/source";
import { resetSource, saveSource, validate } from "@/lib/email/store";
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
      await sendPreview(to, subject, blocks);
    } catch (e) {
      return { errors: [`Test email failed: ${e instanceof Error ? e.message : String(e)}`] };
    }
    return { message: `Test sent to ${to} with example details (not saved yet).` };
  }

  await saveSource(id, source);
  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${id}`);
  return { message: "Saved. The next email sent will use this wording." };
}
