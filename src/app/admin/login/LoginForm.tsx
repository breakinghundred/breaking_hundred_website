"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="join-form login-form">
      <input type="hidden" name="next" value={next} />
      <label className="wide">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </label>
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
