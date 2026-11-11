import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, safeNext, verifySession } from "@/lib/admin-session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  // Already signed in: go straight through.
  if (verifySession((await cookies()).get(ADMIN_COOKIE)?.value)) redirect(next);

  return (
    <section className="section flow-page">
      <div className="wrap login-wrap">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        <h1 className="flow-title">Admin sign in</h1>
        <p className="muted">For the Breaking Hundred team. You stay signed in for 12 hours on this device.</p>
        <div className="flow-card">
          <LoginForm next={next} />
        </div>
      </div>
    </section>
  );
}
