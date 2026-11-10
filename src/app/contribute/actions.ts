"use server";

import { raiseAlert } from "@/lib/alerts";
import { db } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { readToken } from "@/lib/token";
import { TRACKS } from "./tracks";

export type ContributeState = { ok?: boolean; error?: string };

export async function submitContribution(token: string, _prev: ContributeState, formData: FormData): Promise<ContributeState> {
  const memberId = readToken(token, "contribute");
  if (!memberId) return { error: "This link is not valid. Please use the link in your email." };
  const valid = new Set<string>(TRACKS.map((t) => t.id));
  const chosen = formData.getAll("track").map(String).filter((t) => valid.has(t));
  if (chosen.length === 0) return { error: "Please choose at least one way to contribute." };
  const note = String(formData.get("note") ?? "").slice(0, 2000).trim();

  const member = await db().member.update({
    where: { id: memberId },
    data: { contributorTrack: chosen.join(", "), contributorNote: note || null, contributorAt: new Date() },
  });

  // A3: Community Moderator, plus the Academy Director for the content tracks.
  const director = optionalEnv("ACADEMY_DIRECTOR_EMAIL");
  const contentTrack = TRACKS.some((t) => t.content && chosen.includes(t.id));
  await raiseAlert(
    "A3",
    `${member.firstName} ${member.lastName} would like to contribute: ${chosen.join(", ")}.`,
    { email: member.email, note },
    [optionalEnv("MODERATOR_EMAIL"), contentTrack ? director : undefined].filter((x): x is string => Boolean(x)),
  );
  return { ok: true };
}
