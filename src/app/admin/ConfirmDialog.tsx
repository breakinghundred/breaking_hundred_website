"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ConfirmOptions = {
  title: string;
  /** Extra lines under the title, one paragraph each. */
  message?: ReactNode | ReactNode[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for removing or undoing things. */
  danger?: boolean;
};

/** A string is shorthand for a title-only dialog. */
export type ConfirmProp = string | ConfirmOptions;
const toOptions = (c: ConfirmProp): ConfirmOptions => (typeof c === "string" ? { title: c } : c);

function Dialog({ opts, onDone }: { opts: ConfirmOptions; onDone: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const result = useRef(false);
  const titleId = useId();
  const lines = opts.message === undefined ? [] : Array.isArray(opts.message) ? opts.message : [opts.message];

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // showModal() focuses Cancel (the first button), so Enter never confirms by accident.
  // close() fires onClose, and lets the browser return focus to the button that opened it.
  const finish = (ok: boolean) => {
    result.current = ok;
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onClose={() => onDone(result.current)}
      onClick={(e) => {
        if (e.target === e.currentTarget) finish(false); // click on the backdrop
      }}
    >
      <div className="confirm-body">
        <h2 id={titleId}>{opts.title}</h2>
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <div className="confirm-actions">
          <button type="button" className="button outline" onClick={() => finish(false)}>
            <span>{opts.cancelLabel ?? "Cancel"}</span>
          </button>
          <button type="button" className={`button${opts.danger ? " danger" : ""}`} onClick={() => finish(true)}>
            <span>{opts.confirmLabel ?? "Yes, go ahead"}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** `ask(options)` opens the dialog and resolves true if confirmed. Render `dialog` somewhere in the component. */
export function useConfirm() {
  const [req, setReq] = useState<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const ask = useCallback(
    (c: ConfirmProp) => new Promise<boolean>((resolve) => setReq({ opts: toOptions(c), resolve })),
    [],
  );
  const dialog = req
    ? createPortal(
        <Dialog
          opts={req.opts}
          onDone={(ok) => {
            req.resolve(ok);
            setReq(null);
          }}
        />,
        document.body,
      )
    : null;
  return [ask, dialog] as const;
}

/**
 * Hold a form submit until the dialog is confirmed, then resubmit with the same button
 * (so `name="op" value=…` still reaches the action). Pass null to submit without asking.
 */
export function useConfirmSubmit() {
  const [ask, dialog] = useConfirm();
  const approved = useRef(false);
  const guard = (e: FormEvent<HTMLFormElement>, c: ConfirmProp | null | undefined) => {
    if (!c || approved.current) {
      approved.current = false;
      return;
    }
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    ask(c).then((ok) => {
      if (!ok) return;
      approved.current = true;
      form.requestSubmit(submitter && form.contains(submitter) ? submitter : null);
    });
  };
  return [guard, dialog] as const;
}
