import "server-only";
import Stripe from "stripe";
import { env } from "./env";

let client: Stripe | null = null;
export function stripe() {
  return (client ??= new Stripe(env("STRIPE_SECRET_KEY")));
}

/**
 * The single recurring £299 / 12 months Price (STRIPE_PRICE_ID).
 *
 * The first period runs to the later of 18 Dec 2027 and 12 months after payment,
 * which can be longer than one year, so Checkout is created as:
 *   - the recurring Price, with `trial_end` = renewal date (no charge until then), plus
 *   - a one-time line item for the same amount on the same Product, charged today.
 * Stripe bills one-time items on the first invoice, so she pays £299 now and the
 * next £299 is taken on her renewal date.
 */
export async function membershipPrice() {
  const price = await stripe().prices.retrieve(env("STRIPE_PRICE_ID"));
  if (!price.recurring || price.unit_amount == null) throw new Error("STRIPE_PRICE_ID must be a recurring price with a fixed amount");
  return {
    id: price.id,
    amount: price.unit_amount,
    currency: price.currency,
    product: typeof price.product === "string" ? price.product : price.product.id,
  };
}

export function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

/** End of the current period: the trial end during the first period, then the item's period end. */
export function periodEnd(sub: Stripe.Subscription): Date | null {
  const ends = [sub.trial_end ?? 0, ...sub.items.data.map((i) => i.current_period_end ?? 0)];
  const max = Math.max(...ends);
  return max ? new Date(max * 1000) : null;
}

export type PaymentsCheck = { ok: boolean; testMode: boolean; problems: string[] };

/**
 * Plain-language check of the Stripe setup, for /admin. Reads only: never changes anything in Stripe.
 * Catches the usual set-up mistakes before a member presses Pay.
 */
export async function checkPayments(): Promise<PaymentsCheck> {
  const problems: string[] = [];
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const priceId = process.env.STRIPE_PRICE_ID?.trim() ?? "";
  const hook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const testMode = key.startsWith("sk_test_") || key.startsWith("rk_test_");

  if (!key) problems.push("The Stripe secret key (STRIPE_SECRET_KEY) is missing.");
  else if (!/^(sk|rk)_(live|test)_/.test(key)) problems.push("STRIPE_SECRET_KEY doesn't look like a Stripe secret key (it should start sk_live_ or sk_test_).");

  if (!priceId) problems.push("STRIPE_PRICE_ID is missing. It should be the ID of the £299 yearly price in Stripe (it starts price_).");
  else if (!priceId.startsWith("price_"))
    problems.push(`STRIPE_PRICE_ID is “${priceId}”, but it must be the ID of the £299 yearly price in Stripe, which starts price_ (not the amount).`);

  if (!hook) problems.push("STRIPE_WEBHOOK_SECRET is missing, so payments can't be confirmed and members won't be marked paid.");
  else if (!hook.startsWith("whsec_"))
    problems.push("STRIPE_WEBHOOK_SECRET doesn't look right: it should be the webhook's signing secret, which starts whsec_.");

  if (key && priceId.startsWith("price_")) {
    try {
      const price = await stripe().prices.retrieve(priceId);
      if (!price.active) problems.push("The price in STRIPE_PRICE_ID is archived in Stripe. Use an active price.");
      if (!price.recurring) problems.push("The price in STRIPE_PRICE_ID is a one-off price. It must repeat every 12 months.");
      else if (!(price.recurring.interval === "year" || (price.recurring.interval === "month" && price.recurring.interval_count === 12)))
        problems.push("The price in STRIPE_PRICE_ID doesn't repeat every 12 months.");
      if (price.unit_amount == null) problems.push("The price in STRIPE_PRICE_ID has no fixed amount.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      problems.push(
        /no such price/i.test(msg)
          ? `Stripe has no price with the ID in STRIPE_PRICE_ID${testMode ? " in test mode" : ""}. Check it was copied from the same Stripe account and mode as the secret key.`
          : /api key|authenticat/i.test(msg)
            ? "Stripe didn't accept the secret key (STRIPE_SECRET_KEY)."
            : `Stripe said: ${msg}`,
      );
    }
  }
  return { ok: problems.length === 0, testMode, problems };
}
