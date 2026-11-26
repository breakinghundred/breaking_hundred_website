"use server";

import { SAMPLE_VARS, TEMPLATE_IDS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import { automatedAttachments } from "@/lib/email/attachments";
import { sendPreviews, sendTeamEmail, senderDetails } from "@/lib/email/send";
import { compile } from "@/lib/email/source";
import { getSource } from "@/lib/email/store";
import { setPaused } from "@/lib/email/paused";
import { revalidatePath } from "next/cache";
import type { TemplateId } from "@/lib/email/templates";
import { ADMIN_ONLY, currentStaff } from "@/lib/staff";
import type { AdminState } from "../actions";

/** Friendly wording for the usual reasons a test fails. */
function explain(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("RESEND_API_KEY")) return "Email is not set up on this site yet: the Resend key is missing.";
  if (/domain/i.test(msg) && /verif/i.test(msg))
    return "Resend has not verified the breakinghundred.org sending domain yet, so it refused to send. Check the DNS records in Resend.";
  if (/rate limit|too many/i.test(msg)) return "Resend asked us to slow down. Wait a minute and try again.";
  return `The test email could not be sent. ${msg.replace(/^Resend: /, "Resend said: ")}`;
}

export async function testEmailsAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const staff = await currentStaff();
  if (!staff) return { error: "Please sign in again." };
  if (staff.role !== "admin") return { error: ADMIN_ONLY };

  const to = String(formData.get("to") ?? "").trim() || staff.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Enter a valid email address for the test." };
  const which = String(formData.get("which") ?? "check");

  try {
    if (which === "check") {
      const { from, replyTo } = senderDetails();
      await sendTeamEmail(to, "[Test] The Circle email check", [
        "This is a test from The Circle admin. If you are reading it, email from the website is working.",
        `It was sent by ${staff.name} at ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })} (UK time).`,
        `Emails to members come from ${from}, and their replies go to ${replyTo}.`,
        "If this landed in spam, mark it as not spam and check the sending domain's SPF, DKIM and DMARC records.",
      ]);
      if (!senderDetails().configured) return { message: "Email is not set up here, so the test was printed in the server log instead." };
      return { message: done(to, "a test email") };
    }

    const ids: TemplateId[] = which === "all" ? TEMPLATE_IDS : TEMPLATE_IDS.filter((id) => id === which);
    if (!ids.length) return { error: "Choose which email to send." };
    const emails = await Promise.all(
      ids.map(async (id) => ({ ...compile(await getSource(id), SAMPLE_VARS), files: await automatedAttachments(id) })),
    );
    const delivered = await sendPreviews(to, emails);
    const what = ids.length === 1 ? `“${TEMPLATE_INFO[ids[0]].name}”` : `all ${ids.length} member emails`;
    if (!delivered) return { message: `Email is not set up here, so ${what} ${ids.length === 1 ? "was" : "were"} printed in the server log instead.` };
    const they = ids.length === 1 ? "It uses" : "They use";
    return { message: `${done(to, what)} ${they} example details (Ada Okafor), so the links won't work.` };
  } catch (e) {
    return { error: explain(e) };
  }
}

const done = (to: string, what: string) => `Sent ${what} to ${to}. Allow a minute, and check spam if nothing arrives.`;

/** Turn one automated email off (it stops sending by itself) or back on. */
export async function toggleEmailAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const staff = await currentStaff();
  if (!staff) return { error: "Please sign in again." };
  if (staff.role !== "admin") return { error: ADMIN_ONLY };
  const id = String(formData.get("id") ?? "") as TemplateId;
  if (!TEMPLATE_IDS.includes(id)) return { error: "Please refresh the page and try again." };
  const off = formData.get("op") === "off";
  try {
    await setPaused(id, off);
  } catch (e) {
    console.error("Toggle email failed", e);
    return { error: "Sorry, that did not work. Please try again." };
  }
  revalidatePath("/admin", "layout");
  return {
    message: off
      ? `“${TEMPLATE_INFO[id].name}” is turned off. It won't be sent to anyone until you turn it back on.`
      : `“${TEMPLATE_INFO[id].name}” is turned on again. It will be sent as normal from now on.`,
  };
}
