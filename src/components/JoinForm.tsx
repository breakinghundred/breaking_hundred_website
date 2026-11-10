"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { submitInterest, type InterestState } from "@/app/interest/actions";
import { site } from "@/lib/site";
import { EASE } from "./motion";

/**
 * The Circle interest form (Stage 1). Creates or updates the member record and sends C01.
 * Hidden behind a button by default; the panel opens with CSS transitions
 * (height via grid rows, then a staggered fade-up of each field).
 */
export function JoinForm({ startOpen = false }: { startOpen?: boolean }) {
  const [state, action, pending] = useActionState<InterestState, FormData>(submitInterest, {});
  const [open, setOpen] = useState(startOpen);
  const panelId = useId();
  const firstField = useRef<HTMLInputElement>(null);
  // When the form became visible; the server rejects submissions faster than a person could type.
  // Kept in a ref (not a field) because React resets form fields after each submit.
  const startedAt = useRef(0);
  useEffect(() => {
    if (open && !startedAt.current) startedAt.current = Date.now();
  }, [open]);
  const submit = (formData: FormData) => {
    formData.set("startedAt", String(startedAt.current));
    return action(formData);
  };

  // Move focus into the form once it has opened (skipped when it starts open).
  const opened = useRef(startOpen);
  useEffect(() => {
    if (open && !opened.current) {
      opened.current = true;
      const t = setTimeout(() => firstField.current?.focus({ preventScroll: true }), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (state.ok) {
    return (
      <div className="flow-card reveal-done" role="status">
        <h3>Thank you{state.firstName ? `, ${state.firstName}` : ""}.</h3>
        <p>
          Your interest is registered and a confirmation is on its way to your inbox. Your personal payment link
          will arrive by 21 November, and we will hold an onboarding call in December.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={`reveal ${open ? "is-open" : ""}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="reveal-trigger" inert={open}>
        <div className="reveal-clip">
          <button
            type="button"
            className="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(true)}
          >
            <span>Register my interest</span>
            <span className="arrow" aria-hidden>↓</span>
          </button>
        </div>
      </div>

      <div id={panelId} className="reveal-panel" inert={!open}>
        <div className="reveal-clip">
          <form action={submit} className="join-form">
            <label>
              First name
              <input ref={firstField} name="firstName" autoComplete="given-name" required maxLength={100} />
            </label>
            <label>
              Last name
              <input name="lastName" autoComplete="family-name" required maxLength={100} />
            </label>
            <label className="wide">
              Email
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
            <label className="wide check">
              <input name="consent" type="checkbox" required />
              <span>I agree to receive emails about The Circle from Breaking Hundred. You can reply to any email to ask us to stop.</span>
            </label>
            {state.error && (
              <p className="wide form-error" role="alert">
                {state.error}
              </p>
            )}
            <div className="wide">
              <button className="button" type="submit" disabled={pending}>
                <span>{pending ? "Registering…" : "Register my interest"}</span>
                <span className="arrow" aria-hidden>↗</span>
              </button>
              <p className="notice">
                No payment yet. Use the email address you will use on Mighty Networks. See our{" "}
                <a href={site.privacy} target="_blank" rel="noopener noreferrer">privacy policy</a>.
              </p>
            </div>
            <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden />
          </form>
        </div>
      </div>
    </motion.div>
  );
}
