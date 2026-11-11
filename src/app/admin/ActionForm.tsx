"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminState } from "./actions";
import { useConfirmSubmit, type ConfirmProp } from "./ConfirmDialog";

export function ActionForm({
  action,
  children,
  confirm,
  className,
}: {
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  children: ReactNode;
  confirm?: ConfirmProp;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [guard, dialog] = useConfirmSubmit();
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => guard(e, confirm)}
      aria-busy={pending}
    >
      {children}
      {dialog}
      {pending && <span className="admin-msg">Please wait…</span>}
      {!pending && state.message && <span className="admin-msg ok" role="status">{state.message}</span>}
      {!pending && state.error && <span className="admin-msg err" role="alert">{state.error}</span>}
    </form>
  );
}
