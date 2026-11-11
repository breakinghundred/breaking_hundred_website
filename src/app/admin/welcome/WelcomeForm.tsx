"use client";

import { useActionState } from "react";
import { setPassword, type WelcomeState } from "./actions";

export function WelcomeForm({ token, email, min }: { token: string; email: string; min: number }) {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(setPassword, {});
  return (
    <form action={action} className="join-form login-form">
      <input type="hidden" name="t" value={token} />
      {/* Lets password managers save the right username. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <label className="wide">
        New password
        <input name="password" type="password" autoComplete="new-password" minLength={min} required autoFocus />
      </label>
      <label className="wide">
        Type it again
        <input name="confirm" type="password" autoComplete="new-password" minLength={min} required />
      </label>
      <p className="small muted wide">At least {min} characters. A short sentence is easy to remember and hard to guess.</p>
      {state.error && <p className="form-error wide" role="alert">{state.error}</p>}
      <button className="button" type="submit" disabled={pending}>
        <span>{pending ? "Saving…" : "Save password and sign in"}</span>
      </button>
    </form>
  );
}
