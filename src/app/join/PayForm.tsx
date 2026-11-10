"use client";

import { useActionState } from "react";
import { startCheckout, type PayState } from "./actions";

export function PayForm({ token, renewalDate }: { token: string; renewalDate: string }) {
  const [state, action, pending] = useActionState<PayState, FormData>(startCheckout.bind(null, token), {});
  return (
    <form action={action} className="join-form" style={{ gridTemplateColumns: "1fr" }}>
      <label className="check">
        <input type="checkbox" name="agree" required />
        <span>
          I agree to pay £299 today for membership of The Circle, which renews automatically at £299 on{" "}
          {renewalDate} and every 12 months after that until I cancel. I ask for my access to start straight away,
          and I understand that if I cancel within 14 days I may be charged for the access I have used.
        </span>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div>
        <button className="button" type="submit" disabled={pending}>
          <span>{pending ? "Opening secure checkout…" : "Pay £299 securely"}</span>
          <span className="arrow" aria-hidden>↗</span>
        </button>
        <p className="notice">You will be taken to Stripe&apos;s secure checkout. Pay by card in pounds from any country.</p>
      </div>
    </form>
  );
}
