/**
 * Local end-to-end check of the member journey (no Stripe/Resend/Mighty calls).
 * Run: npx tsx --conditions=react-server --env-file=.env.local scripts/flow-test.ts
 * Needs the dev server on SITE_URL and a disposable DATABASE_URL (it wipes tables).
 */
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { DAY } from "@/lib/dates";
import { runDailyJobs } from "@/lib/jobs";
import { afterPayment, completeSpaces, openPayments, registerInterest } from "@/lib/members";
import { makeToken } from "@/lib/token";

const SITE = process.env.SITE_URL!;
const logs = async (memberId: string, t?: string) =>
  (await db().emailLog.findMany({ where: { memberId, ...(t ? { templateId: t } : {}) } })).map((l) => `${l.templateId}:${l.sendKey}`).sort();
const mn = (body: object) =>
  fetch(`${SITE}/api/mn/webhook`, { method: "POST", headers: { Authorization: process.env.MN_WEBHOOK_SECRET!, "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

async function main() {
  const d = db();
  await d.emailLog.deleteMany(); await d.alert.deleteMany(); await d.mightyEvent.deleteMany(); await d.member.deleteMany(); await d.jobRun.deleteMany();

  // Stage 1: same email twice → one record, one C01
  await registerInterest({ firstName: "Ada", lastName: "Okafor", email: "  Ada@Example.com ", consent: true });
  await registerInterest({ firstName: "Ada", lastName: "Okafor-Smith", email: "ada@example.com", consent: true });
  assert.equal(await d.member.count(), 1);
  let ada = await d.member.findUniqueOrThrow({ where: { email: "ada@example.com" } });
  assert.equal(ada.lastName, "Okafor-Smith");
  assert.deepEqual(await logs(ada.id), ["C01:"]);
  const bea = await registerInterest({ firstName: "Bea", lastName: "Mensah", email: "bea@example.com", consent: true });
  console.log("✓ stage 1: dedupe + C01");

  // Stage 2: open payments
  const r = await openPayments();
  assert.equal(r.remaining, 0);
  ada = await d.member.findUniqueOrThrow({ where: { id: ada.id } });
  assert.equal(ada.status, "payment_open");
  assert.deepEqual(await logs(ada.id), ["C01:", "C02:"]);
  const page = await (await fetch(`${SITE}/join?t=${makeToken(ada.id, "join")}`)).text();
  assert.ok(page.includes("Welcome, Ada") && page.includes("18 December 2027"));
  const forged = await (await fetch(`${SITE}/join?t=${ada.id}.forged`)).text();
  assert.ok(forged.includes("not valid"));
  const contributeWithJoinToken = await (await fetch(`${SITE}/contribute?t=${makeToken(ada.id, "join")}`)).text();
  assert.ok(contributeWithJoinToken.includes("not valid"));
  console.log("✓ stage 2: C02, personal page, forged token rejected");

  // Thank-you page never marks paid
  await fetch(`${SITE}/join/thanks?session_id=cs_test_x`);
  assert.equal((await d.member.findUniqueOrThrow({ where: { id: bea.id } })).status, "payment_open");

  // Stage 3/4: verified payment (what the webhook writes), twice
  await d.member.update({ where: { id: ada.id }, data: { status: "paid", paidAt: new Date(), amount: 29900, currency: "gbp", paymentReference: "INV-0001", renewalDate: new Date("2027-12-18T12:00:00Z"), subscriptionStatus: "active" } });
  ada = await d.member.findUniqueOrThrow({ where: { id: ada.id } });
  await afterPayment(ada); await afterPayment(ada);
  ada = await d.member.findUniqueOrThrow({ where: { id: ada.id } });
  assert.equal(ada.status, "invited");
  assert.deepEqual(await logs(ada.id), ["C01:", "C02:", "C04:", "C05:"]);
  console.log("✓ stage 3–4: C04 + C05 once, status invited");

  // Stage 5: unknown sign-up → A1, no spaces
  let res = await mn({ id: "evt-1", event_type: "MemberJoined", payload: { member: { id: 9, email: "stranger@example.com", first_name: "S" } } });
  assert.equal(res.result, "alerted");
  assert.equal(await d.alert.count({ where: { code: "A1" } }), 1);
  // matched sign-up (different case), repeated delivery
  res = await mn({ id: "evt-2", event_type: "MemberJoined", payload: { member: { id: 42, email: "ADA@example.com" } } });
  const dup = await mn({ id: "evt-2", event_type: "MemberJoined", payload: { member: { id: 42, email: "ADA@example.com" } } });
  assert.equal(dup.duplicate, true);
  ada = await d.member.findUniqueOrThrow({ where: { id: ada.id } });
  assert.equal(ada.status, "joined_network"); // no Admin API locally → manual
  assert.equal(ada.mnUserId, "42");
  console.log("✓ stage 5: A1 on unknown, joined_network on match, duplicate ignored");

  // Stage 6: spaces added by hand → in_circle, C07 + C08
  await completeSpaces(ada.id); await completeSpaces(ada.id);
  ada = await d.member.findUniqueOrThrow({ where: { id: ada.id } });
  assert.equal(ada.status, "in_circle");
  assert.deepEqual(await logs(ada.id), ["C01:", "C02:", "C04:", "C05:", "C07:", "C08:"]);
  console.log("✓ stage 6: in_circle, C07 + C08 once");

  // Stage 7: progress 0 → 33 → 40 → 67 → 100 (+ repeat 100)
  for (const [i, p] of [33, 40, 67, 100, 100].entries()) await mn({ id: `p-${i}`, event_type: "MemberCourseProgressUpdated", payload: { member: { email: "ada@example.com" }, progress: p } });
  ada = await d.member.findUniqueOrThrow({ where: { id: ada.id } });
  assert.equal(ada.status, "academy_complete");
  assert.deepEqual(await logs(ada.id, "C11"), ["C11:33", "C11:67"]);
  assert.deepEqual(await logs(ada.id, "C12"), ["C12:"]);
  console.log("✓ stage 7: C11 twice, C12 once");

  // Daily jobs: abandoned payment → C03 at 3 and 7 days, then flagged, then nothing
  const opened = (await d.member.findUniqueOrThrow({ where: { id: bea.id } })).paymentOpenedAt!.getTime();
  for (const day of [1, 3, 3, 7, 8, 9, 14]) await runDailyJobs(new Date(opened + day * DAY + 60_000));
  const b = await d.member.findUniqueOrThrow({ where: { id: bea.id } });
  assert.deepEqual(await logs(bea.id, "C03"), ["C03:3d", "C03:7d"]);
  assert.equal(b.followUpFlag, true);
  console.log("✓ jobs: C03 at 3d + 7d only, then follow-up flag");

  // Bad webhook key
  const unauth = await fetch(`${SITE}/api/mn/webhook`, { method: "POST", headers: { Authorization: "nope" }, body: "{}" });
  assert.equal(unauth.status, 401);
  const stripeBad = await fetch(`${SITE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=bad" }, body: "{}" });
  assert.ok([400, 500].includes(stripeBad.status));
  console.log("✓ webhooks reject bad credentials");
  console.log("\nALL PASSED");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
