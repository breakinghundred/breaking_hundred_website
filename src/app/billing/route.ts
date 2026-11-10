import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { readToken } from "@/lib/token";

/**
 * {{manage_billing_link}}: a stable personal link that opens a fresh Stripe
 * customer portal session (portal URLs themselves expire quickly).
 */
export async function GET(req: Request) {
  const memberId = readToken(new URL(req.url).searchParams.get("t"), "billing");
  const member = memberId ? await db().member.findUnique({ where: { id: memberId } }) : null;
  if (!member?.stripeCustomerId) {
    return new Response("This billing link is not valid. Please reply to any Circle email and we will help.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const session = await stripe().billingPortal.sessions.create({
    customer: member.stripeCustomerId,
    return_url: `${siteUrl()}/`,
  });
  return Response.redirect(session.url, 303);
}
