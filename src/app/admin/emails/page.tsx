import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/staff";
import { senderDetails } from "@/lib/email/send";
import { ActionForm } from "../ActionForm";
import { testEmailsAction } from "./actions";
import { TEMPLATE_IDS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import { editedIds, getSource } from "@/lib/email/store";

export const metadata: Metadata = { title: "Email templates", robots: { index: false, follow: false } };

export default async function EmailsPage() {
  const staff = await requireAdminPage();
  const sender = senderDetails();
  const edited = await editedIds();
  const subjects = await Promise.all(TEMPLATE_IDS.map(async (id) => (await getSource(id)).subject));

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <p className="small"><Link href="/admin">← Member admin</Link></p>
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        <h1 className="flow-title">Email templates</h1>
        <p className="muted" style={{ maxWidth: 720 }}>
          Edit the wording of any automated email. Changes apply to the next email sent; emails already sent or
          scheduled are not changed. Each email can be reset to its original wording.
        </p>
        <div className="detail-card test-emails">
          <h2>Send test emails</h2>
          <p className="small muted">
            See exactly what members receive. Tests use your current wording with example details (Ada Okafor), are
            marked [Test] in the subject, and are not recorded against any member.
          </p>
          {!sender.configured && (
            <p className="warn small">Email is not set up on this site yet (no Resend key), so tests will not be delivered.</p>
          )}
          <ActionForm action={testEmailsAction} className="test-emails-form">
            <label>
              <span className="small">Send to</span>
              <input name="to" type="email" required defaultValue={staff.email} className="admin-input" />
            </label>
            <label>
              <span className="small">What to send</span>
              <select name="which" className="admin-input" defaultValue="check">
                <option value="check">A quick check that email is working</option>
                <option value="all">Every member email ({TEMPLATE_IDS.length} emails)</option>
                <optgroup label="One email">
                  {TEMPLATE_IDS.map((id) => (
                    <option key={id} value={id}>{TEMPLATE_INFO[id].name}</option>
                  ))}
                </optgroup>
              </select>
            </label>
            <button className="button small"><span>Send test</span></button>
          </ActionForm>
          <p className="small muted">Emails come from {sender.from}. Replies go to {sender.replyTo}.</p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Email</th><th>Subject</th><th>Sent when</th><th>Wording</th></tr>
            </thead>
            <tbody>
              {TEMPLATE_IDS.map((id, i) => (
                <tr key={id}>
                  <td><Link href={`/admin/emails/${id}`}><b>{id}</b></Link></td>
                  <td><Link href={`/admin/emails/${id}`}>{TEMPLATE_INFO[id].name}</Link></td>
                  <td className="small">{subjects[i]}</td>
                  <td className="small muted">{TEMPLATE_INFO[id].trigger}</td>
                  <td className="small">
                    {edited.has(id) ? `Edited ${edited.get(id)!.toLocaleDateString("en-GB")}` : <span className="muted">Original</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
