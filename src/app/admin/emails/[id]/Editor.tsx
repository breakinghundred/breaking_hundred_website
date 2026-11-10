"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  EXTRA_FIELD_INFO,
  MERGE_FIELDS,
  SAMPLE_VARS,
  TEMPLATE_INFO,
  defaultSource,
  validate,
} from "@/lib/email/catalogue";
import { renderHtml } from "@/lib/email/render";
import { compile } from "@/lib/email/source";
import type { TemplateId } from "@/lib/email/templates";
import { editorAction, type EditorState } from "./actions";

export function Editor({ id, subject: savedSubject, body: savedBody, edited }: { id: TemplateId; subject: string; body: string; edited: boolean }) {
  const [state, action, pending] = useActionState<EditorState, FormData>(editorAction, {});
  const [subject, setSubject] = useState(savedSubject);
  const [body, setBody] = useState(savedBody);
  const [saved, setSaved] = useState({ subject: savedSubject, body: savedBody });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<"subject" | "body">("body");

  const problems = validate(id, { subject, body });
  const preview = useMemo(() => {
    const compiled = compile({ subject, body }, SAMPLE_VARS);
    return { subject: compiled.subject, html: renderHtml(compiled.blocks) };
  }, [subject, body]);
  const dirty = subject !== saved.subject || body !== saved.body;

  const fields = { ...MERGE_FIELDS, ...Object.fromEntries((TEMPLATE_INFO[id].extra ?? []).map((f) => [f, EXTRA_FIELD_INFO[f]])) };

  function insert(field: string) {
    const token = `{{${field}}}`;
    const el = lastFocus.current === "subject" ? subjectRef.current : bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    if (lastFocus.current === "subject") setSubject(next);
    else setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <form
      action={(fd) => {
        const op = fd.get("op");
        if (op === "reset") {
          if (!window.confirm("Replace this email with its original wording? Your edits will be lost.")) return;
          const original = defaultSource(id);
          setSubject(original.subject);
          setBody(original.body);
          setSaved(original);
        } else if (op === "save") {
          setSaved({ subject, body });
        }
        return action(fd);
      }}
      className="email-editor"
    >
      <input type="hidden" name="id" value={id} />

      <div className="email-editor-main">
        <label className="email-field">
          Subject
          <input
            ref={subjectRef}
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => (lastFocus.current = "subject")}
            className="admin-input"
            maxLength={200}
          />
        </label>
        <label className="email-field">
          Email
          <textarea
            ref={bodyRef}
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => (lastFocus.current = "body")}
            className="textarea email-body"
            rows={22}
            spellCheck
          />
        </label>

        <details className="email-help">
          <summary>How to format</summary>
          <ul className="small">
            <li>Leave a blank line between paragraphs. A single line break stays a line break (useful for sign-offs).</li>
            <li>Start lines with <code>- </code> for bullets or <code>1. </code> for numbered steps.</li>
            <li><code>## Heading</code> for a small heading, <code>**words**</code> for bold.</li>
            <li><code>| Label | value</code> on each line makes a details table, as in C04.</li>
            <li>Links are made clickable automatically. A line whose merge fields are all empty is left out.</li>
          </ul>
        </details>

        {problems.length > 0 && (
          <ul className="form-error email-problems" role="alert">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        {!pending && state.errors && state.errors.length > 0 && problems.length === 0 && (
          <ul className="form-error email-problems" role="alert">
            {state.errors.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}

        <div className="email-actions">
          <button className="button" type="submit" name="op" value="save" disabled={pending || problems.length > 0 || !dirty}>
            <span>{dirty ? "Save changes" : "Saved"}</span>
          </button>
          <span className="email-test">
            <input name="testTo" type="email" placeholder="Send a test to…" className="admin-input" />
            <button className="button outline" type="submit" name="op" value="test" disabled={pending || problems.length > 0}>
              <span>Send test</span>
            </button>
          </span>
          {(edited || saved.subject !== defaultSource(id).subject || saved.body !== defaultSource(id).body) && (
            <button className="link-btn" type="submit" name="op" value="reset" disabled={pending}>Reset to original</button>
          )}
        </div>
        {pending && <span className="admin-msg">Working…</span>}
        {!pending && state.message && <span className="admin-msg ok">{state.message}</span>}
        {dirty && <span className="admin-msg">You have unsaved changes.</span>}
      </div>

      <aside className="email-side">
        <h3 className="email-side-h">Preview</h3>
        <p className="small muted">With example details. Subject: <b>{preview.subject}</b></p>
        <iframe title="Email preview" className="email-preview" srcDoc={preview.html} sandbox="" />

        <h3 className="email-side-h">Merge fields</h3>
        <p className="small muted">Click to insert at the cursor.</p>
        <ul className="email-fields">
          {Object.entries(fields).map(([f, desc]) => (
            <li key={f}>
              <button type="button" className="link-btn" onClick={() => insert(f)}>{`{{${f}}}`}</button>
              <span className="small muted"> {desc}</span>
            </li>
          ))}
        </ul>
      </aside>
    </form>
  );
}
