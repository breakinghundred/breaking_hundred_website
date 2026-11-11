"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, createSession, safeNext } from "@/lib/admin-session";
import { allow, clientKey } from "@/lib/rate-limit";
import { authenticate } from "@/lib/staff";

export type LoginState = { error?: string; email?: string };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function startSession(staffId: string, version: number) {
  const session = createSession(staffId, version);
  if (!session) throw new Error("LINK_SECRET is not set");
  (await cookies()).set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expires,
  });
}

export async function signIn(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!process.env.LINK_SECRET) return { email, error: "Admin sign-in is not set up: LINK_SECRET must be set." };
  // Every attempt counts, so guessing is capped at 5 per 15 minutes per network.
  let result: Awaited<ReturnType<typeof authenticate>>;
  try {
    if (!(await allow(await clientKey("admin-login"), MAX_ATTEMPTS, WINDOW_MS))) {
      return { email, error: "Too many attempts. Please wait 15 minutes and try again." };
    }
    result = await authenticate(email, password);
  } catch (e) {
    // Fail closed: without the attempt counter we cannot cap guessing.
    console.error("Admin sign-in failed", e);
    return { email, error: "Sign-in is unavailable because the database cannot be reached. Check DATABASE_URL and that migrations have run." };
  }
  if (!result) return { email, error: "That email and password do not match. Check both and try again." };

  await startSession(result.staff.id, result.version);
  redirect(next);
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
