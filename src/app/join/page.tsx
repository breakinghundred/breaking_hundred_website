import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, renewalDateFor } from "@/lib/dates";
import { makeToken, readToken } from "@/lib/token";
import { site } from "@/lib/site";
import { PayForm } from "./PayForm";

export const metadata: Metadata = { title: "Join The Circle", robots: { index: false } };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const memberId = readToken(t, "join");
  const member = memberId ? await db().member.findUnique({ where: { id: memberId } }) : null;

  if (!member || !t) {
    return (
      <Shell title="This link is not valid.">
        <p className="muted">
          Please use the personal payment link from your email. If you have not registered yet,{" "}
          <Link href="/interest">register your interest here</Link>. Need help? Email{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </Shell>
    );
  }

  if (member.paidAt) {
    return (
      <Shell title={`Your place is confirmed, ${member.firstName}.`}>
        <p className="muted">
          We have received your payment. Check your inbox for your payment confirmation and your instructions for
          joining Mighty Networks. Your membership renews on {formatDate(member.renewalDate)}.
        </p>
        <p>
          <a href={`/billing?t=${makeToken(member.id, "billing")}`}>Manage your membership and card</a>
        </p>
      </Shell>
    );
  }

  if (member.status === "eoi_registered") {
    return (
      <Shell title={`Thank you, ${member.firstName}.`}>
        <p className="muted">Payment is not open yet. We will email your personal payment link on 21 November.</p>
      </Shell>
    );
  }

  const renewal = formatDate(member.renewalDate ?? renewalDateFor(new Date()));
  return (
    <Shell title={`Welcome, ${member.firstName}.`}>
      <p className="muted">Confirm your place in The Circle: one year of the Academy, Library, Community, Monthly Live and Partner Directory.</p>
      <div className="flow-card">
        <dl className="facts">
          <dt>Price</dt>
          <dd>£299 for your first membership period</dd>
          <dt>Renews</dt>
          <dd>Automatically on {renewal}, then every 12 months, at £299</dd>
          <dt>Cancel</dt>
          <dd>Any time before a renewal date, online in your billing settings (link in every email). You keep access until then.</dd>
          <dt>Email</dt>
          <dd>{member.email}</dd>
        </dl>
        <PayForm token={t} renewalDate={renewal} />
        <p className="notice">
          Read our <a href={site.privacy} target="_blank" rel="noopener noreferrer">privacy policy</a>. Questions?
          Email <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section flow-page">
      <div className="wrap join">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle membership</span>
        <h1 className="flow-title">{title}</h1>
        {children}
      </div>
    </section>
  );
}
