import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { requireAdminPage } from "@/lib/staff";
import { MailHeader } from "../MailNav";
import { newDraftAction } from "../mail-actions";

export const metadata: Metadata = { title: "Your emails", robots: { index: false, follow: false } };

export default async function DraftsPage() {
  await requireAdminPage();
  const drafts = await db().emailDraft.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <MailHeader
          active="drafts"
          title="Your emails"
          intro="Write your own email, save it as a draft, and send it to one person, a few, or a whole group. Every registered member is already in Contacts."
        />

        <form action={newDraftAction} className="mail-toolbar">
          <button className="button"><span>Write a new email</span></button>
        </form>

        {drafts.length === 0 ? (
          <p className="dash-clear">No emails yet. Press “Write a new email” to start one.</p>
        ) : (
          <ul className="draft-list">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/emails/drafts/${d.id}`} className="draft-row">
                  <span className="draft-subject">{d.subject || <span className="muted">No subject yet</span>}</span>
                  <span className="small muted">
                    {d.lastSentAt
                      ? `Sent to ${d.sentCount} ${d.sentCount === 1 ? "person" : "people"}, last on ${formatDate(d.lastSentAt)}`
                      : "Draft, not sent yet"}
                    {" · "}edited {formatDate(d.updatedAt)}
                    {d.createdBy ? ` · started by ${d.createdBy}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
