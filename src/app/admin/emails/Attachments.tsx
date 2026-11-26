"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { removeAttachmentAction, uploadAttachmentAction, type AttachmentResult } from "./attachment-actions";

export type AttachmentItem = { id: string; filename: string; size: string };

/**
 * Files sent with this email. Saved as soon as they are added or removed (not with
 * "Save"), so this sits inside the editor's form but never submits it.
 */
export function Attachments({
  owner,
  files,
  accept,
  kinds,
  maxLabel,
  blocked,
}: {
  /** "draft:<id>" or "template:<id>". */
  owner: string;
  files: AttachmentItem[];
  accept: string;
  kinds: string;
  maxLabel: string;
  /** Why files can't be added to this email, if they can't. */
  blocked?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<AttachmentResult>({});
  const [pending, start] = useTransition();

  function run(call: () => Promise<AttachmentResult>) {
    start(async () => {
      const r = await call().catch(() => ({ error: "Sorry, that did not work. The file may be too large. Please try again." }));
      setResult(r);
      router.refresh();
    });
  }

  function upload(list: FileList | null) {
    const chosen = [...(list ?? [])];
    if (input.current) input.current.value = "";
    if (!chosen.length) return;
    run(async () => {
      // One request per file keeps each one under the upload size limit.
      const done: string[] = [];
      for (const file of chosen) {
        const fd = new FormData();
        fd.set("owner", owner);
        fd.set("file", file);
        const r = await uploadAttachmentAction(fd);
        if (r.error) return { error: chosen.length > 1 ? `“${file.name}”: ${r.error}` : r.error, message: done.length ? `Attached ${done.join(", ")}.` : undefined };
        done.push(`“${file.name}”`);
      }
      return { message: chosen.length > 1 ? `Attached ${done.length} files.` : `Attached ${done[0]}.` };
    });
  }

  function remove(id: string) {
    const fd = new FormData();
    fd.set("owner", owner);
    fd.set("id", id);
    run(() => removeAttachmentAction(fd));
  }

  return (
    <fieldset className="mail-box">
      <legend>Attached files</legend>
      {files.length > 0 ? (
        <ul className="attach-list">
          {files.map((f) => (
            <li key={f.id}>
              <a href={`/admin/emails/attachments/${f.id}`} className="attach-name">{f.filename}</a>
              <span className="small muted">{f.size}</span>
              <button type="button" className="link-btn danger" disabled={pending} onClick={() => remove(f.id)} aria-label={`Remove ${f.filename}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">{blocked ?? "No files attached."}</p>
      )}
      {!blocked && (
        <div>
          <input ref={input} id={`attach-${owner}`} type="file" multiple accept={accept} className="sr-only" onChange={(e) => upload(e.target.files)} disabled={pending} />
          <button type="button" className="button outline" disabled={pending} onClick={() => input.current?.click()}>
            <span>{pending ? "Working…" : "Attach a file"}</span>
          </button>
          <p className="small muted attach-hint">{kinds}, up to {maxLabel} each. Files are saved as soon as you add them.</p>
        </div>
      )}
      {!pending && result.error && <p className="form-error" role="alert">{result.error}</p>}
      {!pending && result.message && <p className="admin-msg ok" role="status">{result.message}</p>}
    </fieldset>
  );
}
