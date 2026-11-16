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
import { DEFAULT_PRICE_POUNDS, formatPounds } from "@/lib/price-format";
import { SETTING_FIELDS, getSettings, onboardingCallAt, priceFrom, type SettingKey, type Settings } from "@/lib/settings";
import { ActionForm } from "../ActionForm";
import { runJobsAction } from "../actions";
import { ImportForm } from "./ImportForm";
import { SettingsForm, type FieldGroup } from "./SettingsForm";
import { SettingsHelp } from "../help";

export const metadata: Metadata = { title: "Circle settings", robots: { index: false, follow: false } };

/** What each setting means to the person filling it in. */
const HELP: Partial<Record<SettingKey, { hint: string; placeholder?: string; emptyNote?: string }>> = {
  onboarding_call_at: { hint: "Reminders go out 7 days and 24 hours before. Leave empty until the date is fixed." },
  onboarding_call_link: { hint: "The Zoom, Teams or Meet link members click to join.", placeholder: "https://zoom.us/j/…" },
  calendar_link: { hint: "A link that adds the call to members' calendars.", placeholder: "https://…", emptyNote: "Optional" },
  recording_link: { hint: "Add this after the call. Once the call has passed, emails share the recording instead of the joining link.", placeholder: "https://…", emptyNote: "Add after the call" },
  network_url: { hint: "The address of your network's home page on Mighty Networks, for example https://yourname.mn.co. Open it in your browser and copy it from the address bar.", placeholder: "https://yournetwork.mn.co" },
  network_invite_link: { hint: "The link that lets a paid member create their account. On Mighty Networks, open Invite, copy the shareable invite link and paste it here.", placeholder: "https://…" },
  start_here_space_url: { hint: "On a computer, open this space on Mighty Networks in your web browser (not the app). Click the address bar at the top of the browser, copy the whole address and paste it here.", placeholder: "https://…" },
  academy_space_url: { hint: "On a computer, open this space on Mighty Networks in your web browser (not the app). Click the address bar at the top of the browser, copy the whole address and paste it here.", placeholder: "https://…" },
  monthly_live_url: { hint: "On a computer, open this space on Mighty Networks in your web browser (not the app). Click the address bar at the top of the browser, copy the whole address and paste it here.", placeholder: "https://…" },
  membership_price: {
    hint: `In pounds, for example 299 or 299.50. Leave empty to use ${formatPounds(DEFAULT_PRICE_POUNDS)}.`,
    placeholder: String(DEFAULT_PRICE_POUNDS),
    emptyNote: `Uses ${formatPounds(DEFAULT_PRICE_POUNDS)}`,
  },
  membership_discount_price: {
    hint: "Optional. A lower price, in pounds, for example 199. While it is set, the website shows the main price crossed out next to it, and new members are charged the discounted price, including when they renew. Leave empty for no discount.",
    placeholder: "No discount",
    emptyNote: "No discount",
  },
};

/** Settings that reach emails through other merge fields as well as their own. */
const FEEDS: Partial<Record<SettingKey, string[]>> = {
  membership_discount_price: ["membership_price"],
  onboarding_call_at: ["onboarding_call_date", "onboarding_call_time", "onboarding_call_date_or_tbc", "onboarding_call_line"],
  onboarding_call_link: ["onboarding_call_link", "onboarding_call_line"],
  recording_link: ["recording_link", "onboarding_call_line"],
};

type GroupId = "price" | "call" | "links";

const GROUPS: { id: GroupId; groups: { title?: string; keys: SettingKey[] }[] }[] = [
  { id: "price", groups: [{ keys: ["membership_price", "membership_discount_price"] }] },
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
    ],
  },
];

type EmailUse = { use: Record<string, string[]>; typedPrice: string[] };

/** Which emails use each setting, and which have a price typed in by hand instead of {{membership_price}}. */
async function emailFieldUse(): Promise<EmailUse> {
  try {
    const sources = await Promise.all(
      TEMPLATE_IDS.map(async (id) => {
        const s = await getSource(id);
        const text = `${s.subject}\n${s.body}`;
        return { name: TEMPLATE_INFO[id].name, fields: new Set(fieldsIn(text)), typedPrice: /£\s?\d/.test(text) };
      }),
    );
    const out: Record<string, string[]> = {};
    for (const { key } of SETTING_FIELDS) {
      const feeds = FEEDS[key] ?? [key];
      out[key] = sources.filter((s) => feeds.some((f) => s.fields.has(f))).map((s) => `“${s.name}”`);
    }
    return { use: out, typedPrice: sources.filter((s) => s.typedPrice).map((s) => `“${s.name}”`) };
  } catch {
    return { use: {}, typedPrice: [] };
  }
}

function groupsFor(id: GroupId, settings: Settings, use: Record<string, string[]>): FieldGroup[] {
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
  const [settings, jobs, payments, { use, typedPrice }, people] = await Promise.all([
    getSettings(),
    db().jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 1 }),
    checkPayments(),
    emailFieldUse(),
    db().member.count(),
  ]);
  const lastRun = jobs[0];
  const price = priceFrom(settings);
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

  const linkKeys = GROUPS.find((g) => g.id === "links")!.groups.flatMap((g) => g.keys);
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

        <SettingsHelp />

        <nav className="settings-tiles" aria-label="Settings at a glance">
          <Tile href="#payments" title="Payments" tone={payments.ok ? (payments.testMode ? "warn" : "ok") : "bad"}>
            {payments.ok ? (payments.testMode ? `Test mode · ${price.label} a year` : `Members pay ${price.label} a year`) : "Needs fixing: members can't pay"}
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
                  <li><span className="dot ok" aria-hidden />Stripe is connected and the yearly membership is set up.</li>
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

          <section className="detail-card settings-card" id="price">
            <header className="settings-card-head">
              <h2>Membership price</h2>
              <span className="badge grey">
                {price.full ? <><s>{price.full.label}</s> {price.label} for 12 months (discount on)</> : <>{price.label} for 12 months</>}
              </span>
            </header>
            <p className="settings-intro">
              What new members pay for 12 months. It is shown on the website, on each person&apos;s payment page, in the
              emails and at the Stripe checkout.
            </p>
            <ul className="status-list small">
              <li>
                <span className="dot" aria-hidden />
                People who have already paid keep the price they joined at, including when they renew. A change only
                applies to people who pay after you save it.
              </li>
              {typedPrice.length > 0 && (
                <li>
                  <span className="dot warn" aria-hidden />
                  <span>
                    These emails have a price typed into their wording, so it won&apos;t change by itself:{" "}
                    {typedPrice.join(", ")}. In <Link href="/admin/emails">Automated emails</Link>, replace the price
                    with <code>{"{{membership_price}}"}</code>.
                  </span>
                </li>
              )}
            </ul>
            <SettingsForm groups={groupsFor("price", settings, use)} />
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
              <h2>Add people from a file</h2>
              <span className="badge grey">{people} {people === 1 ? "person" : "people"} on the list</span>
            </header>
            <ol className="settings-steps small">
              <li>
                In Excel or Google Sheets, make sure there are columns headed <b>First name</b>, <b>Last name</b> and{" "}
                <b>Email</b>. A single <b>Name</b> column works too.
              </li>
              <li>Save or download it as an Excel file (.xlsx) or as CSV.</li>
              <li>Choose the file below and press <b>Add to the list</b>. People already on the list aren&apos;t added twice.</li>
            </ol>
            <p className="small muted">Nobody is emailed now. They get their payment link when you press <em>Send payment links</em> on the dashboard.</p>
            <ImportForm />
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
