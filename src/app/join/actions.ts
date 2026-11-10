"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { renewalDateFor } from "@/lib/dates";
import { siteUrl } from "@/lib/env";
import { membershipPrice, stripe } from "@/lib/stripe";
import { readToken } from "@/lib/token";

export type PayState = { error?: string };

export async function startCheckout(token: string, _prev: PayState, formData: FormData): Promise<PayState> {
  const memberId = readToken(token, "join");
  if (!memberId) return { error: "This payment link is not valid. Please use the link in your email." };
  if (formData.get("agree") !== "on") {
    return { error: "Please tick the box to agree to the terms and ask for access to start straight away." };
  }

  const member = await db().member.findUnique({ where: { id: memberId } });
  if (!member) return { error: "We could not find your registration. Please reply to your email and we will help." };
  if (member.paidAt) redirect(`/join?t=${encodeURIComponent(token)}`);
  if (member.status !== "payment_open") return { error: "Payment is not open yet. Your personal link arrives by email on 21 November." };

  let url: string | null = null;
  try {
    const price = await membershipPrice();
    const renewal = renewalDateFor(new Date());
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      client_reference_id: member.id,
      ...(member.stripeCustomerId ? { customer: member.stripeCustomerId } : { customer_email: member.email }),
      line_items: [
        // Next charge on the renewal date…
        { price: price.id, quantity: 1 },
        // …and the first £299 today (one-time items are billed on the first invoice).
        { price_data: { currency: price.currency, product: price.product, unit_amount: price.amount }, quantity: 1 },
      ],
      subscription_data: {
        trial_end: Math.floor(renewal.getTime() / 1000),
        metadata: { member_id: member.id },
      },
      metadata: { member_id: member.id },
      payment_method_collection: "always",
      success_url: `${siteUrl()}/join/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/join?t=${encodeURIComponent(token)}`,
      custom_text: {
        submit: {
          message: `£299 today for your first membership period. Renews automatically at £299 on ${renewal.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} and every 12 months after. Cancel any time before a renewal date in your billing settings.`,
        },
      },
    });
    url = session.url;
  } catch (e) {
    console.error("Checkout session failed", e);
  }
  if (!url) return { error: "We could not open the secure payment page. Please try again in a moment." };
  redirect(url);
}
