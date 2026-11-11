import type { Metadata } from "next";
import Link from "next/link";
import type { MemberStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { SENDABLE_TEMPLATE_IDS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import type { TemplateId } from "@/lib/email/templates";
import { requireAdminPage } from "@/lib/staff";
import { ActionForm } from "../../ActionForm";
import { STAGES, STAGE_ORDER } from "../../labels";
import { MailHeader } from "../MailNav";
import { newDraftAction, sendToContactAction } from "../mail-actions";

export const metadata: Metadata = { title: "Contacts", robots: { index: false, follow: false } };

const PAGE = 100;

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string }> }) {
  await requireAdminPage();
  const { q = "", stage } = await searchParams;
  const status = STAGE_ORDER.includes(stage as MemberStatus) ? (stage as MemberStatus) : undefined;
  const term = q.trim();
  const where: Prisma.MemberWhereInput = {
    ...(status ? { status } : {}),
    ...(term
      ? {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [contacts, total, drafts] = await Promise.all([
    db().member.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: PAGE,
      include: { emails: { orderBy: { sentAt: "desc" }, take: 1 } },
    }),
    db().member.count({ where }),
    db().emailDraft.findMany({ where: { subject: { not: "" } }, orderBy: { updatedAt: "desc" }, select: { id: true, subject: true } }),
  ]);

  const options = (
    <>
      <option value="">Choose an email…</option>
      {drafts.length > 0 && (
        <optgroup label="Your emails">
          {drafts.map((d) => <option key={d.id} value={`draft:${d.id}`}>{d.subject}</option>)}
        </optgroup>
      )}
      <optgroup label="Automated emails">
        {SENDABLE_TEMPLATE_IDS.map((id) => <option key={id} value={id}>{TEMPLATE_INFO[id].name}</option>)}
      </optgroup>
    </>
  );

  const lastEmail = (e: { templateId: string; subject: string | null; sentAt: Date } | undefined) =>
    e ? `${TEMPLATE_INFO[e.templateId as TemplateId]?.name ?? e.subject ?? "Email"} · ${formatDate(e.sentAt)}` : null;

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <MailHeader
          active="contacts"
          title="Contacts"
          intro="Everyone who registers is added here automatically. Send any of your emails or an automated email to one person, or start a new email to them."
        />

        <form className="admin-search" role="search">
          <input name="q" placeholder="Search by name or email" defaultValue={q} aria-label="Search contacts" />
          <select name="stage" defaultValue={status ?? ""} className="admin-input" aria-label="Stage">
            <option value="">Every stage</option>
            {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGES[s].label}</option>)}
          </select>
          <button className="button small" type="submit"><span>Search</span></button>
          {(term || status) && <Link href="/admin/emails/contacts" className="small">Clear</Link>}
        </form>

        <p className="small muted">
          {total === 0 ? "" : total > PAGE ? `Showing the first ${PAGE} of ${total}. Search to narrow it down.` : `${total} ${total === 1 ? "contact" : "contacts"}.`}
        </p>

        {contacts.length === 0 ? (
          <p className="dash-clear">{term || status ? "Nobody matches." : "Nobody has registered yet."}</p>
        ) : (
          <ul className="contact-list">
            {contacts.map((m) => {
              const name = `${m.firstName} ${m.lastName}`.trim() || m.email;
              const last = lastEmail(m.emails[0]);
              return (
                <li key={m.id} className="contact-card">
                  <div className="contact-who">
                    <Link href={`/admin/members/${m.id}`} className="member-link"><strong>{name}</strong></Link>
                    <span className={`badge ${STAGES[m.status].tone}`}>{STAGES[m.status].label}</span>
                    <div className="muted small">{m.email}</div>
                    <div className="muted small">{last ? `Last email: ${last}` : "No emails yet"}</div>
                  </div>
                  <div className="contact-send">
                    <ActionForm
                      action={sendToContactAction}
                      className="contact-send-form"
                      confirm={{ title: `Send the chosen email to ${name}?`, message: `It goes to ${m.email}, filled in with her details.`, confirmLabel: "Send" }}
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <select name="what" required className="admin-input" aria-label={`Email to send to ${name}`} defaultValue="">
                        {options}
                      </select>
                      <button className="button small"><span>Send</span></button>
                    </ActionForm>
                    <form action={newDraftAction}>
                      <input type="hidden" name="to" value={m.id} />
                      <button className="link-btn">Write a new email to her</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
