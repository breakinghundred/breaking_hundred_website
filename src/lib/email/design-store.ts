import "server-only";
import { db } from "../db";
import { DEFAULT_DESIGN, designOr, isDesign, type DesignId } from "./designs";
import type { TemplateId } from "./templates";

/**
 * Chosen designs live in the Setting table:
 *   email_design          the house design (automated emails, and drafts left on "house")
 *   email_design:<C01…>   an automated email that uses its own design instead
 */
const HOUSE = "email_design";
const forTemplate = (id: TemplateId) => `${HOUSE}:${id}`;

export type DesignChoices = { house: DesignId; templates: Partial<Record<TemplateId, DesignId>> };

/** Every chosen design. A problem loading them must never stop an email, so it falls back to the default. */
export async function designChoices(): Promise<DesignChoices> {
  try {
    const rows = await db().setting.findMany({ where: { key: { startsWith: HOUSE } } });
    const out: DesignChoices = { house: DEFAULT_DESIGN, templates: {} };
    for (const r of rows) {
      if (r.key === HOUSE) out.house = designOr(r.value);
      else if (isDesign(r.value)) out.templates[r.key.slice(HOUSE.length + 1) as TemplateId] = r.value;
    }
    return out;
  } catch (e) {
    console.warn("[email] designs skipped:", e instanceof Error ? e.message : e);
    return { house: DEFAULT_DESIGN, templates: {} };
  }
}

/** The design an automated email is sent in. */
export async function designFor(id: TemplateId): Promise<DesignId> {
  const c = await designChoices();
  return c.templates[id] ?? c.house;
}

/** A draft's own choice, or the house design when it's left on "house" (""). */
export async function draftDesign(stored: string): Promise<DesignId> {
  return isDesign(stored) ? stored : (await designChoices()).house;
}

export async function saveHouseDesign(design: DesignId) {
  await db().setting.upsert({ where: { key: HOUSE }, create: { key: HOUSE, value: design }, update: { value: design } });
}

/** `null` puts the email back on the house design. */
export async function saveTemplateDesign(id: TemplateId, design: DesignId | null) {
  const key = forTemplate(id);
  if (!design) await db().setting.deleteMany({ where: { key } });
  else await db().setting.upsert({ where: { key }, create: { key, value: design }, update: { value: design } });
}
