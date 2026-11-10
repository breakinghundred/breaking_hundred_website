"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminState } from "./actions";

export function ActionForm({
  action,
  children,
  confirm,
  className,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  children: ReactNode;
  confirm?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      aria-busy={pending}
    >
      {children}
      {pending && <span className="admin-msg">Working…</span>}
      {!pending && state.message && <span className="admin-msg ok">{state.message}</span>}
      {!pending && state.error && <span className="admin-msg err">{state.error}</span>}
    </form>
  );
}
