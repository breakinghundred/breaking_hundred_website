"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, MIN_PASSWORD, readInvite } from "@/lib/staff";
import { startSession } from "../login/actions";

export type WelcomeState = { error?: string };

export async function setPassword(_: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const user = await readInvite(String(formData.get("t") ?? ""));
  if (!user) return { error: "This link has expired or has already been used. Please ask an admin to send you a new one." };
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Please choose a password of at least ${MIN_PASSWORD} characters.` };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two passwords do not match. Please type them again." };

  // Bumping the version uses up this link and signs out any older sessions.
  const updated = await db().staffUser.updateMany({
    where: { id: user.id, sessionVersion: user.sessionVersion, active: true },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 }, lastSignInAt: new Date() },
  });
  if (updated.count === 0) return { error: "This link has already been used. Please sign in, or ask an admin for a new link." };
  await startSession(user.id, user.sessionVersion + 1);
  redirect("/admin");
}
