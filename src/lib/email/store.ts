import "server-only";
import { db } from "../db";
import { defaultSource } from "./catalogue";
import type { Source } from "./source";

export { validate } from "./catalogue";
import type { TemplateId } from "./templates";

/** The wording to send: the team's edit if there is one, otherwise the built-in default. */
export async function getSource(id: TemplateId): Promise<Source & { edited: boolean; updatedAt?: Date }> {
  const row = await db().emailTemplate.findUnique({ where: { id } });
  return row ? { subject: row.subject, body: row.body, edited: true, updatedAt: row.updatedAt } : { ...defaultSource(id), edited: false };
}

export async function editedIds() {
  const rows = await db().emailTemplate.findMany({ select: { id: true, updatedAt: true } });
  return new Map(rows.map((r) => [r.id, r.updatedAt]));
}

export async function saveSource(id: TemplateId, source: Source) {
  const data = { subject: source.subject.trim(), body: source.body.replace(/\r\n/g, "\n").trim() };
  await db().emailTemplate.upsert({ where: { id }, create: { id, ...data }, update: data });
}

export async function resetSource(id: TemplateId) {
  await db().emailTemplate.deleteMany({ where: { id } });
}
