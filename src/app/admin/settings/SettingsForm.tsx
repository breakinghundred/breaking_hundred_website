"use client";

import { useActionState, useState } from "react";
import { saveSettingsAction, type AdminState } from "../actions";

export type FieldView = {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  /** Shown instead of "Not filled in" when leaving it empty is fine. */
  emptyNote?: string;
  type: "url" | "datetime-local";
  value: string;
  usedIn: string[];
};

export type FieldGroup = { title?: string; fields: FieldView[] };

/** How members will read a datetime-local value (already UK time). */
function readable(raw: string) {
  const d = new Date(`${raw.length === 16 ? `${raw}:00` : raw}Z`);
  if (!raw || Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).replace(" ", "");
  return `${day} at ${time} UK time`;
}

function usedInText(usedIn: string[]) {
  if (!usedIn.length) return "Not used in any email at the moment.";
  if (usedIn.length <= 3) return `Used in: ${usedIn.join(", ")}.`;
  return `Used in ${usedIn.length} emails, including ${usedIn.slice(0, 2).join(" and ")}.`;
}

export function SettingsForm({ groups }: { groups: FieldGroup[] }) {
  const initial = Object.fromEntries(groups.flatMap((g) => g.fields.map((f) => [f.key, f.value])));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saved, setSaved] = useState<Record<string, string>>(initial);
  const [state, formAction, pending] = useActionState(async (prev: AdminState, fd: FormData) => {
    const r = await saveSettingsAction(prev, fd);
    if (!r.error) setSaved(Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()])));
    return r;
  }, {});
  const changed = Object.keys(values).filter((k) => values[k].trim() !== (saved[k] ?? ""));
  const dirty = changed.length > 0;

  return (
    <form action={formAction} className="settings-form" aria-busy={pending}>
      {groups.map((g, gi) => (
        <fieldset key={g.title ?? gi} className="settings-group">
          {g.title && <legend>{g.title}</legend>}
          {g.fields.map((f) => {
            const v = values[f.key] ?? "";
            const empty = !v.trim();
            const isUrl = f.type === "url";
            const openable = isUrl && /^https?:\/\/\S+\.\S+$/i.test(v.trim());
            return (
              <div key={f.key} className={`settings-field${changed.includes(f.key) ? " is-changed" : ""}`}>
                <label htmlFor={`s-${f.key}`} className="settings-label">
                  {f.label}
                  {empty && <span className={`badge ${f.emptyNote ? "grey" : "amber"}`}>{f.emptyNote ?? "Not filled in"}</span>}
                </label>
                {f.hint && <p className="settings-hint">{f.hint}</p>}
                <div className="settings-input-row">
                  <input
                    id={`s-${f.key}`}
                    name={f.key}
                    type={f.type}
                    inputMode={isUrl ? "url" : undefined}
                    value={v}
                    placeholder={f.placeholder}
                    onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="admin-input"
                    autoComplete="off"
                  />
                  {openable && (
                    <a href={v.trim()} target="_blank" rel="noreferrer" className="settings-open small">
                      Test link ↗
                    </a>
                  )}
                  {!isUrl && v && (
                    <button type="button" className="link-btn small" onClick={() => setValues((s) => ({ ...s, [f.key]: "" }))}>
                      Clear
                    </button>
                  )}
                </div>
                {!isUrl && (
                  <p className="settings-preview small">
                    {v ? <>Members will see: <b>{readable(v)}</b></> : <>No date yet. Emails say the date is “to be confirmed shortly”.</>}
                  </p>
                )}
                <p className="settings-used small muted">{usedInText(f.usedIn)}</p>
              </div>
            );
          })}
        </fieldset>
      ))}

      <div className="settings-save">
        <button className="button" type="submit" disabled={pending || !dirty}>
          <span>{pending ? "Saving…" : dirty ? `Save ${changed.length === 1 ? "change" : `${changed.length} changes`}` : "Saved"}</span>
        </button>
        {dirty && !pending && (
          <button type="button" className="link-btn" onClick={() => setValues(saved)}>
            Undo changes
          </button>
        )}
        {dirty && !pending && <span className="small muted">You have unsaved changes.</span>}
        {!pending && !dirty && state.message && <span className="admin-msg ok" role="status">{state.message}</span>}
        {!pending && state.error && <span className="admin-msg err" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
