import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { listLogos, logoPath } from "@/lib/email/logos";
import { senderDetails } from "@/lib/email/send";
import { requireAdminPage } from "@/lib/staff";
import { STAGES, STAGE_ORDER } from "../../../labels";
import { DraftEditor } from "./DraftEditor";

export const metadata: Metadata = { title: "Write an email", robots: { index: false, follow: false } };

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireAdminPage();
  const { id } = await params;
  const draft = await db().emailDraft.findUnique({ where: { id } });
  if (!draft) notFound();
  const [contacts, logos] = await Promise.all([
    db().member.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, status: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    listLogos(),
  ]);
  const sender = senderDetails();

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <p className="small"><Link href="/admin/emails/drafts">← Your emails</Link></p>
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle · Emails</span>
        <h1 className="flow-title">{draft.subject || "New email"}</h1>
        <p className="muted small">
          {draft.lastSentAt
            ? `Sent to ${draft.sentCount} ${draft.sentCount === 1 ? "person" : "people"} so far, last on ${formatDate(draft.lastSentAt)}. You can send it again to anyone.`
            : "Not sent yet. It saves as a draft until you send it."}
          {" "}From {sender.from}; replies go to {sender.replyTo}.
          {!sender.configured && <span className="warn"> Email is not set up on this site yet, so nothing will be delivered.</span>}
        </p>
        <DraftEditor
          draft={{
            id: draft.id,
            subject: draft.subject,
            body: draft.body,
            logoIds: draft.logoIds,
            recipientIds: draft.recipientIds,
            audience: draft.audience,
          }}
          contacts={contacts.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`.trim() || c.email,
            email: c.email,
            status: c.status,
          }))}
          stages={STAGE_ORDER.map((s) => ({ value: s, label: STAGES[s].label }))}
          logos={logos.map((l) => ({ id: l.id, name: l.name, width: l.width, src: logoPath(l.id) }))}
          testTo={staff.email}
        />
      </div>
    </section>
  );
}
