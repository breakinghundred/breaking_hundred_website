"use client";

import { useActionState, useState } from "react";
import { deleteMemberAction } from "./actions";
import { useConfirmSubmit } from "./ConfirmDialog";

/** "Delete this person" (admins only). She must type the member's email to unlock the button. */
export function DeleteMemberForm({ id, name, email, mighty, stripeLive }: { id: string; name: string; email: string; mighty: boolean; stripeLive: boolean }) {
  const [state, formAction, pending] = useActionState(deleteMemberAction, {});
  const [typed, setTyped] = useState("");
  const [guard, dialog] = useConfirmSubmit();
  const matches = typed.trim().toLowerCase() === email;

  return (
    <form
      action={formAction}
      className="pay-form"
      aria-busy={pending}
      onSubmit={(e) => {
        if (!matches) return e.preventDefault();
        guard(e, {
          title: `Delete ${name} for good?`,
          message: [
            "Her registration, payment details, notes and email history will be removed from the site. This cannot be undone.",
            "Emails waiting to go out to her are stopped. Payments recorded by hand and stage changes are kept for the team's records.",
            ...(stripeLive ? ["Her card membership in Stripe will be cancelled now, so she is not charged again. Nothing is refunded."] : []),
            ...(mighty ? ["Nothing changes on Mighty Networks: remove her there yourself."] : []),
          ],
          confirmLabel: "Delete for good",
          danger: true,
        });
      }}
    >
      {dialog}
      <input type="hidden" name="id" value={id} />
      <label className="small">
        To confirm, type her email address: <b>{email}</b>
        <input
          name="confirmEmail"
          type="email"
          className="admin-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
      <button className="button small danger" disabled={!matches || pending}>
        <span>{pending ? "Deleting…" : "Delete this person"}</span>
      </button>
      {!pending && state.error && <span className="admin-msg err" role="alert">{state.error}</span>}
    </form>
  );
}
