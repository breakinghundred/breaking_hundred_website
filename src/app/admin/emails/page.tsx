import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/staff";
import { senderDetails } from "@/lib/email/send";
import { ActionForm } from "../ActionForm";
import { MailHeader } from "./MailNav";
import { testEmailsAction, toggleEmailAction } from "./actions";
import { pausedIds } from "@/lib/email/paused";
import { TEMPLATE_IDS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import { editedIds, getSource } from "@/lib/email/store";
import { AutomatedEmailsHelp } from "../help";

export const metadata: Metadata = { title: "Automated emails", robots: { index: false, follow: false } };

export default async function EmailsPage() {
  const staff = await requireAdminPage();
  const sender = senderDetails();
  const [edited, paused] = await Promise.all([editedIds(), pausedIds()]);
  const subjects = await Promise.all(TEMPLATE_IDS.map(async (id) => (await getSource(id)).subject));

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <MailHeader
          active="automated"
          help={<AutomatedEmailsHelp />}
          title="Automated emails"
          intro={
            <>
              These go out by themselves as members move through the journey. Edit the wording of any of them: changes
              apply to the next email sent, and each can be reset to its original wording. Choose which logos appear at
              the top on the <Link href="/admin/emails/logos">Logos</Link> page.
            </>
          }
        />
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
              <tr><th>ID</th><th>Email</th><th>Subject</th><th>Sent when</th><th>Wording</th><th>Sending</th></tr>
            </thead>
            <tbody>
              {TEMPLATE_IDS.map((id, i) => (
                <tr key={id} className={paused.has(id) ? "email-off" : undefined}>
                  <td><Link href={`/admin/emails/${id}`}><b>{id}</b></Link></td>
                  <td><Link href={`/admin/emails/${id}`}>{TEMPLATE_INFO[id].name}</Link></td>
                  <td className="small">{subjects[i]}</td>
                  <td className="small muted">{TEMPLATE_INFO[id].trigger}</td>
                  <td className="small">
                    {edited.has(id) ? `Edited ${edited.get(id)!.toLocaleDateString("en-GB")}` : <span className="muted">Original</span>}
                  </td>
                  <td className="small">
                    <span className={`badge ${paused.has(id) ? "red" : "green"}`}>{paused.has(id) ? "Off" : "On"}</span>
                    <ActionForm
                      action={toggleEmailAction}
                      confirm={
                        paused.has(id)
                          ? { title: `Turn “${TEMPLATE_INFO[id].name}” back on?`, message: "From now on it sends by itself again. Emails that were skipped while it was off are not sent.", confirmLabel: "Turn on" }
                          : { title: `Turn off “${TEMPLATE_INFO[id].name}”?`, message: ["Nobody will be sent this email by the site until you turn it back on.", "Emails skipped while it is off are not sent later."], confirmLabel: "Turn off" }
                      }
                    >
                      <input type="hidden" name="id" value={id} />
                      <button name="op" value={paused.has(id) ? "on" : "off"} className="link-btn">{paused.has(id) ? "Turn on" : "Turn off"}</button>
                    </ActionForm>
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
