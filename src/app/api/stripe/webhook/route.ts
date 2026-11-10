import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { raiseAlert } from "@/lib/alerts";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { sendMemberEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { afterPayment, endMembership } from "@/lib/members";
import { periodEnd, stripe, subscriptionIdOf } from "@/lib/stripe";

/**
 * Stripe webhook. Rules from the spec:
 * - verify the signature before reading anything;
 * - only this endpoint may mark a member paid;
 * - store Stripe's values, never the browser's;
 * - idempotent: a repeated event never sends a second C04/C05.
 */
export async function POST(req: Request) {
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, req.headers.get("stripe-signature") ?? "", env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Claim the event id; a duplicate delivery is acknowledged and ignored.
  try {
    await db().stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return Response.json({ duplicate: true });
    throw e;
  }

  try {
    await handle(event);
  } catch (e) {
    // Release the claim so Stripe's retry is processed.
    await db().stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error(`Stripe ${event.type} ${event.id} failed`, e);
    return new Response("Handler error", { status: 500 });
  }
  return Response.json({ received: true });
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return onCheckoutPaid(event.data.object);
    case "invoice.paid":
      return onInvoicePaid(event.data.object);
    case "invoice.payment_failed":
      return onInvoiceFailed(event.data.object);
    case "customer.subscription.updated":
      return onSubscriptionUpdated(event.data.object, event.data.previous_attributes);
    case "customer.subscription.deleted":
      return onSubscriptionDeleted(event.data.object);
  }
}

const idOf = (x: string | { id: string } | null | undefined) => (x == null ? null : typeof x === "string" ? x : x.id);

async function onCheckoutPaid(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || session.payment_status !== "paid") return;

  const memberId = session.client_reference_id;
  const member = memberId ? await db().member.findUnique({ where: { id: memberId } }) : null;
  if (!member) {
    await raiseAlert("A2", `A Stripe payment arrived with client_reference_id "${memberId ?? "none"}", which matches no member. Nothing was sent to the payer.`, {
      checkout_session: session.id,
      customer_email: session.customer_details?.email ?? "",
      amount: `${(session.amount_total ?? 0) / 100} ${session.currency?.toUpperCase()}`,
    });
    return;
  }

  const subscriptionId = idOf(session.subscription);
  const sub = subscriptionId ? await stripe().subscriptions.retrieve(subscriptionId) : null;
  const invoiceId = idOf(session.invoice);
  const invoice = invoiceId ? await stripe().invoices.retrieve(invoiceId) : null;
  const paidAt = new Date((invoice?.status_transitions?.paid_at ?? session.created) * 1000);

  // Claim: only the first verified payment for this member moves her to paid.
  const claimed = await db().member.updateMany({
    where: { id: member.id, paidAt: null, status: { in: ["eoi_registered", "payment_open"] } },
    data: {
      status: "paid",
      subscriptionStatus: "active",
      priceTier: "standard_299",
      amount: session.amount_total ?? null,
      currency: session.currency ?? "gbp",
      paymentReference: invoice?.number ?? invoiceId ?? session.id,
      paidAt,
      renewalDate: sub ? periodEnd(sub) : null,
      stripeCustomerId: idOf(session.customer),
      stripeSubscriptionId: subscriptionId,
    },
  });
  if (claimed.count === 0) return;

  const fresh = await db().member.findUniqueOrThrow({ where: { id: member.id } });
  await afterPayment(fresh);
}

async function memberForSubscription(subscriptionId: string | null, metadataMemberId?: string) {
  if (subscriptionId) {
    const m = await db().member.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
    if (m) return m;
  }
  return metadataMemberId ? db().member.findUnique({ where: { id: metadataMemberId } }) : null;
}

/** Paid renewal: move renewal_date forward, no second C04, send C18. */
async function onInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== "subscription_cycle") return; // the first invoice is handled by checkout
  const subId = subscriptionIdOf(invoice);
  const member = await memberForSubscription(subId);
  if (!member || !subId) return;
  const sub = await stripe().subscriptions.retrieve(subId);
  const updated = await db().member.update({
    where: { id: member.id },
    data: { renewalDate: periodEnd(sub), subscriptionStatus: "active", failedPaymentCount: 0 },
  });
  await sendMemberEmail(updated, "C18", { sendKey: invoice.id });
}

/** Failed renewal: payment_failed, C16 after every attempt, the last one worded as a final notice. */
async function onInvoiceFailed(invoice: Stripe.Invoice) {
  const subId = subscriptionIdOf(invoice);
  const member = await memberForSubscription(subId);
  if (!member) return;
  const updated = await db().member.update({
    where: { id: member.id },
    data: { subscriptionStatus: "payment_failed", failedPaymentCount: invoice.attempt_count },
  });
  const next = invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null;
  const retry_line = next
    ? `We will try the payment again on ${formatDate(next)}.`
    : `This was our last attempt. If the payment does not go through, your membership will end on ${formatDate(new Date())} and you will lose access to your member spaces.`;
  await sendMemberEmail(updated, "C16", { sendKey: `${invoice.id}:${invoice.attempt_count}`, vars: { retry_line } });
}

/** Cancel at period end switched on → C17; switched off → back to active. */
async function onSubscriptionUpdated(sub: Stripe.Subscription, previous?: Partial<Stripe.Subscription>) {
  const member = await memberForSubscription(sub.id, sub.metadata?.member_id);
  if (!member) return;
  const cancelling = sub.cancel_at_period_end || sub.cancel_at != null;
  const wasCancelling = previous
    ? (previous.cancel_at_period_end ?? sub.cancel_at_period_end) || (("cancel_at" in previous ? previous.cancel_at : sub.cancel_at) != null)
    : false;

  if (cancelling && !wasCancelling) {
    const end = sub.cancel_at ? new Date(sub.cancel_at * 1000) : periodEnd(sub);
    const updated = await db().member.update({
      where: { id: member.id },
      data: { subscriptionStatus: "cancelling", renewalDate: end ?? member.renewalDate },
    });
    await sendMemberEmail(updated, "C17", { sendKey: String(sub.cancel_at ?? end?.getTime() ?? Date.now()) });
  } else if (!cancelling && wasCancelling) {
    await db().member.update({ where: { id: member.id }, data: { subscriptionStatus: "active" } });
  } else if (["active", "trialing"].includes(sub.status) && member.subscriptionStatus === "payment_failed") {
    await db().member.update({ where: { id: member.id }, data: { subscriptionStatus: "active", failedPaymentCount: 0 } });
  }
}

/** Subscription ended (cancelled at period end, or retries exhausted): lapsed, then Z3. */
async function onSubscriptionDeleted(sub: Stripe.Subscription) {
  const member = await memberForSubscription(sub.id, sub.metadata?.member_id);
  if (!member || member.status === "lapsed") return;
  await endMembership(member);
}
