"use client";

import { useActionState, useState } from "react";
import type { MemberStatus } from "@/generated/prisma/client";
import { stageAction } from "./actions";
import { useConfirmSubmit } from "./ConfirmDialog";
import { STAGES, STAGE_ORDER } from "./labels";

/** "Change stage" (admins only): move her to any stage, forwards or backwards. Sends no email. */
export function StageForm({ id, name, current }: { id: string; name: string; current: MemberStatus }) {
  const [state, formAction, pending] = useActionState(stageAction, {});
  const [to, setTo] = useState<MemberStatus | "">("");
  const [guard, dialog] = useConfirmSubmit();
  const at = STAGE_ORDER.indexOf(current);
  const direction = to && to !== "lapsed" && current !== "lapsed" ? (STAGE_ORDER.indexOf(to) > at ? "forward" : "back") : "";

  return (
    <form
      action={formAction}
      className="pay-form"
      aria-busy={pending}
      onSubmit={(e) => {
        if (!to) return e.preventDefault();
        guard(e, {
          title: `Move ${name} from "${STAGES[current].label}" to "${STAGES[to].label}"?`,
          message: [
            "No email will be sent, and nothing changes in Stripe or on Mighty Networks.",
            ...(to === "lapsed" ? ["This does not remove her access. To end a membership properly, use Change payment status instead."] : []),
            "Your name and reason will be saved with the change.",
          ],
          confirmLabel: "Change stage",
        });
      }}
    >
      {dialog}
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="from" value={current} />
      <select
        name="to"
        className="admin-input"
        value={to}
        onChange={(e) => setTo(e.target.value as MemberStatus | "")}
        aria-label={`New stage for ${name}`}
        required
      >
        <option value="">Choose the new stage…</option>
        {STAGE_ORDER.filter((s) => s !== current).map((s) => (
          <option key={s} value={s}>
            {STAGES[s].label}
          </option>
        ))}
      </select>
      {direction && <p className="small muted">This moves her {direction === "forward" ? "forward" : "back"} in the journey.</p>}
      <label className="small">
        Why are you changing it?
        <input name="reason" className="admin-input" minLength={3} maxLength={300} required placeholder="e.g. Added to the wrong stage by mistake" />
      </label>
      <button className="button small" disabled={!to || pending}>
        {pending ? "Saving…" : "Change stage"}
      </button>
      {!pending && state.message && <span className="admin-msg ok" role="status">{state.message}</span>}
      {!pending && state.error && <span className="admin-msg err" role="alert">{state.error}</span>}
    </form>
  );
}
