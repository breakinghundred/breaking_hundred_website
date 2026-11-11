import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/staff";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/dates";
import { TEMPLATE_IDS, TEMPLATE_INFO } from "@/lib/email/catalogue";
import { fieldsIn } from "@/lib/email/source";
import { getSource } from "@/lib/email/store";
import { mightyConfigured } from "@/lib/mighty";
import { checkPayments } from "@/lib/stripe";
import { SETTING_FIELDS, getSettings, onboardingCallAt, type SettingKey, type Settings } from "@/lib/settings";
import { ActionForm } from "../ActionForm";
import { importAction, runJobsAction } from "../actions";
import { SettingsForm, type FieldGroup } from "./SettingsForm";

export const metadata: Metadata = { title: "Circle settings", robots: { index: false, follow: false } };

/** What each setting means to the person filling it in. */
const HELP: Partial<Record<SettingKey, { hint: string; placeholder?: string; emptyNote?: string }>> = {
  onboarding_call_at: { hint: "Reminders go out 7 days and 24 hours before. Leave empty until the date is fixed." },
  onboarding_call_link: { hint: "The Zoom, Teams or Meet link members click to join.", placeholder: "https://zoom.us/j/…" },
  calendar_link: { hint: "A link that adds the call to members' calendars.", placeholder: "https://…", emptyNote: "Optional" },
  recording_link: { hint: "Add this after the call. Once the call has passed, emails share the recording instead of the joining link.", placeholder: "https://…", emptyNote: "Add after the call" },
  network_url: { hint: "The address members use to open The Circle in a browser.", placeholder: "https://yournetwork.mn.co" },
  network_invite_link: { hint: "The link that lets a paid member create their account on the platform.", placeholder: "https://…" },
  start_here_space_url: { hint: "Open the space on Mighty Networks and copy the address from the browser bar.", placeholder: "https://…" },
  academy_space_url: { hint: "Open the space on Mighty Networks and copy the address from the browser bar.", placeholder: "https://…" },
  monthly_live_url: { hint: "Open the space on Mighty Networks and copy the address from the browser bar.", placeholder: "https://…" },
  ios_app_link: { hint: "Already filled in with the Mighty Networks app. Only change this if you have your own app." },
  android_app_link: { hint: "Already filled in with the Mighty Networks app. Only change this if you have your own app." },
};

/** Settings that reach emails through other merge fields as well as their own. */
const FEEDS: Partial<Record<SettingKey, string[]>> = {
  onboarding_call_at: ["onboarding_call_date", "onboarding_call_time", "onboarding_call_date_or_tbc", "onboarding_call_line"],
  onboarding_call_link: ["onboarding_call_link", "onboarding_call_line"],
  recording_link: ["recording_link", "onboarding_call_line"],
};

const GROUPS: { id: "call" | "links"; groups: { title?: string; keys: SettingKey[] }[] }[] = [
  {
    id: "call",
    groups: [
      { title: "Before the call", keys: ["onboarding_call_at", "onboarding_call_link", "calendar_link"] },
      { title: "After the call", keys: ["recording_link"] },
    ],
  },
  {
    id: "links",
    groups: [
      { title: "The platform", keys: ["network_url", "network_invite_link"] },
      { title: "Spaces", keys: ["start_here_space_url", "academy_space_url", "monthly_live_url"] },
      { title: "Phone apps", keys: ["ios_app_link", "android_app_link"] },
    ],
  },
];

async function emailFieldUse(): Promise<Record<string, string[]>> {
  try {
    const sources = await Promise.all(
      TEMPLATE_IDS.map(async (id) => {
        const s = await getSource(id);
        return { name: TEMPLATE_INFO[id].name, fields: new Set(fieldsIn(`${s.subject}\n${s.body}`)) };
      }),
    );
    const out: Record<string, string[]> = {};
    for (const { key } of SETTING_FIELDS) {
      const feeds = FEEDS[key] ?? [key];
      out[key] = sources.filter((s) => feeds.some((f) => s.fields.has(f))).map((s) => `“${s.name}”`);
    }
    return out;
  } catch {
    return {};
  }
}

