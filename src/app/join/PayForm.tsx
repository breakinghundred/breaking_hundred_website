"use client";

import { useActionState } from "react";
import { site } from "@/lib/site";
import { startCheckout, type PayState } from "./actions";

export function PayForm({ token, renewalDate, price }: { token: string; renewalDate: string; price: string }) {
  const [state, action, pending] = useActionState<PayState, FormData>(startCheckout.bind(null, token), {});
  return (
    <form action={action} className="join-form" style={{ gridTemplateColumns: "1fr" }}>
      <label className="check">
        <input type="checkbox" name="agree" required />
        <span>
          I agree to pay {price} today for membership of The Circle, which renews automatically at {price} on{" "}
          {renewalDate} and every 12 months after that until I cancel. I ask for my access to start straight away,
          and I understand that if I cancel within 14 days I may be charged for the access I have used.
        </span>
      </label>
      <label className="check">
        <input type="checkbox" name="terms" required />
        <span>
          I have read and agree to the{" "}
          <a href={site.terms} target="_blank" rel="noopener noreferrer">terms and conditions</a>, including the SPFT
          staff participation clause (section 2), and the{" "}
          <a href={site.privacy} target="_blank" rel="noopener noreferrer">privacy policy</a>.
        </span>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div>
        <button className="button" type="submit" disabled={pending}>
          <span>{pending ? "Opening secure checkout…" : `Pay ${price} securely`}</span>
          <span className="arrow" aria-hidden>↗</span>
        </button>
        <p className="notice">You will be taken to Stripe&apos;s secure checkout. Pay by card in pounds from any country.</p>
      </div>
    </form>
  );
}
