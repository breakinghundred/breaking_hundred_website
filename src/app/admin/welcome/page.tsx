import type { Metadata } from "next";
import Link from "next/link";
import { MIN_PASSWORD, ROLE_LABELS, readInvite } from "@/lib/staff";
import { WelcomeForm } from "./WelcomeForm";

export const metadata: Metadata = { title: "Set your password", robots: { index: false, follow: false } };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const user = await readInvite(t);

  return (
    <section className="section flow-page">
      <div className="wrap login-wrap">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        {user ? (
          <>
            <h1 className="flow-title">Welcome, {user.name.split(" ")[0]}</h1>
            <p className="muted">
              Choose a password for <b>{user.email}</b>. You are joining as <b>{ROLE_LABELS[user.role].label}</b>:{" "}
              {ROLE_LABELS[user.role].help.toLowerCase()}
            </p>
            <div className="flow-card">
              <WelcomeForm token={t} email={user.email} min={MIN_PASSWORD} />
            </div>
          </>
        ) : (
          <>
            <h1 className="flow-title">This link has expired</h1>
            <p className="muted">
              Links work once and last 7 days. Please ask an admin to send you a new one, or{" "}
              <Link href="/admin/login">sign in</Link> if you have already set your password.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
