import "server-only";
import { db } from "./db";
import { optionalEnv } from "./env";
import { sendTeamEmail } from "./email/send";

export type AlertCode = "A1" | "A2" | "A3" | "A4";

const TITLES: Record<AlertCode, string> = {
  A1: "Mighty Networks sign-up could not be matched",
  A2: "Stripe payment for an unknown member",
  A3: "Contributor form submitted",
  A4: "Membership ended but access could not be removed",
};

/** Record an admin alert and email it to the team inbox (and any extra recipients). */
export async function raiseAlert(code: AlertCode, summary: string, detail: Record<string, unknown> = {}, extraTo: string[] = []) {
  await db().alert.create({ data: { code, summary, detail: detail as object } });
  const to = [optionalEnv("ALERT_EMAIL") ?? "admin@breakinghundred.org", ...extraTo];
  const lines = [
    summary,
    ...Object.entries(detail).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`),
    "Open the admin page to resolve it.",
  ];
  await Promise.all(
    to.map((addr) =>
      sendTeamEmail(addr, `[The Circle] ${code}: ${TITLES[code]}`, lines).catch((e) =>
        console.error(`Alert email to ${addr} failed`, e),
      ),
    ),
  );
}
