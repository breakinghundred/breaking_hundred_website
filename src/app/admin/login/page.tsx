import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/admin-session";
import { currentStaff } from "@/lib/staff";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  // Already signed in: go straight through.
  if (await currentStaff().catch(() => null)) redirect(next);

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
