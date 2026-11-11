import type { Block } from "./templates";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escape, then turn bare URLs (and www. hosts) into links. */
function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g, '<a href="$1" style="color:#7c354f">$1</a>')
    .replace(/(^|\s)(www\.[^\s<]+[^\s<.,;:)])/g, '$1<a href="https://$2" style="color:#7c354f">$2</a>')
    .replace(/\n/g, "<br>");
}

const P = 'style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#251423"';

/** A logo in the email header. `src` must be an absolute URL in sent emails. */
export type LogoRef = { src: string; width: number; alt: string };

function header(logos: LogoRef[]) {
  if (!logos.length) {
    return '<p style="margin:0 0 28px;font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#7c354f">Breaking Hundred · The Circle</p>';
  }
  const imgs = logos
    .map(
      (l) =>
        `<td style="padding:0 20px 0 0;vertical-align:middle"><img src="${esc(l.src)}" width="${l.width}" alt="${esc(l.alt)}" style="display:block;width:${l.width}px;max-width:100%;height:auto;border:0"></td>`,
    )
    .join("");
  return `<table role="presentation" style="margin:0 0 28px;border-collapse:collapse"><tr>${imgs}</tr></table>`;
}

export function renderHtml(blocks: Block[], logos: LogoRef[] = []) {
  const body = blocks
    .map((b) => {
      if (typeof b === "string") return `<p ${P}>${inline(b)}</p>`;
      if ("list" in b) return `<ul style="margin:0 0 16px;padding-left:22px">${b.list.map((i) => `<li ${P}>${inline(i)}</li>`).join("")}</ul>`;
      if ("ordered" in b) return `<ol style="margin:0 0 16px;padding-left:22px">${b.ordered.map((i) => `<li ${P}>${inline(i)}</li>`).join("")}</ol>`;
      if ("strong" in b) return `<p ${P}><strong>${inline(b.strong)}</strong></p>`;
      if ("heading" in b) return `<p style="margin:24px 0 8px;font-size:17px;font-weight:700;color:#32142b">${inline(b.heading)}</p>`;
      if ("facts" in b)
        return `<table role="presentation" style="margin:0 0 16px;border-collapse:collapse">${b.facts
          .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6f626c">${esc(k)}</td><td style="padding:4px 0;font-weight:600">${inline(v)}</td></tr>`)
          .join("")}</table>`;
      return `<p ${P}>${inline(b.signoff)}</p>`;
    })
    .join("\n");
  return `<!doctype html><html><body style="margin:0;background:#f8f4f1;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;background:#fffdfb">
${header(logos)}
${body}
</div></body></html>`;
}

const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

export function renderText(blocks: Block[]) {
  return plain(blocks
    .map((b) => {
      if (typeof b === "string") return b;
      if ("list" in b) return b.list.map((i) => `• ${i}`).join("\n");
      if ("ordered" in b) return b.ordered.map((i, n) => `${n + 1}. ${i}`).join("\n");
      if ("strong" in b) return b.strong;
      if ("heading" in b) return b.heading.toUpperCase();
      if ("facts" in b) return b.facts.map(([k, v]) => `${k}: ${v}`).join("\n");
      return b.signoff;
    })
    .join("\n\n"));
}
