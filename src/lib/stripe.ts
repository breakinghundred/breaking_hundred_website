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
