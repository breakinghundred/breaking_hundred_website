"use client";

import { useId, useRef, type ReactNode } from "react";

/** A "How to use this page" button that opens the help in a popup. */
export function HelpPopup({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" className="page-help-trigger" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        <span className="page-help-icon" aria-hidden>?</span>
        {title}
      </button>
      <dialog
        ref={ref}
        className="confirm-dialog page-help-dialog"
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) close(); // click on the backdrop
        }}
      >
        <div className="page-help-head">
          <h2 id={titleId}>
            <span className="page-help-icon" aria-hidden>?</span>
            {title}
          </h2>
          <button type="button" className="page-help-close" onClick={close} aria-label="Close help">
            ×
          </button>
        </div>
        <div className="page-help-body">{children}</div>
        <div className="page-help-foot">
          <button type="button" className="button" onClick={close}>
            <span>Got it</span>
          </button>
        </div>
      </dialog>
    </>
  );
}
