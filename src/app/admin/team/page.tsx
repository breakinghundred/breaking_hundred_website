import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ROLE_LABELS, ownerEmail, requireAdminPage } from "@/lib/staff";
import { ActionForm } from "../ActionForm";
import { addStaffAction, staffAction } from "./actions";

export const metadata: Metadata = { title: "Circle team", robots: { index: false, follow: false } };

const when = (d: Date | null) =>
  d ? d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }) : null;

export default async function TeamPage() {
  const me = await requireAdminPage();
  const people = await db().staffUser.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <p className="small"><Link href="/admin">← Back to the dashboard</Link></p>
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        <h1 className="flow-title">Team</h1>
        <p className="muted" style={{ maxWidth: 720 }}>
          Everyone who can sign in to this dashboard. Each person signs in with their own email and password.
        </p>
        <ul className="role-key small">
          {Object.values(ROLE_LABELS).map((r) => (
            <li key={r.label}><span className={`badge ${r.label === "Admin" ? "plum" : "blue"}`}>{r.label}</span> {r.help}</li>
          ))}
        </ul>

        <h2 className="admin-h">Add someone</h2>
        <ActionForm action={addStaffAction} className="admin-settings team-add">
          <label>
            Name
            <input name="name" required className="admin-input" autoComplete="off" />
          </label>
          <label>
            Email
            <input name="email" type="email" required className="admin-input" autoComplete="off" />
          </label>
          <label>
            Role
            <select name="role" className="admin-input" defaultValue="team">
              <option value="team">Team</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="button" type="submit"><span>Add and email them</span></button>
        </ActionForm>

        <h2 className="admin-h">People</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Status</th><th>Last signed in</th><th>Change</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Main admin</strong>
                  <div className="muted small">{ownerEmail()}</div>
                </td>
                <td data-label="Role"><span className="badge plum">Admin</span></td>
                <td data-label="Status">Always on</td>
                <td data-label="Last signed in">—</td>
                <td className="small muted" data-label="Change">
                  The built-in account set up by your developer. Its password is ADMIN_PASSWORD. It cannot be removed, so
                  you can never be locked out.
                </td>
              </tr>
              {people.map((p) => {
                const self = p.id === me.id;
                const status = !p.active ? "Access removed" : p.passwordHash ? "Active" : "Invited, no password yet";
                return (
                  <tr key={p.id} className={p.active ? "" : "row-muted"}>
                    <td>
                      <strong>{p.name}</strong>
                      {self && <span className="muted small"> (you)</span>}
                      <div className="muted small">{p.email}</div>
                      {p.invitedBy && <div className="muted small">Added by {p.invitedBy}</div>}
                    </td>
                    <td data-label="Role">
                      <span className={`badge ${p.role === "admin" ? "plum" : "blue"}`}>{ROLE_LABELS[p.role].label}</span>
                    </td>
                    <td data-label="Status">
                      <span className={!p.active ? "warn" : ""}>{status}</span>
                    </td>
                    <td className="nowrap" data-label="Last signed in">{when(p.lastSignInAt) ?? <span className="muted">Never</span>}</td>
                    <td className="small team-actions" data-label="Change">
                      {self ? (
                        <span className="muted">Another admin can change your access.</span>
                      ) : p.active ? (
                        <>
                          <ActionForm action={staffAction} className="inline">
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="role" value={p.role === "admin" ? "team" : "admin"} />
                            <button name="op" value="role" className="link-btn">
                              {p.role === "admin" ? "Change to Team" : "Make Admin"}
                            </button>
                          </ActionForm>
                          <ActionForm action={staffAction} className="inline">
                            <input type="hidden" name="id" value={p.id} />
                            <button name="op" value="reset" className="link-btn">
                              {p.passwordHash ? "Send a new password link" : "Resend invite"}
                            </button>
                          </ActionForm>
                          <ActionForm action={staffAction} className="inline" confirm={{ title: `Remove ${p.name}'s access?`, message: "They will be signed out straight away. You can restore it later.", confirmLabel: "Remove access", danger: true }}>
                            <input type="hidden" name="id" value={p.id} />
                            <button name="op" value="remove" className="link-btn danger">Remove access</button>
                          </ActionForm>
                        </>
                      ) : (
                        <ActionForm action={staffAction} className="inline" confirm={{ title: `Restore ${p.name}'s access?`, message: `They will be able to sign in again as ${ROLE_LABELS[p.role].label}, with their existing password.`, confirmLabel: "Restore access" }}>
                          <input type="hidden" name="id" value={p.id} />
                          <button name="op" value="restore" className="link-btn">Restore access</button>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {people.length === 0 && <p className="muted small">Nobody else yet. Add someone above.</p>}
      </div>
    </section>
  );
}
