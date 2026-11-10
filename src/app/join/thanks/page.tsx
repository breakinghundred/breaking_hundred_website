import type { Metadata } from "next";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

/** Never marks anyone as paid: only the Stripe webhook does that. */
export default function ThanksPage() {
  return (
    <section className="section flow-page">
      <div className="wrap join">
        <span className="eyebrow" style={{ color: "var(--wine)" }}>The Circle membership</span>
        <h1 className="flow-title">Thank you.</h1>
        <p className="muted">
          We are confirming your payment with Stripe now. Your payment confirmation will arrive by email in a minute
          or two, followed a few minutes later by step by step instructions for joining The Circle on Mighty
          Networks.
        </p>
        <div className="flow-card">
          <p>
            <strong>Sign up on Mighty Networks with the same email address you used here.</strong> That is how we open
            your member spaces.
          </p>
        </div>
      </div>
    </section>
  );
}
