"use client";

import { useActionState, useState } from "react";
import { importAction, type AdminState } from "../actions";

/** Upload a CSV or Excel file of people to add to the list. */
export function ImportForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(importAction, {});
  const [fileName, setFileName] = useState("");

  return (
    <form action={(fd) => { formAction(fd); setFileName(""); }} className="import-form" aria-busy={pending}>
      <label className={`import-drop${fileName ? " has-file" : ""}`}>
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
        <span className="import-drop-title">{fileName || "Choose a CSV or Excel file"}</span>
        <span className="small muted">{fileName ? "Press Add to the list, or choose a different file" : ".csv or .xlsx, up to 2 MB"}</span>
      </label>
      <div className="import-actions">
        <button className="button outline" type="submit" disabled={pending || !fileName}>
          <span>{pending ? "Adding…" : "Add to the list"}</span>
        </button>
        {!pending && state.message && <span className="admin-msg ok" role="status">{state.message}</span>}
        {!pending && state.error && <span className="admin-msg err" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