function groupsFor(id: "call" | "links", settings: Settings, use: Record<string, string[]>): FieldGroup[] {
  const meta = new Map(SETTING_FIELDS.map((f) => [f.key, f]));
  return GROUPS.find((g) => g.id === id)!.groups.map((g) => ({
    title: g.title,
    fields: g.keys.map((key) => {
      const f = meta.get(key)!;
      return {
        key,
        label: f.label,
        hint: HELP[key]?.hint,
        placeholder: HELP[key]?.placeholder,
        emptyNote: HELP[key]?.emptyNote,
        type: "type" in f ? f.type : "url",
        value: settings[key],
        usedIn: use[key] ?? [],
      };
    }),
  }));
}

type Tone = "ok" | "warn" | "bad" | "idle";

function Tile({ href, title, tone, children }: { href: string; title: string; tone: Tone; children: React.ReactNode }) {
  return (
    <a href={href} className={`settings-tile tone-${tone}`}>
      <span className="settings-tile-title">
        <span className={`dot ${tone === "ok" ? "ok" : tone === "bad" ? "bad" : tone === "warn" ? "warn" : ""}`} aria-hidden />
        {title}
      </span>
      <span className="settings-tile-text">{children}</span>
    </a>
  );
}

export default async function SettingsPage() {
  await requireAdminPage();
  const auto = mightyConfigured();
  const [settings, jobs, payments, use, people] = await Promise.all([
    getSettings(),
    db().jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 1 }),
    checkPayments(),
    emailFieldUse(),
    db().member.count(),
  ]);
  const lastRun = jobs[0];
  const now = new Date();

  const call = onboardingCallAt(settings);
  const callPassed = call && call < now;
  const callTone: Tone = !call ? "warn" : callPassed && !settings.recording_link ? "warn" : !settings.onboarding_call_link && !callPassed ? "warn" : "ok";
  const callText = !call
    ? "No date set yet"
    : callPassed
      ? settings.recording_link
        ? "Done. Members are sent the recording"
        : "The call has passed: add the recording link"
      : `${formatDate(call)}, ${formatTime(call)}${settings.onboarding_call_link ? "" : ". Joining link missing"}`;

  const linkKeys = GROUPS[1].groups.flatMap((g) => g.keys);
  const missingLinks = linkKeys.filter((k) => !settings[k]);
  const lastRunText = lastRun
    ? lastRun.startedAt.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Europe/London" })
    : "";

  return (
    <section className="section flow-page admin">
      <div className="wrap">
        <p className="small"><Link href="/admin">← Back to the dashboard</Link></p>
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle</span>
        <h1 className="flow-title">Settings</h1>
        <p className="muted" style={{ maxWidth: 720 }}>
          The details that go into members&apos; emails, and how the site is running. Anything that needs your attention
          is marked in amber or red.
        </p>

        <nav className="settings-tiles" aria-label="Settings at a glance">
          <Tile href="#payments" title="Payments" tone={payments.ok ? (payments.testMode ? "warn" : "ok") : "bad"}>
            {payments.ok ? (payments.testMode ? "Working in test mode" : "Members can pay") : "Needs fixing: members can't pay"}
          </Tile>
          <Tile href="#call" title="Onboarding call" tone={callTone}>{callText}</Tile>
          <Tile href="#links" title="Platform links" tone={missingLinks.length ? "warn" : "ok"}>
            {missingLinks.length ? `${missingLinks.length} of ${linkKeys.length} still to fill in` : "All filled in"}
          </Tile>
          <Tile href="#automatic" title="Daily check" tone={!lastRun ? "idle" : lastRun.ok ? "ok" : "bad"}>
            {!lastRun ? "Not run yet" : lastRun.ok ? `Last ran ${lastRunText}` : `Problem on ${lastRunText}`}
          </Tile>
        </nav>

        <div className="settings-sections">
          <section className="detail-card settings-card" id="payments">
            <header className="settings-card-head">
              <h2>Payments</h2>
              <span className={`badge ${payments.ok ? (payments.testMode ? "amber" : "green") : "red"}`}>
                {payments.ok ? (payments.testMode ? "Test mode" : "Working") : "Needs fixing"}
              </span>
            </header>
            <p className="settings-intro">Members pay through Stripe. These details are kept with the website&apos;s hosting, so they&apos;re checked here but changed there.</p>
            <ul className="status-list small">
              {payments.ok ? (
                <>
                  <li><span className="dot ok" aria-hidden />Stripe is connected and the £299 yearly price is set up.</li>
                  {payments.testMode && (
                    <li><span className="dot warn" aria-hidden />These are test keys, so no real money is taken. Switch to the live keys before payment links go out.</li>
                  )}
                </>
              ) : (
                payments.problems.map((p) => (
                  <li key={p}><span className="dot bad" aria-hidden />{p}</li>
                ))
              )}
            </ul>
            {!payments.ok && (
              <p className="small muted">After fixing these with your developer, redeploy the site and reload this page to check again.</p>
            )}
          </section>

          <section className="detail-card settings-card" id="call">
            <header className="settings-card-head">
              <h2>Onboarding call</h2>
            </header>
            <p className="settings-intro">The group call for new members. Its date and links go into the welcome and reminder emails.</p>
            <SettingsForm groups={groupsFor("call", settings, use)} />
          </section>

          <section className="detail-card settings-card" id="links">
            <header className="settings-card-head">
              <h2>Platform links</h2>
              {missingLinks.length > 0 && <span className="badge amber">{missingLinks.length} to fill in</span>}
            </header>
            <p className="settings-intro">
              Where the emails send members on Mighty Networks. If one is empty, emails that use it go out without that link,
              so fill them all in before payment links are sent.
            </p>
            <SettingsForm groups={groupsFor("links", settings, use)} />
          </section>

          <section className="detail-card settings-card" id="import">
            <header className="settings-card-head">
              <h2>Add people from a spreadsheet</h2>
              <span className="badge grey">{people} {people === 1 ? "person" : "people"} on the list</span>
            </header>
            <ol className="settings-steps small">
              <li>In Excel or Google Sheets, select three columns: <b>first name</b>, <b>last name</b> and <b>email</b>.</li>
              <li>Copy them and paste them in the box below, one person per line.</li>
              <li>Press <b>Add to the list</b>. People already on the list aren&apos;t added twice.</li>
            </ol>
            <p className="small muted">Nobody is emailed now. They get their payment link when you press <em>Send payment links</em> on the dashboard.</p>
            <ActionForm action={importAction} className="admin-settings">
              <textarea name="csv" rows={6} className="textarea" aria-label="People to add" placeholder={"Ada, Okafor, ada@example.com\nGrace, Mensah, grace@example.com"} />
              <button className="button outline" type="submit"><span>Add to the list</span></button>
            </ActionForm>
          </section>

          <section className="detail-card settings-card" id="automatic">
            <header className="settings-card-head">
              <h2>Automatic emails and connections</h2>
            </header>
            <ul className="status-list small">
              <li>
                <span className={`dot ${lastRun?.ok ? "ok" : lastRun ? "bad" : ""}`} aria-hidden />
                <span>
                  Every morning at 8am the site sends any reminders and follow-ups that are due.{" "}
                  {lastRun ? (lastRun.ok ? `Last ran ${lastRunText}, with no problems.` : `The run on ${lastRunText} had a problem; your developer can see the details.`) : "It hasn't run yet."}
                </span>
              </li>
              <li>
                <span className={`dot ${auto ? "ok" : "warn"}`} aria-hidden />
                {auto
                  ? "Mighty Networks is connected: paid members are added to their spaces automatically."
                  : "Mighty Networks isn't connected, so you add paid members to their spaces by hand. They appear under Needs your attention."}
              </li>
            </ul>
            <p className="small muted">You don&apos;t need to run the check yourself. Use the button if you&apos;ve just changed something and don&apos;t want to wait until tomorrow.</p>
            <ActionForm action={runJobsAction}>
              <button className="button outline small" type="submit"><span>Run the check now</span></button>
            </ActionForm>
          </section>
        </div>
      </div>
    </section>
  );
}
