import "server-only";

/**
 * Turns an uploaded CSV or Excel (.xlsx) file into people to add to the list.
 * Works with or without a heading row: headings like "First name", "Last name",
 * "Email" (or one "Name" column) are matched in any order; without headings the
 * cell with an @ is the email and the next two non-empty cells are the names.
 */

export type ImportPerson = { firstName: string; lastName: string; email: string };
export type ImportResult = { people: ImportPerson[]; skipped: number };

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export async function readPeopleFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  const isZip = bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK": .xlsx is a zip file

  if (name.endsWith(".xls") && !isZip) {
    throw new Error("Please save the spreadsheet as .xlsx or CSV first: older .xls files can't be read.");
  }
  if (name.endsWith(".xlsx") || isZip) {
    if (!isZip) throw new Error("Please check the file: it doesn't look like an Excel (.xlsx) file.");
    const { readSheet } = await import("read-excel-file/node");
    const sheet = await readSheet(bytes);
    return peopleFrom(sheet.map((row) => row.map(cellText)));
  }
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type.startsWith("text/")) {
    return peopleFrom(parseCsv(bytes.toString("utf8")));
  }
  throw new Error("Please upload a CSV or Excel (.xlsx) file.");
}

function cellText(cell: unknown): string {
  if (cell == null) return "";
  if (cell instanceof Date) return "";
  return String(cell).trim();
}

/** CSV with quoted fields; the separator (comma, semicolon or tab) is taken from the first line. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t"].reduce((best, s) => (firstLine.split(s).length > firstLine.split(best).length ? s : best), ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && !cell.trim()) {
      quoted = true;
      cell = "";
    } else if (c === sep) {
      row.push(cell.trim()); cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell.trim()); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isHeading = {
  email: (h: string) => /^e-?mail( address)?$/.test(h),
  first: (h: string) => /^(first|given|fore)\s*name$|^first$|^forename$/.test(h),
  last: (h: string) => /^(last|family|sur)\s*name$|^last$|^surname$/.test(h),
  full: (h: string) => /^(full\s*)?name$/.test(h),
};

export function peopleFrom(table: string[][]): ImportResult {
  const rows = table.filter((r) => r.some((c) => c.trim()));
  // A heading row is one with an "Email" cell, near the top.
  const headAt = rows.slice(0, 5).findIndex((r) => r.some((c) => isHeading.email(c.trim().toLowerCase())));
  const people: ImportPerson[] = [];
  let skipped = 0;

  if (headAt >= 0) {
    const heads = rows[headAt].map((c) => c.trim().toLowerCase());
    const col = (test: (h: string) => boolean) => heads.findIndex(test);
    const [e, f, l, n] = [col(isHeading.email), col(isHeading.first), col(isHeading.last), col(isHeading.full)];
    for (const r of rows.slice(headAt + 1)) {
      const email = (r[e] ?? "").trim();
      if (!EMAIL.test(email)) { skipped++; continue; }
      let firstName = f >= 0 ? (r[f] ?? "").trim() : "";
      let lastName = l >= 0 ? (r[l] ?? "").trim() : "";
      if (!firstName && !lastName && n >= 0) {
        const [first, ...rest] = (r[n] ?? "").trim().split(/\s+/);
        firstName = first ?? "";
        lastName = rest.join(" ");
      }
      people.push({ email, firstName, lastName });
    }
  } else {
    for (const r of rows) {
      const cells = r.map((c) => c.trim());
      const email = cells.find((c) => EMAIL.test(c));
      if (!email) { skipped++; continue; }
      const names = cells.filter((c) => c && c !== email);
      people.push({ email, firstName: names[0] ?? "", lastName: names[1] ?? "" });
    }
  }
  return { people, skipped };
}
