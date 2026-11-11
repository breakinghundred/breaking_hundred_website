import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/staff";
import { db } from "@/lib/db";
import { mightyConfigured } from "@/lib/mighty";
import { SETTING_FIELDS, getSettings } from "@/lib/settings";
import { ActionForm } from "../ActionForm";
import { importAction, runJobsAction, saveSettingsAction } from "../actions";

export const metadata: Metadata = { title: "Circle settings", robots: { index: false, follow: false } };

const CALL_KEYS = new Set<string>(["onboarding_call_at", "onboarding_call_link", "calendar_link", "recording_link"]);

export default async function SettingsPage() {
  await requireAdminPage();
  const auto = mightyConfigured();
  const [settings, jobs] = await Promise.all([getSettings(), db().jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 1 })]);
  const lastRun = jobs[0];
  const callFields = SETTING_FIELDS.filter((f) => CALL_KEYS.has(f.key));
  const linkFields = SETTING_FIELDS.filter((f) => !CALL_KEYS.has(f.key));

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <p className="small"><Link href="/admin">← Back to the dashboard</Link></p>
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        <h1 className="flow-title">Settings</h1>
        <p className="muted" style={{ maxWidth: 720 }}>
          Details that go into the emails, adding people from a spreadsheet, and the automatic checks. Open a section to
          change it.
        </p>
        <div className="dash-drawers">
          <details className="drawer">
            <summary>
              <strong>Onboarding call</strong>
              <span className="muted small">Date, time and links that go into the welcome emails</span>
            </summary>
            <ActionForm action={saveSettingsAction} className="admin-settings">
              {callFields.map((f) => (
                <label key={f.key}>
                  {f.label}
                  <input name={f.key} type={"type" in f ? f.type : "url"} defaultValue={settings[f.key]} className="admin-input" />
                </label>
              ))}
              {/* Saving one group keeps the other group's values. */}
              {linkFields.map((f) => (
                <input key={f.key} type="hidden" name={f.key} value={settings[f.key]} />
              ))}
              <button className="button" type="submit"><span>Save</span></button>
            </ActionForm>
          </details>

          <details className="drawer">
            <summary>
              <strong>Mighty Networks links</strong>
              <span className="muted small">Where the emails send members on the platform and app stores</span>
            </summary>
            <ActionForm action={saveSettingsAction} className="admin-settings">
              {linkFields.map((f) => (
                <label key={f.key}>
                  {f.label}
                  <input name={f.key} type="url" defaultValue={settings[f.key]} className="admin-input" />
                </label>
              ))}
              {callFields.map((f) => (
                <input key={f.key} type="hidden" name={f.key} value={settings[f.key]} />
              ))}
              <button className="button" type="submit"><span>Save</span></button>
            </ActionForm>
          </details>

          <details className="drawer">
            <summary>
              <strong>Add people from an existing list</strong>
              <span className="muted small">Copy names and emails in from a spreadsheet</span>
            </summary>
            <p className="muted small">
              Paste one person per line as <em>first name, last name, email</em>. You can copy three columns straight
              from Excel or Google Sheets. People already here are not duplicated. Nobody is emailed now; they get
              their payment link when you press <em>Send payment links</em>.
            </p>
            <ActionForm action={importAction} className="admin-settings">
              <textarea name="csv" rows={8} className="textarea" placeholder={"Ada, Okafor, ada@example.com\nGrace, Mensah, grace@example.com"} />
              <button className="button outline" type="submit"><span>Add to the list</span></button>
            </ActionForm>
          </details>

          <details className="drawer" id="automatic">
            <summary>
              <strong>Automatic emails and connections</strong>
              <span className="muted small">
                {lastRun ? (lastRun.ok ? "Working normally" : "The last check had a problem") : "Not run yet"}
              </span>
            </summary>
            <ul className="status-list small">
              <li>
                <span className={`dot ${lastRun?.ok ? "ok" : lastRun ? "bad" : ""}`} aria-hidden />
                Reminder and follow-up emails are checked every morning at 8am. Last checked:{" "}
                {lastRun ? lastRun.startedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }) : "never"}.
              </li>
              <li>
                <span className={`dot ${auto ? "ok" : ""}`} aria-hidden />
                {auto
                  ? "Mighty Networks is connected: paid members are added to their spaces automatically."
                  : "Mighty Networks is not connected, so you add paid members to their spaces by hand. They appear under Needs your attention."}
              </li>
            </ul>
            <ActionForm action={runJobsAction}>
              <button className="button outline small" type="submit"><span>Run the morning check now</span></button>
            </ActionForm>
          </details>
        </div>
      </div>
    </section>
  );
}
