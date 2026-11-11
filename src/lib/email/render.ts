import type { Block } from "./templates";

import { DESIGNS, DEFAULT_DESIGN, type Design, type DesignId } from "./designs";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escape, then turn bare URLs (and www. hosts) into links. */
function inline(s: string, link: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g, `<a href="$1" style="color:${link}">$1</a>`)
    .replace(/(^|\s)(www\.[^\s<]+[^\s<.,;:)])/g, `$1<a href="https://$2" style="color:${link}">$2</a>`)
    .replace(/\n/g, "<br>");
}

/** A logo in the email header. `src` must be an absolute URL in sent emails. */
export type LogoRef = { src: string; width: number; alt: string };

const NAME = "Breaking Hundred · The Circle";

function header(logos: LogoRef[], d: Design) {
  const center = d.header.align === "center";
  const below = d.header.band ? "0" : "28px";
  const rule = !d.header.band && d.header.rule ? `padding-bottom:20px;border-bottom:${d.header.rule};` : "";
  if (!logos.length) {
    return `<p style="margin:0 0 ${below};${rule}font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:${d.header.wordmark};text-align:${d.header.align}">${NAME}</p>`;
  }
  const gap = center ? "0 10px" : "0 20px 0 0";
  const imgs = logos
    .map(
      (l) =>
        `<td style="padding:${gap};vertical-align:middle"><img src="${esc(l.src)}" width="${l.width}" alt="${esc(l.alt)}" style="display:block;width:${l.width}px;max-width:100%;height:auto;border:0"></td>`,
    )
    .join("");
  const table = `<table role="presentation"${center ? ' align="center"' : ""} style="${center ? "margin:0 auto;" : ""}border-collapse:collapse"><tr>${imgs}</tr></table>`;
  return `<div style="margin:0 0 ${below};${rule}">${table}</div>`;
}

function body(blocks: Block[], d: Design) {
  const P = `style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${d.text}"`;
  const t = (s: string) => inline(s, d.link);
  return blocks
    .map((b) => {
      if (typeof b === "string") return `<p ${P}>${t(b)}</p>`;
      if ("list" in b) return `<ul style="margin:0 0 16px;padding-left:22px">${b.list.map((i) => `<li ${P}>${t(i)}</li>`).join("")}</ul>`;
      if ("ordered" in b) return `<ol style="margin:0 0 16px;padding-left:22px">${b.ordered.map((i) => `<li ${P}>${t(i)}</li>`).join("")}</ol>`;
      if ("strong" in b) return `<p ${P}><strong>${t(b.strong)}</strong></p>`;
      if ("heading" in b) return `<p style="margin:24px 0 8px;color:${d.heading};${d.headingStyle}">${t(b.heading)}</p>`;
      if ("facts" in b)
        return `<table role="presentation" style="margin:0 0 16px;border-collapse:collapse">${b.facts
          .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:${d.muted};font-size:15px">${esc(k)}</td><td style="padding:4px 0;font-weight:600;color:${d.text};font-size:15px">${t(v)}</td></tr>`)
          .join("")}</table>`;
      return `<p ${P}>${t(b.signoff)}</p>`;
    })
    .join("\n");
}

function footer(d: Design) {
  const f = d.footer;
  if (!f) return "";
  const style = `padding:${f.outside ? "18px 12px 0" : "18px 24px"};font-size:12px;letter-spacing:.08em;text-transform:uppercase;text-align:center;color:${f.color};${f.bg ? `background:${f.bg};` : ""}${f.border ? `border-top:${f.border};` : ""}`;
  return `<tr><td style="${style}">${NAME}</td></tr>`;
}

/** The email as HTML, in the chosen design. */
export function renderHtml(blocks: Block[], logos: LogoRef[] = [], design: DesignId = DEFAULT_DESIGN) {
  const d: Design = DESIGNS[design] ?? DESIGNS[DEFAULT_DESIGN];
  const band = d.header.band
    ? `<tr><td style="padding:${d.header.band.pad};background:${d.header.band.bg};border-bottom:${d.header.band.border}">${header(logos, d)}</td></tr>`
    : "";
  const inner = `<tr><td style="padding:${d.cardPad}">${d.header.band ? "" : header(logos, d)}
${body(blocks, d)}
</td></tr>`;
  const card = `<table role="presentation" width="100%" style="max-width:${d.width}px;border-collapse:separate;border-spacing:0;background:${d.cardBg};${d.cardStyle};overflow:hidden">
${band}${inner}${d.footer && !d.footer.outside ? footer(d) : ""}
</table>`;
  const after = d.footer?.outside ? `<table role="presentation" width="100%" style="max-width:${d.width}px;border-collapse:collapse">${footer(d)}</table>` : "";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${d.pageBg};font-family:${d.font}">
<table role="presentation" width="100%" style="border-collapse:collapse;background:${d.pageBg}"><tr><td align="center" style="padding:${d.outerPad};font-family:${d.font}">
${card}${after}
</td></tr></table></body></html>`;
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
