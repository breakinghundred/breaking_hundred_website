"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { MERGE_FIELDS, SAMPLE_VARS, validateCustom } from "@/lib/email/catalogue";
import { renderHtml } from "@/lib/email/render";
import { compile } from "@/lib/email/source";
import { useConfirmSubmit, type ConfirmOptions } from "../../../ConfirmDialog";
import { draftAction, type DraftState } from "../../mail-actions";

type Contact = { id: string; name: string; email: string; status: string };
type Logo = { id: string; name: string; width: number; src: string };
type Draft = { id: string; subject: string; body: string; logoIds: string[]; recipientIds: string[]; audience: string };

const snapshot = (d: Omit<Draft, "id">) => JSON.stringify(d);

export function DraftEditor({
  draft,
  contacts,
  stages,
  logos,
  testTo,
}: {
  draft: Draft;
  contacts: Contact[];
  stages: { value: string; label: string }[];
  logos: Logo[];
  testTo: string;
}) {
  const [state, action, pending] = useActionState<DraftState, FormData>(draftAction, {});
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [logoIds, setLogoIds] = useState(() => draft.logoIds.filter((id) => logos.some((l) => l.id === id)));
  const [recipientIds, setRecipientIds] = useState(() => draft.recipientIds.filter((id) => contacts.some((c) => c.id === id)));
  const [audience, setAudience] = useState(draft.audience);
  const [search, setSearch] = useState("");
  const current = { subject, body, logoIds, recipientIds, audience };
  const [saved, setSaved] = useState(() => snapshot({ ...draft, logoIds, recipientIds }));
  const dirty = snapshot(current) !== saved;
  const [guard, dialog] = useConfirmSubmit();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<"subject" | "body">("body");

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const chosenLogos = logos.filter((l) => logoIds.includes(l.id));
  const problems = validateCustom({ subject, body });
  const preview = useMemo(() => {
    const c = compile({ subject, body }, SAMPLE_VARS);
    return { subject: c.subject, html: renderHtml(c.blocks, chosenLogos.map((l) => ({ src: l.src, width: l.width, alt: l.name }))) };
  }, [subject, body, chosenLogos]);

  const recipients = contacts.filter(
    (c) => recipientIds.includes(c.id) || audience === "all" || (audience !== "" && c.status === audience),
  );
  const groupCount = (value: string) => contacts.filter((c) => value === "all" || c.status === value).length;

  const q = search.trim().toLowerCase();
  const matches = q
    ? contacts.filter((c) => !recipientIds.includes(c.id) && (c.name.toLowerCase().includes(q) || c.email.includes(q))).slice(0, 8)
    : [];

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

  function confirmFor(op: string | undefined): ConfirmOptions | null {
    if (op === "delete") {
      return { title: "Delete this draft?", message: "The wording will be lost. Emails already sent are not affected.", confirmLabel: "Delete draft", danger: true };
    }
    if (op !== "send") return null;
    const n = recipients.length;
    const names = recipients.slice(0, 3).map((r) => r.name);
    return {
      title: `Send this email to ${n} ${n === 1 ? "person" : "people"}?`,
      message: [
        `“${subject.trim()}”`,
        n <= 3 ? `It goes to ${names.join(", ")}.` : `Including ${names.join(", ")} and ${n - 3} more.`,
        "Each person gets their own copy, filled in with their own details.",
      ],
      confirmLabel: `Send to ${n}`,
    };
  }

  const noOne = recipients.length === 0;

  return (
    <form
      action={(fd) => {
        if (fd.get("op") !== "delete") setSaved(snapshot(current));
        return action(fd);
      }}
      onSubmit={(e) => guard(e, confirmFor(((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value))}
      className="email-editor"
    >
      {dialog}
      <input type="hidden" name="id" value={draft.id} />
      <input type="hidden" name="audience" value={audience} />
      {recipientIds.map((id) => <input key={id} type="hidden" name="recipient" value={id} />)}
      {logoIds.map((id) => <input key={id} type="hidden" name="logo" value={id} />)}

      <div className="email-editor-main">
        <fieldset className="mail-box">
          <legend>Who it goes to</legend>
          <label className="email-field">
            A whole group
            <select className="admin-input" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="">No group, just the people below</option>
              <option value="all">Everyone registered ({groupCount("all")})</option>
              {stages.map((s) => (
                <option key={s.value} value={s.value}>{s.label} ({groupCount(s.value)})</option>
              ))}
            </select>
          </label>

          <div className="email-field">
            <label htmlFor="contact-search">Add people one by one</label>
            <input
              id="contact-search"
              type="search"
              className="admin-input"
              placeholder="Search contacts by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (matches[0]) {
                    setRecipientIds((ids) => [...ids, matches[0].id]);
                    setSearch("");
                  }
                }
              }}
              autoComplete="off"
            />
            {q && (
              <ul className="contact-matches">
                {matches.length === 0 && <li className="small muted">No one else matches “{search}”.</li>}
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientIds((ids) => [...ids, c.id]);
                        setSearch("");
                      }}
                    >
                      <b>{c.name}</b> <span className="small muted">{c.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {recipientIds.length > 0 && (
            <ul className="chips" aria-label="People added">
              {recipientIds.map((id) => (
                <li key={id} className="chip">
                  <span title={byId.get(id)?.email}>{byId.get(id)?.name ?? "Unknown"}</span>
                  <button type="button" aria-label={`Remove ${byId.get(id)?.name}`} onClick={() => setRecipientIds((ids) => ids.filter((x) => x !== id))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className={`small ${noOne ? "muted" : ""}`}>
            {noOne ? "Nobody chosen yet." : <>Will go to <b>{recipients.length}</b> {recipients.length === 1 ? "person" : "people"}.</>}
          </p>
        </fieldset>

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
            placeholder="What is this email about?"
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
            rows={18}
            spellCheck
          />
        </label>

        <details className="email-help">
          <summary>How to format</summary>
          <ul className="small">
            <li>Leave a blank line between paragraphs. A single line break stays a line break (useful for sign-offs).</li>
            <li>Start lines with <code>- </code> for bullets or <code>1. </code> for numbered steps.</li>
            <li><code>## Heading</code> for a small heading, <code>**words**</code> for bold.</li>
            <li>Links are made clickable automatically. Merge fields like <code>{"{{first_name}}"}</code> are filled in for each person.</li>
          </ul>
        </details>

        <fieldset className="mail-box">
          <legend>Logos at the top</legend>
          {logos.length === 0 ? (
            <p className="small muted">
              No logos yet. <Link href="/admin/emails/logos">Upload one on the Logos page</Link>.
            </p>
          ) : (
            <ul className="logo-picks">
              {logos.map((l) => (
                <li key={l.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={logoIds.includes(l.id)}
                      onChange={(e) =>
                        setLogoIds((ids) =>
                          e.target.checked ? logos.filter((x) => x.id === l.id || ids.includes(x.id)).map((x) => x.id) : ids.filter((x) => x !== l.id),
                        )
                      }
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail of an uploaded logo */}
                    <img src={l.src} alt="" />
                    <span className="small">{l.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {problems.length > 0 && (subject || body.trim()) && (
          <ul className="form-error email-problems" role="alert">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        {!pending && state.errors && state.errors.length > 0 && (
          <ul className="form-error email-problems" role="alert">
            {state.errors.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}

        <div className="email-actions">
          <button className="button" type="submit" name="op" value="send" disabled={pending || problems.length > 0 || noOne}>
            <span>{noOne ? "Send" : `Send to ${recipients.length}`}</span>
          </button>
          <button className="button outline" type="submit" name="op" value="save" disabled={pending || !dirty}>
            <span>{dirty ? "Save draft" : "Saved"}</span>
          </button>
          <span className="email-test">
            <input name="testTo" type="email" defaultValue={testTo} placeholder="Send a test to…" className="admin-input" aria-label="Send a test to" />
            <button className="button outline" type="submit" name="op" value="test" disabled={pending || problems.length > 0}>
              <span>Send test</span>
            </button>
          </span>
          <button className="link-btn danger" type="submit" name="op" value="delete" disabled={pending}>Delete draft</button>
        </div>
        {pending && <span className="admin-msg">Working…</span>}
        {!pending && state.message && <span className="admin-msg ok" role="status">{state.message}</span>}
        {dirty && !pending && <span className="admin-msg">You have unsaved changes.</span>}
      </div>

      <aside className="email-side">
        <h3 className="email-side-h">Preview</h3>
        <p className="small muted">With example details. Subject: <b>{preview.subject || "(none yet)"}</b></p>
        <iframe title="Email preview" className="email-preview" srcDoc={preview.html} sandbox="" />

        <h3 className="email-side-h">Merge fields</h3>
        <p className="small muted">Click to insert at the cursor. Each person gets their own details.</p>
        <ul className="email-fields">
          {Object.entries(MERGE_FIELDS).map(([f, desc]) => (
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
