"use client";

import { useActionState, useState } from "react";
import type { PaymentChange } from "@/lib/members";
import { paymentStatusAction } from "./actions";
import { PAYMENT_CHANGES } from "./labels";

/** "Change payment status": every change emails the member, so the confirm says which email goes. */
export function PaymentStatusForm({ id, name, options }: { id: string; name: string; options: PaymentChange[] }) {
  const [state, formAction, pending] = useActionState(paymentStatusAction, {});
  const [change, setChange] = useState<PaymentChange | "">("");

  return (
    <form
      action={formAction}
      className="pay-form"
      aria-busy={pending}
      onSubmit={(e) => {
        if (!change) return e.preventDefault();
        const ok = window.confirm(
          `Change ${name}'s payment status to "${PAYMENT_CHANGES[change].label}"?\n\n` +
            `She will be sent ${PAYMENT_CHANGES[change].email}.\n\n` +
            "This updates our records only. It does not charge or refund anything in Stripe.",
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <select
        name="change"
        className="admin-input"
        value={change}
        onChange={(e) => setChange(e.target.value as PaymentChange | "")}
        aria-label={`New payment status for ${name}`}
        required
      >
        <option value="">Choose the new status…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {PAYMENT_CHANGES[o].label}
          </option>
        ))}
      </select>
      {change === "paid" && (
        <>
          <label className="small">
            Amount paid (£)
            <input name="amount" inputMode="decimal" defaultValue="299" className="admin-input" />
          </label>
          <label className="small">
            Payment reference (optional)
            <input name="reference" placeholder="e.g. bank transfer ref" className="admin-input" maxLength={80} />
          </label>
        </>
      )}
      {change && <p className="small muted">She will be sent {PAYMENT_CHANGES[change].email}.</p>}
      <button className="button small" disabled={!change || pending}>
        {pending ? "Saving…" : "Save and email her"}
      </button>
      {!pending && state.message && <span className="admin-msg ok" role="status">{state.message}</span>}
      {!pending && state.error && <span className="admin-msg err" role="alert">{state.error}</span>}
    </form>
  );
}
