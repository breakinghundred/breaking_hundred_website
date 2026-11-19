import "server-only";
import { db } from "../db";
import { TEMPLATE_IDS } from "./catalogue";
import type { TemplateId } from "./templates";

/**
 * Automated emails the team has turned off, stored as Setting rows `email_off:<C01…>` = "1".
 * A turned-off email is skipped wherever the site would send it by itself (jobs, webhooks,
 * payment status changes). Sending it to one person on purpose from Contacts still works.
 */
const PREFIX = "email_off:";

/** Every turned-off email. Never throws: if the list can't be read, nothing is treated as off. */
export async function pausedIds(): Promise<Set<TemplateId>> {
  try {
    const rows = await db().setting.findMany({ where: { key: { startsWith: PREFIX } } });
    return new Set(
      rows.filter((r) => r.value === "1").map((r) => r.key.slice(PREFIX.length) as TemplateId).filter((id) => TEMPLATE_IDS.includes(id)),
    );
  } catch (e) {
    console.warn("[email] paused list skipped:", e instanceof Error ? e.message : e);
    return new Set();
  }
}

export async function setPaused(id: TemplateId, paused: boolean) {
  const key = `${PREFIX}${id}`;
  if (paused) await db().setting.upsert({ where: { key }, create: { key, value: "1" }, update: { value: "1" } });
  else await db().setting.deleteMany({ where: { key } });
}
