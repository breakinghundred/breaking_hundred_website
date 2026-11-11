import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireStaff } from "@/lib/staff";
import { countryName } from "@/lib/countries";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/dates";
import { TEMPLATE_INFO } from "@/lib/email/catalogue";
import type { TemplateId } from "@/lib/email/templates";
import { paymentChangesFor } from "@/lib/members";
import { ActionForm } from "../../ActionForm";
import { PaymentStatusForm } from "../../PaymentStatusForm";
import { memberAction } from "../../actions";
import { newDraftAction } from "../../emails/mail-actions";
import { STAGES, billingLabel } from "../../labels";

export const metadata: Metadata = { title: "Member details", robots: { index: false, follow: false } };

const when = (d: Date | null | undefined) =>
  d ? d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }) : null;

/** Link into the Stripe dashboard, in test or live mode to match the keys in use. */
function stripeUrl(kind: "customers" | "subscriptions", id: string) {
  const test = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test") ? "/test" : "";
  return `https://dashboard.stripe.com${test}/${kind}/${id}`;
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="detail-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value === null || value === undefined || value === "" ? <span className="muted">Not yet</span> : value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const { id } = await params;
  const m = await db().member.findUnique({ where: { id }, include: { emails: { orderBy: { sentAt: "desc" } } } });
  if (!m) notFound();

  const stage = STAGES[m.status];
  const name = `${m.firstName} ${m.lastName}`.trim();
  const paid = !!m.paidAt;
  const manual = m.priceTier === "manual";

  const journey: [string, Date | null][] = [
    ["Registered interest", m.eoiSubmittedAt],
    ["Payment link sent", m.paymentOpenedAt],
    ["Paid", m.paidAt],
    ["Invited to Mighty Networks", m.mnInvitedAt],
    ["Joined Mighty Networks", m.mnJoinedAt],
    ["Added to the private spaces", m.spacesAddedAt],
  ];

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <p className="small"><Link href="/admin">← Back to the dashboard</Link></p>
        <span className="eyebrow" style={{ color: "var(--wine)" }}>Member details</span>
        <h1 className="flow-title">{name || m.email}</h1>
        <p>
          <span className={`badge ${stage.tone}`}>{stage.label}</span> <span className="muted small">{stage.help}</span>
        </p>
        {m.followUpFlag && <p className="warn small">Needs a personal follow-up{m.followUpReason ? `: ${m.followUpReason}` : "."}</p>}

        <div className="detail-grid">
          <div className="detail-card">
            <h2>Registration</h2>
            <Rows
              rows={[
                ["Full name", name || null],
                ["Email", <a key="e" href={`mailto:${m.email}`}>{m.email}</a>],
                ["Phone", m.phone ? <a key="p" href={`tel:${m.phone.replace(/\s/g, "")}`}>{m.phone}</a> : null],
                ["Country of residence", countryName(m.country) || null],
                ["Registered on", when(m.eoiSubmittedAt)],
                ["Happy to receive emails", m.emailConsent ? "Yes" : "No"],
                ["Email used on Mighty Networks", m.mnEmail ?? (m.mnJoinedAt ? "Same as above" : null)],
              ]}
            />
          </div>

          <div className="detail-card">
            <h2>Payment</h2>
            <Rows
              rows={[
                ["Payment", paid ? <strong key="s" className="ok-text">Paid</strong> : <strong key="s">Not paid yet</strong>],
                ["Amount", paid ? formatMoney(m.amount, m.currency ?? "gbp") : null],
                ["Paid on", when(m.paidAt)],
                ["How she paid", paid ? (manual ? "Recorded by the team (outside the website)" : "Card, through the website (Stripe)") : null],
                ["Payment reference", m.paymentReference],
                ["Renews on", m.renewalDate ? formatDate(m.renewalDate) : null],
                ["Billing", m.subscriptionStatus ? billingLabel(m.subscriptionStatus) : null],
                ["Failed renewal attempts", m.failedPaymentCount || "None"],
                ["Payment reminders sent", m.paymentReminders || "None"],
              ]}
            />
            {(m.stripeCustomerId || m.stripeSubscriptionId) && (
              <p className="small">
                {m.stripeCustomerId && <a href={stripeUrl("customers", m.stripeCustomerId)} target="_blank" rel="noopener noreferrer">View her in Stripe ↗</a>}
                {m.stripeCustomerId && m.stripeSubscriptionId && " · "}
                {m.stripeSubscriptionId && <a href={stripeUrl("subscriptions", m.stripeSubscriptionId)} target="_blank" rel="noopener noreferrer">View her membership in Stripe ↗</a>}
              </p>
            )}
            {m.status === "payment_open" && (
              <ActionForm action={memberAction} confirm={{ title: `Email ${m.firstName} her payment link again?`, message: `It will go to ${m.email}.`, confirmLabel: "Send link" }}>
                <input type="hidden" name="id" value={m.id} />
                <button name="op" value="resend-link" className="button outline small"><span>Resend payment link</span></button>
              </ActionForm>
            )}
            {isAdmin && (
              <details className="mini">
                <summary>Change payment status</summary>
                <PaymentStatusForm id={m.id} name={name || m.email} options={paymentChangesFor(m.status)} />
              </details>
            )}
          </div>

          <div className="detail-card">
            <h2>Journey</h2>
            <ol className="timeline">
              {journey.map(([label, date]) => (
                <li key={label} className={date ? "done" : ""}>
                  <b>{label}</b>
                  <span className="muted small">{when(date) ?? "Not yet"}</span>
                </li>
              ))}
              <li className={m.academyProgressPct > 0 ? "done" : ""}>
                <b>Academy</b>
                <span className="muted small">{m.academyProgressPct}% complete</span>
              </li>
            </ol>
          </div>

          <div className="detail-card">
            <h2>Emails sent to her</h2>
            {isAdmin && (
              <form action={newDraftAction} className="mail-toolbar">
                <input type="hidden" name="to" value={m.id} />
                <button className="button small outline"><span>Write an email to her</span></button>
              </form>
            )}
            {m.emails.length === 0 ? (
              <p className="muted small">No emails yet.</p>
            ) : (
              <ul className="email-history">
                {m.emails.map((e) => (
                  <li key={e.id}>
                    <b>{TEMPLATE_INFO[e.templateId as TemplateId]?.name ?? e.subject ?? "Email"}</b>
                    <span className="muted small">
                      {e.scheduledAt && e.scheduledAt > e.sentAt ? `Scheduled for ${when(e.scheduledAt)}` : when(e.sentAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(m.contributorTrack || m.notes) && (
            <div className="detail-card">
              <h2>Notes</h2>
              <Rows
                rows={[
                  ...(m.contributorTrack ? ([["Wants to contribute as", m.contributorTrack]] as [string, ReactNode][]) : []),
                  ...(m.contributorNote ? ([["What she said", m.contributorNote]] as [string, ReactNode][]) : []),
                  ...(m.contributorTrack?.includes("Mentor") ? ([["Mentor matched", m.mentorMatched ? "Yes" : "Not yet"]] as [string, ReactNode][]) : []),
                  ...(m.notes ? ([["Team notes", m.notes]] as [string, ReactNode][]) : []),
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
