const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
/** Group names, smallest first: units, thousands, millions, … */
const SCALES = ["", "هزار", "میلیون", "میلیارد", "هزار میلیارد", "میلیون میلیارد"];

/** 0–999 as words, e.g. 215 → "دویست و پانزده". */
function threeDigits(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10]);
  } else {
    if (rest >= 20) parts.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10) parts.push(ONES[rest % 10]);
  }
  return parts.join(" و ");
}

/**
 * A whole number written out in Persian words — the "مبلغ به حروف" line of an
 * invoice. 1250000 → "یک میلیون و دویست و پنجاه هزار".
 *
 * Fractions are rounded (prices are whole tomans), and a number too large to be
 * represented exactly (or not finite) returns null so the caller can leave
 * the line out instead of printing a wrong amount.
 */
export function numberToPersianWords(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const n = Math.round(value);
  if (!Number.isSafeInteger(n)) return null;
  if (n === 0) return "صفر";
  if (n < 0) {
    const positive = numberToPersianWords(-n);
    return positive === null ? null : `منفی ${positive}`;
  }

  const groups: number[] = [];
  for (let rest = n; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  if (groups.length > SCALES.length) return null;

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    // "یک هزار" is just "هزار" in everyday Persian; every other scale keeps its "یک".
    const words = i === 1 && groups[i] === 1 ? "" : threeDigits(groups[i]);
    parts.push([words, SCALES[i]].filter(Boolean).join(" "));
  }
  return parts.join(" و ");
}
