@AGENTS.md

# Breaking Hundred Circle site

Marketing site (Next.js 16 App Router, React 19, Tailwind 4, Framer Motion) plus **The Circle member flow**: interest form → Stripe payment → Mighty Networks access → 18 automated emails. The spec is `The Circle — Member Flow.html` in the repo root. Read it before changing flow behaviour.

## Commands

```bash
npm run dev                 # http://localhost:3000
npm run build               # prisma generate && next build
npx tsc --noEmit && npx eslint src
npm run db:migrate          # prisma migrate dev (local schema changes)
npm run db:deploy           # prisma migrate deploy (production)
npx prisma dev -n circle -d # local Postgres for testing
npx tsx --conditions=react-server --env-file=.env.local scripts/flow-test.ts
```

`scripts/flow-test.ts` **wipes every table**. Only run it against a throwaway local database, with the dev server running on `SITE_URL`.

## Stack

- **Prisma 7 + Prisma Postgres.** The schema is `prisma/schema.prisma` and the client is generated into `src/generated/prisma` (gitignored). Import from `@/generated/prisma/client` and get the client through `db()` in `src/lib/db.ts`. It is created lazily so the build needs no `DATABASE_URL`.
- **Resend** for all email (`src/lib/email/`). Without `RESEND_API_KEY` in development, emails print to the console.
- **Stripe** is the only payment gateway.
- **Mighty Networks Admin API** directly. **No Zapier.** If the `MN_*` env vars are unset, spaces are added by hand from `/admin`.
- Every env var is listed in `.env.example`. Read env vars at call time through `env()` / `optionalEnv()` in `src/lib/env.ts`, never at import time.

## Member flow rules (do not break)

- `Member.status` is the single journey field: `eoi_registered → payment_open → paid → invited → joined_network → in_circle → academy_complete`, plus `lapsed`. Billing problems go in `subscriptionStatus` and never overwrite `status`.
- Emails are lower-cased and trimmed (`normaliseEmail`). Email is the match key with Mighty Networks; `mnEmail` covers sign-ups made with a different address (alert A1).
- **Only the Stripe webhook marks a member paid.** It stores Stripe's values, never the browser's. The thank-you page writes nothing.
- Everything must be idempotent:
  - Stripe and Mighty events are claimed by id (`StripeEvent`, `MightyEvent`).
  - State changes use conditional `updateMany` claims.
  - Every email goes through `sendMemberEmail`, which claims a unique `EmailLog(memberId, templateId, sendKey)` row before sending. Use a distinct `sendKey` for legitimate repeats (`"3d"`/`"7d"`, an invoice id).
- Reminders are capped by their counters. When the cap is reached, set `followUpFlag`.
- Personal links use signed tokens from `src/lib/token.ts`, with a purpose of `join`, `billing` or `contribute`. Never put a plain member id in a URL.
- First payment: a one-time £299 line item plus the recurring Price with `trial_end` set to the renewal date. The renewal date is the later of 18 Dec 2027 and 12 months after payment (`renewalDateFor`). Renewals are `invoice.paid` with `billing_reason === "subscription_cycle"`.
- Email wording is editable at `/admin/emails`. Edits are stored in `EmailTemplate` rows in the text format described in `src/lib/email/source.ts`. With no row, the built-in default from `src/lib/email/templates.ts` is used (converted by `defaultSource`). Sending always goes `getSource` → `compile` → render, so the preview matches what is sent. When you add a merge field, add it to `memberVars` (`vars.ts`), to `MERGE_FIELDS` and `SAMPLE_VARS` (`catalogue.ts`), and to `TEMPLATE_INFO[id].extra` if it applies to one template only. Run `npx tsx scripts/email-roundtrip.ts` after changing templates or the format.

## Where things are

- Public pages: `/interest`, `/join` (personal payment page), `/join/thanks`, `/billing` (opens a Stripe portal session), `/contribute`.
- `/admin` is password-protected by a sign-in page at `/admin/login` (password `ADMIN_PASSWORD`; no username, no browser prompt). Success sets an HttpOnly `circle_admin` cookie signed with `LINK_SECRET` + `ADMIN_PASSWORD` (`src/lib/admin-session.ts`), valid 12 hours; changing the password signs everyone out. `src/proxy.ts` redirects to the sign-in page without it, and `requireAdmin()` re-checks it in every admin page and Server Action. Sign-in attempts are rate-limited (5 per 15 minutes per IP, fails closed if the database is down). The footer has a plain `<a href="/admin">` link.
- Webhooks: `/api/stripe/webhook` and `/api/mn/webhook`. The Mighty Networks one checks `Authorization` against `MN_WEBHOOK_SECRET`, because Mighty Networks doesn't sign its webhooks. The field names in its payloads are unconfirmed, so check the stored `MightyEvent.payload` against a live delivery.
- Daily cron: `/api/cron/daily` (`vercel.json`, Bearer `CRON_SECRET`) runs `src/lib/jobs.ts`.
- Domain logic: `src/lib/members.ts`. Alerts A1–A4: `src/lib/alerts.ts`.

## UI conventions

- Site copy lives in `src/lib/site.ts`. Design tokens and all component styles are in `src/app/globals.css`, and the flow and admin styles are at the bottom of that file.
- Reuse the motion primitives in `src/components/` (`Reveal`, `AnimatedHeading`, the `EASE` from `motion.ts`). Honour `prefers-reduced-motion`.
- On the membership page the interest form (`JoinForm`) is hidden behind a button and opens with CSS transitions. `/interest` renders it open (`startOpen`).
- The interest form's bot defences live in `src/app/interest/actions.ts`: a honeypot field, a minimum fill time, Vercel BotID (`checkBotId()`), and a per-IP rate limit (`src/lib/rate-limit.ts`, 5 per 10 minutes). Bots get a fake success. Any new page that hosts the form must be added to `protect` in `src/instrumentation-client.ts`.
- British English, en-GB date formats, Europe/London time zone (`src/lib/dates.ts`).

## Deadlines

Stages 1–6 must be built and tested by **14 Nov 2026**, and the payment link goes out on **21 Nov 2026** (the admin presses "Open payments"). Stages 7–9 follow from December. The refund and renewal wording (C04, C18, the checkout tick) still needs legal sign-off.
