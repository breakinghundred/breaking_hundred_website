"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="join-form login-form">
      <input type="hidden" name="next" value={next} />
      <label className="wide">
        Email
        <input name="email" type="email" autoComplete="username" required autoFocus defaultValue={state.email} />
      </label>
      <label className="wide">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </label>
      <p className="small muted wide">Forgotten your password? Ask an admin to send you a new link.</p>
      {state.error && (
        <p id="login-error" className="form-error wide" role="alert">
          {state.error}
        </p>
      )}
      <button className="button" type="submit" disabled={pending}>
        <span>{pending ? "Signing in…" : "Sign in"}</span>
      </button>
    </form>
  );
}
