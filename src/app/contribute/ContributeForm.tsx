"use client";

import { useActionState } from "react";
import { submitContribution, type ContributeState } from "./actions";
import { TRACKS } from "./tracks";

export function ContributeForm({ token, current }: { token: string; current: string[] }) {
  const [state, action, pending] = useActionState<ContributeState, FormData>(submitContribution.bind(null, token), {});
  if (state.ok) {
    return (
      <div className="flow-card" role="status">
        <h3>Thank you.</h3>
        <p>We have your choices, and someone from the team will be in touch about next steps.</p>
      </div>
    );
  }
  return (
    <form action={action} className="join-form" style={{ gridTemplateColumns: "1fr" }}>
      <fieldset className="track-list" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="eyebrow" style={{ marginBottom: 12 }}>Choose one or more</legend>
        {TRACKS.map((t) => (
          <label key={t.id} className="check">
            <input type="checkbox" name="track" value={t.id} defaultChecked={current.includes(t.id)} />
            <span><strong>{t.id}</strong>: {t.body}</span>
          </label>
        ))}
      </fieldset>
      <label>
        Anything you would like us to know (optional)
        <textarea name="note" rows={4} maxLength={2000} className="textarea" />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div>
        <button className="button" type="submit" disabled={pending}>
          <span>{pending ? "Sending…" : "Send my choices"}</span>
          <span className="arrow" aria-hidden>↗</span>
        </button>
      </div>
    </form>
  );
}
