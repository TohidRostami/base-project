import { formatJalali } from "@/lib/date";
import { toPersianDigits } from "@/lib/format";

/**
 * Iran has no daylight saving time since 2022, so Tehran is a fixed UTC+03:30.
 * A discount's "from" and "until" dates are calendar days *in Tehran*: a code
 * that is valid "until 1 Dey" must still work all day on 1 Dey, whatever time
 * zone the server (Vercel runs on UTC) happens to be in.
 */
const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written as "YYYY-MM-DD". */
export function isIsoDay(value: string): boolean {
  const m = ISO_DAY.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === mo - 1 &&
    probe.getUTCDate() === d
  );
}

/** The first instant (00:00:00.000) of a Tehran calendar day. */
export function tehranDayStart(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000+03:30`);
}

/** The last instant (23:59:59.999) of a Tehran calendar day. */
export function tehranDayEnd(isoDay: string): Date {
  return new Date(`${isoDay}T23:59:59.999+03:30`);
}

/** The Tehran calendar day an instant falls on, as "YYYY-MM-DD". */
export function toTehranIsoDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getTime() + TEHRAN_OFFSET_MS).toISOString().slice(0, 10);
}

/** "۲۶ مرداد ۱۴۰۵" for the Tehran calendar day an instant falls on. */
export function formatTehranJalali(date: Date | string): string {
  const [y, m, d] = toTehranIsoDay(date).split("-").map(Number);
  // A local-time Date for that calendar day: formatJalali reads local fields, so the result is independent of the server's zone.
  return formatJalali(new Date(y, m - 1, d));
}

/** "۱۴:۰۵" — the Tehran wall-clock time of an instant, whatever zone the server runs in. */
export function formatTehranClock(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return toPersianDigits(
    new Date(d.getTime() + TEHRAN_OFFSET_MS).toISOString().slice(11, 16),
  );
}

/** "۲۶ مرداد ۱۴۰۵ — ساعت ۱۴:۰۵" in Tehran time. */
export function formatTehranJalaliDateTime(date: Date | string): string {
  return `${formatTehranJalali(date)} — ساعت ${formatTehranClock(date)}`;
}
