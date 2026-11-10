/** The November batch renews on 18 December 2027. */
export const FIRST_RENEWAL = new Date("2027-12-18T12:00:00Z");

export const DAY = 24 * 60 * 60 * 1000;

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Renewal date: the later of 18 December 2027 and 12 months after payment. */
export function renewalDateFor(paidAt: Date) {
  const twelve = addMonths(paidAt, 12);
  return twelve > FIRST_RENEWAL ? twelve : FIRST_RENEWAL;
}

export function daysAgo(n: number, from = new Date()) {
  return new Date(from.getTime() - n * DAY);
}

export function hoursAgo(n: number, from = new Date()) {
  return new Date(from.getTime() - n * 60 * 60 * 1000);
}

const LONDON = "Europe/London";

export function formatDate(date: Date | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: LONDON }).format(date);
}

export function formatTime(date: Date | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: LONDON }).format(date);
}

export function formatMoney(minor: number | null | undefined, currency = "gbp") {
  if (minor == null) return "";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(minor / 100);
}
