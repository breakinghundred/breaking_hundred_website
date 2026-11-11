import type { Metadata } from "next";
import Link from "next/link";
import type { MemberStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { countryName } from "@/lib/countries";
import { mightyConfigured } from "@/lib/mighty";
import { SETTING_FIELDS, getSettings } from "@/lib/settings";
import { ActionForm } from "./ActionForm";
import {
  importAction,
  memberAction,
  openPaymentsAction,
  resolveAlertAction,
  runJobsAction,
  saveSettingsAction,
} from "./actions";

export const metadata: Metadata = { title: "Circle admin", robots: { index: false, follow: false } };

const STATUSES: MemberStatus[] = [
  "eoi_registered",
  "payment_open",
  "paid",
  "invited",
  "joined_network",
  "in_circle",
  "academy_complete",
  "lapsed",
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; flag?: string; q?: string }> }) {
  await requireAdmin();
  const { status, flag, q } = await searchParams;
  const filterStatus = STATUSES.includes(status as MemberStatus) ? (status as MemberStatus) : undefined;

  const [counts, flagged, alerts, members, settings, jobs, mightyEvents] = await Promise.all([
    db().member.groupBy({ by: ["status"], _count: true }),
    db().member.count({ where: { followUpFlag: true } }),
    db().alert.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 50 }),
    db().member.findMany({
      where: {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(flag ? { followUpFlag: true } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q.toLowerCase() } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    getSettings(),
    db().jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
    db().mightyEvent.findMany({ orderBy: { processedAt: "desc" }, take: 5 }),
  ]);
  const count = (s: MemberStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        <h1 className="flow-title">Member admin</h1>
        <p className="small"><Link href="/admin/emails">Edit email templates →</Link></p>

        <nav className="admin-pills" aria-label="Filter by status">
          <Link href="/admin" className={!filterStatus && !flag ? "on" : ""}>All</Link>
          {STATUSES.map((s) => (
            <Link key={s} href={`/admin?status=${s}`} className={filterStatus === s ? "on" : ""}>
              {s} <b>{count(s)}</b>
            </Link>
          ))}
          <Link href="/admin?flag=1" className={flag ? "on" : ""}>follow up <b>{flagged}</b></Link>
        </nav>

        <div className="admin-grid">
          <div className="flow-card">
            <h3>Open payments</h3>
            <p className="muted small">
              Sets every <code>eoi_registered</code> member to <code>payment_open</code> and sends C02 with her personal
              link. Run on 21 November. {count("eoi_registered")} waiting.
            </p>
            <ActionForm action={openPaymentsAction} confirm={`Send C02 to ${count("eoi_registered")} members now?`}>
              <button className="button" type="submit"><span>Open payments</span></button>
            </ActionForm>
          </div>
          <div className="flow-card">
            <h3>Daily jobs</h3>
            <p className="muted small">
              Run automatically each morning. Last run:{" "}
              {jobs[0] ? `${jobs[0].startedAt.toLocaleString("en-GB")} (${jobs[0].ok ? "ok" : "errors"})` : "never"}.
            </p>
            <ActionForm action={runJobsAction}>
              <button className="button outline" type="submit"><span>Run now</span></button>
            </ActionForm>
          </div>
          <div className="flow-card">
            <h3>Mighty Networks</h3>
            <p className="muted small">
              Admin API: {mightyConfigured() ? "connected" : "not configured, so spaces are added by hand"}. Last webhook:{" "}
              {mightyEvents[0] ? `${mightyEvents[0].type} at ${mightyEvents[0].processedAt.toLocaleString("en-GB")}` : "none yet"}.
            </p>
          </div>
        </div>

        {alerts.length > 0 && (
          <>
            <h2 className="admin-h">Open alerts</h2>
            <ul className="admin-alerts">
              {alerts.map((a) => (
                <li key={a.id}>
                  <strong>{a.code}</strong> {a.summary}{" "}
                  <span className="muted small">{a.createdAt.toLocaleString("en-GB")}</span>
                  <ActionForm action={resolveAlertAction} className="inline">
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="link-btn">Resolve</button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="admin-h">Members ({members.length})</h2>
        <form className="admin-search">
          {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
          <input name="q" placeholder="Search name, email or phone" defaultValue={q} />
          <button className="link-btn" type="submit">Search</button>
        </form>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Paid</th>
                <th>Renews</th>
                <th>Billing</th>
                <th>Academy</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.firstName} {m.lastName}
                    <br />
                    <span className="muted small">{m.email}{m.mnEmail ? ` · MN: ${m.mnEmail}` : ""}</span>
                    {(m.phone || m.country) && (
                      <>
                        <br />
                        <span className="muted small">{[m.phone, countryName(m.country)].filter(Boolean).join(" · ")}</span>
                      </>
                    )}
                  </td>
                  <td><code>{m.status}</code></td>
                  <td>{m.paidAt ? formatDate(m.paidAt) : ""}<br /><span className="muted small">{m.paymentReference}</span></td>
                  <td>{formatDate(m.renewalDate)}</td>
                  <td>{m.subscriptionStatus ?? ""}</td>
                  <td>{m.academyProgressPct}%</td>
                  <td className="small">
                    {m.followUpFlag && <div>⚑ {m.followUpReason}</div>}
                    {m.contributorTrack && <div>Contributor: {m.contributorTrack}</div>}
                    {m.mentorMatched && <div>Mentor matched</div>}
                  </td>
                  <td className="admin-actions">
                    {m.status === "joined_network" && (
                      <>
                        <ActionForm action={memberAction} className="inline">
                          <input type="hidden" name="id" value={m.id} />
                          <button name="op" value="retry-spaces" className="link-btn">Retry spaces</button>
                        </ActionForm>
                        <ActionForm action={memberAction} className="inline" confirm="Have you added her to all five private spaces?">
                          <input type="hidden" name="id" value={m.id} />
                          <button name="op" value="spaces-added" className="link-btn">Spaces added</button>
                        </ActionForm>
                      </>
                    )}
                    {(m.status === "paid" || m.status === "invited" || m.status === "joined_network") && (
                      <ActionForm action={memberAction} className="inline">
                        <input type="hidden" name="id" value={m.id} />
                        <input name="mnEmail" placeholder="Mighty email (A1)" className="admin-input" />
                        <button name="op" value="link-mighty" className="link-btn">Link</button>
                      </ActionForm>
                    )}
                    {m.contributorTrack?.includes("Mentor") && (
                      <ActionForm action={memberAction} className="inline">
                        <input type="hidden" name="id" value={m.id} />
                        <button name="op" value="mentor" className="link-btn">{m.mentorMatched ? "Unmark mentor" : "Mentor matched"}</button>
                      </ActionForm>
                    )}
                    {m.followUpFlag && (
                      <ActionForm action={memberAction} className="inline">
                        <input type="hidden" name="id" value={m.id} />
                        <button name="op" value="clear-flag" className="link-btn">Clear flag</button>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-grid two">
          <div className="flow-card">
            <h3>Merge links and onboarding call</h3>
            <ActionForm action={saveSettingsAction} className="admin-settings">
              {SETTING_FIELDS.map((f) => (
                <label key={f.key}>
                  {f.label}
                  <input
                    name={f.key}
                    type={"type" in f ? f.type : "url"}
                    defaultValue={settings[f.key]}
                    className="admin-input"
                  />
                </label>
              ))}
              <button className="button" type="submit"><span>Save</span></button>
            </ActionForm>
          </div>
          <div className="flow-card">
            <h3>Import the existing interest list</h3>
            <p className="muted small">
              Paste one person per line: <code>first name, last name, email</code>. Emails are lower-cased and duplicates
              merged into existing records. No email is sent; they get C02 when you open payments.
            </p>
            <ActionForm action={importAction} className="admin-settings">
              <textarea name="csv" rows={10} className="textarea" placeholder={"Ada,Okafor,ada@example.com"} />
              <button className="button outline" type="submit"><span>Import</span></button>
            </ActionForm>
          </div>
        </div>
      </div>
    </section>
  );
}
