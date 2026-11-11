import type { Metadata } from "next";
import Link from "next/link";
import type { Member, MemberStatus } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/staff";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { countryName } from "@/lib/countries";
import { mightyConfigured } from "@/lib/mighty";
import { checkPayments } from "@/lib/stripe";
import { ActionForm } from "./ActionForm";
import { signOut } from "./login/actions";
import { ALERT_TITLES, STAGES, STAGE_ORDER, billingLabel, plain } from "./labels";
import {
  memberAction,
  openPaymentsAction,
  resendPaymentLinksAction,
  resolveAlertAction,
} from "./actions";

export const metadata: Metadata = { title: "Circle dashboard", robots: { index: false, follow: false } };

const PAYING = new Set<MemberStatus>(["paid", "invited", "joined_network", "in_circle", "academy_complete"]);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; flag?: string; q?: string }> }) {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const { status, flag, q } = await searchParams;
  const filterStatus = STAGE_ORDER.includes(status as MemberStatus) ? (status as MemberStatus) : undefined;
  const auto = mightyConfigured();

  const [counts, alerts, needSpaces, flagged, members, jobs, payments] = await Promise.all([
    db().member.groupBy({ by: ["status"], _count: true }),
    db().alert.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 50 }),
    db().member.findMany({ where: { status: "joined_network" }, orderBy: { mnJoinedAt: "asc" }, take: 50 }),
    db().member.findMany({ where: { followUpFlag: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
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
    db().jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 1 }),
    checkPayments(),
  ]);
  const count = (s: MemberStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + c._count, 0);
  const waiting = count("eoi_registered");
  const paying = [...PAYING].reduce((n, s) => n + count(s), 0);
  const todo = alerts.length + needSpaces.length + flagged.length;
  const lastRun = jobs[0];

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <header className="dash-head">
          <div>
            <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
            <h1 className="flow-title">Dashboard</h1>
            <p className="muted">Everyone who has signed up, where they are, and anything that needs you.</p>
          </div>
          <nav className="dash-links" aria-label="Admin">
            {isAdmin && (
              <>
                <Link href="/admin/emails/drafts" className="button outline small"><span>Emails</span></Link>
                <Link href="/admin/settings" className="button outline small"><span>Settings</span></Link>
                <Link href="/admin/team" className="button outline small"><span>Team</span></Link>
              </>
            )}
            <span className="muted small">Signed in as {staff.name}</span>
            <form action={signOut}>
              <button type="submit" className="link-btn">Sign out</button>
            </form>
          </nav>
        </header>

        {!payments.ok && (
          <p className="warn small">
            Payments aren&apos;t set up correctly, so members can&apos;t pay and payment links are on hold.{" "}
            {isAdmin ? <><Link href="/admin/settings#payments">Open Settings</Link> to see what&apos;s wrong.</> : "Please let an admin know."}
          </p>
        )}

        {lastRun && !lastRun.ok && (
          <p className="warn small">
            The last automatic email check had a problem. {isAdmin ? <><Link href="/admin/settings#automatic">Open Settings</Link> to run it again.</> : "Please let an admin know."}
          </p>
        )}

        {/* At a glance */}
        <div className="dash-tiles">
          <Link href="/admin" className="tile">
            <b>{total}</b>
            <span>People in total</span>
          </Link>
          <div className="tile">
            <b>{waiting + count("payment_open")}</b>
            <span>Interested, not paid yet</span>
          </div>
          <div className="tile">
            <b>{paying}</b>
            <span>Paying members</span>
          </div>
          <a href="#todo" className={`tile ${todo ? "attention" : "calm"}`}>
            <b>{todo}</b>
            <span>{todo === 1 ? "Thing needs you" : "Things need you"}</span>
          </a>
        </div>

        {/* Send payment links: only shown while people are waiting */}
        {isAdmin && waiting > 0 && (
          <div className="flow-card dash-callout">
            <div>
              <h3>
                {waiting} {waiting === 1 ? "person is" : "people are"} waiting for a payment link
              </h3>
              <p className="muted small">
                Pressing the button emails each of them their own link to pay and join. Do this on the day payments
                open (21 November). Anyone who registers later is included the next time you press it.
              </p>
            </div>
            <ActionForm action={openPaymentsAction} confirm={{ title: "Send payment links now?", message: `${waiting} ${waiting === 1 ? "person" : "people"} will be emailed a personal payment link.`, confirmLabel: `Send ${waiting === 1 ? "1 email" : `${waiting} emails`}` }}>
              <button className="button" type="submit"><span>Send payment links</span></button>
            </ActionForm>
          </div>
        )}

        {/* Resend payment links to everyone who has one but has not paid */}
        {count("payment_open") > 0 && (
          <div className="flow-card dash-callout">
            <div>
              <h3>
                {count("payment_open")} {count("payment_open") === 1 ? "person has" : "people have"} a payment link but
                {count("payment_open") === 1 ? " has" : " have"} not paid yet
              </h3>
              <p className="muted small">
                Email each of them their payment link again. Reminders also go automatically 3 and 7 days after the
                first link. To resend to one person only, use the button on her row below.
              </p>
            </div>
            <ActionForm
              action={resendPaymentLinksAction}
              confirm={{ title: "Resend payment links?", message: [`${count("payment_open")} ${count("payment_open") === 1 ? "person who hasn't" : "people who haven't"} paid yet will get their payment link again.`, "Anyone already sent a reminder today is skipped."], confirmLabel: "Resend links" }}
            >
              <button className="button outline" type="submit"><span>Resend payment links</span></button>
            </ActionForm>
          </div>
        )}

        {/* To do */}
        <h2 className="admin-h" id="todo">Needs your attention</h2>
        {todo === 0 ? (
          <p className="dash-clear">All clear. Nothing needs you right now.</p>
        ) : (
          <ul className="todo-list">
            {needSpaces.map((m) => (
              <li key={m.id} className="todo">
                <div>
                  <strong>Add {m.firstName} {m.lastName} to the private spaces</strong>
                  <p className="muted small">
                    She has paid and joined Mighty Networks{auto ? ", but we could not add her automatically" : ""}. On
                    Mighty Networks, add {m.mnEmail ?? m.email} to the five private spaces (Academy, Library, Community,
                    Monthly Live and Partner Directory), then press <em>Spaces added</em>. That sends her welcome email.
                  </p>
                </div>
                <div className="todo-actions">
                  <ActionForm action={memberAction} confirm={{ title: `Have you added ${m.firstName} to all five private spaces?`, confirmLabel: "Yes, all five" }}>
                    <input type="hidden" name="id" value={m.id} />
                    <button name="op" value="spaces-added" className="button small"><span>Spaces added</span></button>
                  </ActionForm>
                  {auto && (
                    <ActionForm action={memberAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button name="op" value="retry-spaces" className="link-btn">Try automatically again</button>
                    </ActionForm>
                  )}
                </div>
              </li>
            ))}
            {flagged.map((m) => (
              <li key={m.id} className="todo">
                <div>
                  <strong>Get in touch with {m.firstName} {m.lastName}</strong>
                  <p className="muted small">
                    {m.followUpReason ?? "Flagged for a personal follow-up"}. The automatic reminders have stopped, so a
                    personal message may help. {m.email}
                    {m.phone ? ` · ${m.phone}` : ""}
                  </p>
                </div>
                <div className="todo-actions">
                  <ActionForm action={memberAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button name="op" value="clear-flag" className="button small outline"><span>Done</span></button>
                  </ActionForm>
                </div>
              </li>
            ))}
            {alerts.map((a) => (
              <li key={a.id} className="todo">
                <div>
                  <strong>{ALERT_TITLES[a.code] ?? "Something needs checking"}</strong>
                  <p className="muted small">
                    {plain(a.summary)}{" "}
                    <span className="nowrap">({a.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })})</span>
                  </p>
                </div>
                <div className="todo-actions">
                  <ActionForm action={resolveAlertAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="button small outline"><span>Done</span></button>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Members */}
        <h2 className="admin-h">Members</h2>
        <nav className="admin-pills" aria-label="Show members by stage">
          <Link href="/admin" className={!filterStatus && !flag ? "on" : ""}>
            Everyone <b>{total}</b>
          </Link>
          {STAGE_ORDER.map((s) => (
            <Link key={s} href={`/admin?status=${s}`} className={filterStatus === s ? "on" : ""} title={STAGES[s].help}>
              {STAGES[s].label} <b>{count(s)}</b>
            </Link>
          ))}
          <Link href="/admin?flag=1" className={flag ? "on" : ""}>
            To follow up <b>{flagged.length}</b>
          </Link>
        </nav>
        {filterStatus && <p className="muted small">{STAGES[filterStatus].help}</p>}

        <form className="admin-search" role="search">
          {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
          <input name="q" placeholder="Search by name, email or phone" defaultValue={q} aria-label="Search members" />
          <button className="button small" type="submit"><span>Search</span></button>
          {q && (
            <Link href={filterStatus ? `/admin?status=${filterStatus}` : "/admin"} className="small">
              Clear
            </Link>
          )}
        </form>

        {members.length === 0 ? (
          <p className="dash-clear">{q ? `Nobody matches “${q}”.` : "Nobody here yet."}</p>
        ) : (
          <>
            <div className="admin-table-wrap members-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Stage</th>
                    <th>Signed up</th>
                    <th>Paid</th>
                    <th>Renews</th>
                    <th>Academy</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td><MemberName m={m} /></td>
                      <td><Stage m={m} /></td>
                      <td className="nowrap">{formatDate(m.createdAt)}</td>
                      <td><Paid m={m} /></td>
                      <td className="nowrap"><Renews m={m} /></td>
                      <td><Academy m={m} /></td>
                      <td className="small notes"><Notes m={m} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="member-cards">
              {members.map((m) => (
                <li key={m.id} className="member-card">
                  <div className="member-card-head">
                    <MemberName m={m} />
                    <span className={`badge ${STAGES[m.status].tone}`}>{STAGES[m.status].label}</span>
                  </div>
                  <dl className="member-card-facts">
                    <div><dt>Signed up</dt><dd>{formatDate(m.createdAt)}</dd></div>
                    <div><dt>Paid</dt><dd><Paid m={m} /></dd></div>
                    <div><dt>Renews</dt><dd><Renews m={m} /></dd></div>
                    <div><dt>Academy</dt><dd><Academy m={m} /></dd></div>
                  </dl>
                  {hasNotes(m) && (
                    <div className="member-card-notes small notes">
                      <Notes m={m} />
                    </div>
                  )}
                  <Link href={`/admin/members/${m.id}`} className="member-card-more small">
                    View details →
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

      </div>
    </section>
  );
}

type Row = Member;
const fullName = (m: Row) => `${m.firstName} ${m.lastName}`.trim() || m.email;
const inCircle = (m: Row) => m.status === "in_circle" || m.status === "academy_complete";
const canLinkMighty = (m: Row) => m.status === "paid" || m.status === "invited" || m.status === "joined_network";
const hasNotes = (m: Row) => m.followUpFlag || !!m.contributorTrack || canLinkMighty(m);

function MemberName({ m }: { m: Row }) {
  return (
    <div className="member-name">
      <Link href={`/admin/members/${m.id}`} className="member-link">
        <strong>{fullName(m)}</strong>
      </Link>
      <div className="muted small">{m.email}</div>
      {(m.phone || m.country) && (
        <div className="muted small">{[m.phone, countryName(m.country)].filter(Boolean).join(" · ")}</div>
      )}
      {m.mnEmail && <div className="muted small">Platform email: {m.mnEmail}</div>}
    </div>
  );
}

function Stage({ m }: { m: Row }) {
  const stage = STAGES[m.status];
  return (
    <>
      <span className={`badge ${stage.tone}`}>{stage.label}</span>
      <div className="muted small stage-help">{stage.help}</div>
    </>
  );
}

function Paid({ m }: { m: Row }) {
  return (
    <>
      <span className="nowrap">{m.paidAt ? formatDate(m.paidAt) : "Not paid"}</span>
      {m.priceTier === "manual" && <div className="muted small">Recorded by the team</div>}
      {m.status === "payment_open" && (
        <ActionForm
          action={memberAction}
          confirm={{ title: `Email ${m.firstName} her payment link again?`, message: `It will go to ${m.email}.`, confirmLabel: "Send link" }}
        >
          <input type="hidden" name="id" value={m.id} />
          <button name="op" value="resend-link" className="link-btn">Resend payment link</button>
        </ActionForm>
      )}
    </>
  );
}

function Renews({ m }: { m: Row }) {
  return (
    <>
      {m.renewalDate ? formatDate(m.renewalDate) : "—"}
      {m.subscriptionStatus && m.subscriptionStatus !== "active" && (
        <div className={`small ${m.subscriptionStatus === "payment_failed" ? "warn" : "muted"}`}>
          {billingLabel(m.subscriptionStatus)}
        </div>
      )}
    </>
  );
}

function Academy({ m }: { m: Row }) {
  if (!inCircle(m)) return <>—</>;
  return (
    <div className="progress" title={`${m.academyProgressPct}% complete`}>
      <span style={{ width: `${m.academyProgressPct}%` }} />
      <em>{m.academyProgressPct}%</em>
    </div>
  );
}

function Notes({ m }: { m: Row }) {
  return (
    <>
      {m.followUpFlag && <div className="warn">Needs a personal follow-up</div>}
      {m.contributorTrack && <div>Wants to contribute: {m.contributorTrack}</div>}
      {m.contributorTrack?.includes("Mentor") && (
        <ActionForm action={memberAction}>
          <input type="hidden" name="id" value={m.id} />
          <button name="op" value="mentor" className="link-btn">
            {m.mentorMatched ? "Mentor matched ✓ (undo)" : "Mark mentor matched"}
          </button>
        </ActionForm>
      )}
      {canLinkMighty(m) && (
        <details className="mini">
          <summary>Joined the platform with a different email?</summary>
          <ActionForm action={memberAction} className="inline">
            <input type="hidden" name="id" value={m.id} />
            <input name="mnEmail" type="email" placeholder="Email she used there" className="admin-input" aria-label="Email she used on Mighty Networks" />
            <button name="op" value="link-mighty" className="link-btn">Link</button>
          </ActionForm>
        </details>
      )}
    </>
  );
}
