"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, createSession, passwordMatches, safeNext } from "@/lib/admin-session";
import { allow, clientKey } from "@/lib/rate-limit";

export type LoginState = { error?: string };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function signIn(_: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!process.env.ADMIN_PASSWORD || !process.env.LINK_SECRET) {
    return { error: "Admin sign-in is not set up. ADMIN_PASSWORD and LINK_SECRET must both be set." };
  }
  // Every attempt counts, so guessing is capped at 5 per 15 minutes per network.
  let allowed: boolean;
  try {
    allowed = await allow(await clientKey("admin-login"), MAX_ATTEMPTS, WINDOW_MS);
  } catch (e) {
    // Fail closed: without the attempt counter we cannot cap guessing.
    console.error("Admin sign-in: rate limit check failed", e);
    return { error: "Sign-in is unavailable because the database cannot be reached. Check DATABASE_URL and that migrations have run." };
  }
  if (!allowed) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  if (!passwordMatches(password)) return { error: "That password is not right." };

  const session = createSession()!;
  (await cookies()).set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expires,
  });
  redirect(next);
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
