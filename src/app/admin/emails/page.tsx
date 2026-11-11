import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/staff";
import { TEMPLATE_IDS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import { editedIds, getSource } from "@/lib/email/store";

export const metadata: Metadata = { title: "Email templates", robots: { index: false, follow: false } };

export default async function EmailsPage() {
  await requireAdminPage();
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
