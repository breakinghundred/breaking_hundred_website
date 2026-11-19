"use client";

import { useActionState, useState } from "react";
import type { PaymentChange } from "@/lib/members";
import { paymentStatusAction } from "./actions";
import { useConfirmSubmit } from "./ConfirmDialog";
import { SignaturePad } from "./SignaturePad";
import { PAYMENT_CHANGES } from "./labels";

/** "Change payment status": every change emails the member, so the confirm says which email goes. */
export function PaymentStatusForm({ id, name, options, defaultAmount }: { id: string; name: string; options: PaymentChange[]; defaultAmount: number }) {
  const [state, formAction, pending] = useActionState(paymentStatusAction, {});
  const [change, setChange] = useState<PaymentChange | "">("");
  const [missing, setMissing] = useState("");
  const [guard, dialog] = useConfirmSubmit();

  return (
    <form
      action={formAction}
      className="pay-form"
      aria-busy={pending}
      onSubmit={(e) => {
        if (!change) return e.preventDefault();
        if (change === "paid") {
          const data = new FormData(e.currentTarget);
          if (!String(data.get("signature") ?? "")) {
            e.preventDefault();
            setMissing("Please sign in the signature box before saving.");
            return;
          }
        }
        setMissing("");
        guard(e, {
          title: `Change ${name}'s payment status to "${PAYMENT_CHANGES[change].label}"?`,
          message: [
            `She will be sent ${PAYMENT_CHANGES[change].email}.`,
            ...(change === "paid" ? ["Your name and signature will be saved with this payment record."] : []),
            "This updates our records only. It does not charge or refund anything in Stripe.",
          ],
          confirmLabel: "Save and email her",
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      {dialog}
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
          <p className="small muted">Every field is required.</p>
          <label className="small">
            Amount paid (£)
            <input
              name="amount"
              inputMode="decimal"
              defaultValue={String(defaultAmount)}
              className="admin-input"
              required
              pattern="\s*£?\s*\d[\d,]*(\.\d{1,2})?\s*"
              title="The amount in pounds, for example 299 or 299.00"
            />
          </label>
          <label className="small">
            Payment reference
            <input name="reference" placeholder="e.g. bank transfer ref" className="admin-input" maxLength={80} required />
          </label>
          <label className="small">
            Your full name
            <input name="signedName" autoComplete="name" className="admin-input" minLength={2} maxLength={100} required />
          </label>
          <SignaturePad name="signature" label="Your signature" />
        </>
      )}
      {change && <p className="small muted">She will be sent {PAYMENT_CHANGES[change].email}.</p>}
      <button className="button small" disabled={!change || pending}>
        {pending ? "Saving…" : "Save and email her"}
      </button>
      {!pending && state.message && <span className="admin-msg ok" role="status">{state.message}</span>}
      {missing && <span className="admin-msg err" role="alert">{missing}</span>}
      {!pending && !missing && state.error && <span className="admin-msg err" role="alert">{state.error}</span>}
    </form>
  );
}
