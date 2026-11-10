/**
 * Editable email source format (pure; runs on server and in the admin preview).
 *
 *   Paragraphs are separated by a blank line. A single line break stays a line break.
 *   - item          bulleted list (every line in the block starts with "- ")
 *   1. item         numbered list
 *   ## Heading      small heading
 *   | Label | value table rows (C04 payment details)
 *   **bold**        bold text inside any line
 *   {{field}}       merge field
 *
 * A line, list item or table row whose merge fields are all empty is left out,
 * so optional lines (e.g. the calendar link) disappear when not set.
 */
import type { Block, Vars } from "./templates";

export type Source = { subject: string; body: string };

const FIELD = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function fieldsIn(text: string): string[] {
  return [...new Set([...text.matchAll(FIELD)].map((m) => m[1].toLowerCase()))];
}

export function serialize(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (typeof b === "string") return b;
      if ("list" in b) return b.list.map((i) => `- ${i}`).join("\n");
      if ("ordered" in b) return b.ordered.map((i, n) => `${n + 1}. ${i}`).join("\n");
      if ("strong" in b) return `**${b.strong}**`;
      if ("heading" in b) return `## ${b.heading}`;
      if ("facts" in b) return b.facts.map(([k, v]) => `| ${k} | ${v}`).join("\n");
      return b.signoff;
    })
    .join("\n\n");
}

export function parse(body: string): Block[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      const lines = chunk.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) return { list: lines.map((l) => l.slice(2)) };
      if (lines.every((l) => /^\d+\.\s/.test(l))) return { ordered: lines.map((l) => l.replace(/^\d+\.\s+/, "")) };
      if (lines.every((l) => l.startsWith("|"))) {
        return {
          facts: lines.map((l) => {
            const [k = "", ...rest] = l.replace(/^\|/, "").replace(/\|$/, "").split("|");
            return [k.trim(), rest.join("|").trim()] as [string, string];
          }),
        };
      }
      if (lines.length === 1 && lines[0].startsWith("## ")) return { heading: lines[0].slice(3) };
      return lines.join("\n");
    });
}

/** Fill merge fields; returns null when the text had fields and all of them were empty. */
function fill(text: string, vars: Vars): string | null {
  let fields = 0;
  let filled = 0;
  const out = text.replace(FIELD, (_, key: string) => {
    fields++;
    const value = vars[key.toLowerCase()] ?? "";
    if (value) filled++;
    return value;
  });
  return fields > 0 && filled === 0 ? null : out;
}

const keep = <T,>(x: T | null): x is T => x !== null;

export function substitute(blocks: Block[], vars: Vars): Block[] {
  return blocks
    .map((b): Block | null => {
      if (typeof b === "string") return fill(b, vars);
      if ("list" in b) {
        const list = b.list.map((i) => fill(i, vars)).filter(keep);
        return list.length ? { list } : null;
      }
      if ("ordered" in b) {
        const ordered = b.ordered.map((i) => fill(i, vars)).filter(keep);
        return ordered.length ? { ordered } : null;
      }
      if ("facts" in b) {
        const facts = b.facts
          .map(([k, v]) => {
            const value = fill(v, vars);
            return value === null ? null : ([k, value] as [string, string]);
          })
          .filter(keep);
        return facts.length ? { facts } : null;
      }
      if ("heading" in b) return { heading: fill(b.heading, vars) ?? "" };
      if ("strong" in b) {
        const strong = fill(b.strong, vars);
        return strong === null ? null : { strong };
      }
      const signoff = fill(b.signoff, vars);
      return signoff === null ? null : { signoff };
    })
    .filter(keep);
}

export function compile(source: Source, vars: Vars) {
  return {
    subject: (fill(source.subject, vars) ?? "").replace(/\s+/g, " ").trim(),
    blocks: substitute(parse(source.body), vars),
  };
}
