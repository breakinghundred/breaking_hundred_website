/**
 * The membership price as the team types it (pounds) and as members read it.
 * Pure, so client components and the email preview can use it too.
 */

export const DEFAULT_PRICE_POUNDS = 299;

/** "299", "£299", "1,299.50" → pounds, or null if it isn't a sensible price. */
export function parsePounds(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= 10000 ? n : null;
}

/** 299 → "£299", 299.5 → "£299.50". */
export function formatPounds(pounds: number) {
  const whole = Number.isInteger(pounds);
  return `£${pounds.toLocaleString("en-GB", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}
