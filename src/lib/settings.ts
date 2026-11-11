import "server-only";
import { db } from "./db";

/**
 * Merge links and onboarding call details the team edits in /admin.
 * Each one falls back to an environment variable of the same name in upper case.
 */
export const SETTING_FIELDS = [
  { key: "network_url", label: "Your network's web address" },
  { key: "network_invite_link", label: "Invite link to join the network" },
  { key: "start_here_space_url", label: "Start Here space" },
  { key: "academy_space_url", label: "Academy space" },
  { key: "monthly_live_url", label: "Monthly Live space" },
  { key: "ios_app_link", label: "iPhone app (App Store)" },
  { key: "android_app_link", label: "Android app (Google Play)" },
  { key: "onboarding_call_at", label: "Date and time (UK time)", type: "datetime-local" },
  { key: "onboarding_call_link", label: "Joining link" },
  { key: "calendar_link", label: "Add-to-calendar link" },
  { key: "recording_link", label: "Recording link" },
] as const;

export type SettingKey = (typeof SETTING_FIELDS)[number]["key"];
export type Settings = Record<SettingKey, string>;

const DEFAULTS: Partial<Settings> = {
  ios_app_link: "https://apps.apple.com/app/mighty-networks/id1081683081",
  android_app_link: "https://play.google.com/store/apps/details?id=com.mightybell.mb",
};

export async function getSettings(): Promise<Settings> {
  const rows = await db().setting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out = {} as Settings;
  for (const { key } of SETTING_FIELDS) {
    out[key] = stored[key] || process.env[key.toUpperCase()] || DEFAULTS[key] || "";
  }
  return out;
}

export async function saveSettings(values: Partial<Settings>) {
  await db().$transaction(
    Object.entries(values).map(([key, value]) =>
      db().setting.upsert({ where: { key }, create: { key, value: value ?? "" }, update: { value: value ?? "" } }),
    ),
  );
}

/** The onboarding call as a Date, read as UK local time from the admin input. */
export function onboardingCallAt(settings: Settings): Date | null {
  const raw = settings.onboarding_call_at;
  if (!raw) return null;
  // datetime-local has no zone; treat it as Europe/London.
  const naive = new Date(`${raw.length === 16 ? `${raw}:00` : raw}Z`);
  if (Number.isNaN(naive.getTime())) return null;
  const londonOffset = londonOffsetMinutes(naive);
  return new Date(naive.getTime() - londonOffset * 60_000);
}

function londonOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = parts?.match(/GMT([+-]\d+)?(?::(\d+))?/);
  if (!m || !m[1]) return 0;
  const h = Number(m[1]);
  return h * 60 + Math.sign(h) * Number(m[2] ?? 0);
}
