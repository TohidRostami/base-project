import { isIsoDay } from "@/lib/iran-time";

/**
 * What the admin orders page reads from its URL, cleaned up. Shared by the
 * server (which queries with it) and the filter bar (which shows it), so the
 * two always agree on what a URL means — including a hand-edited or stale one.
 */

export const ORDERS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_ORDERS_PER_PAGE = 10;

export const ORDER_TYPE_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "in_person", label: "حضوری" },
  { value: "online", label: "آنلاین" },
] as const;

export type OrderTypeFilter = (typeof ORDER_TYPE_OPTIONS)[number]["value"];

export type RawOrdersParams = {
  search?: string;
  /** Start / end day, Gregorian "YYYY-MM-DD" (what the Jalali picker produces), inclusive. */
  from?: string;
  to?: string;
  /** The old single-day filter; still honoured so existing links keep working. */
  date?: string;
  type?: string;
  page?: string;
  perPage?: string;
};

export type OrdersParams = {
  search: string;
  from: string | null;
  to: string | null;
  type: OrderTypeFilter;
  page: number;
  perPage: number;
};

function positiveInt(value: string | undefined): number | null {
  if (!value || !/^\d{1,9}$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export function parseOrdersParams(raw: RawOrdersParams): OrdersParams {
  let from = raw.from && isIsoDay(raw.from) ? raw.from : null;
  let to = raw.to && isIsoDay(raw.to) ? raw.to : null;
  if (!from && !to && raw.date && isIsoDay(raw.date)) {
    from = raw.date;
    to = raw.date;
  }
  // A range typed backwards means the same span, not "nothing".
  if (from && to && from > to) [from, to] = [to, from];

  const perPage = positiveInt(raw.perPage);

  return {
    search: (raw.search ?? "").trim().slice(0, 100),
    from,
    to,
    type: ORDER_TYPE_OPTIONS.some((o) => o.value === raw.type) ? (raw.type as OrderTypeFilter) : "all",
    page: positiveInt(raw.page) ?? 1,
    // Only the sizes offered in the dropdown: `?perPage=1000000` must not load the whole table.
    perPage: ORDERS_PER_PAGE_OPTIONS.some((n) => n === perPage) ? perPage! : DEFAULT_ORDERS_PER_PAGE,
  };
}

/** True when anything narrows the list (page and page size don't). */
export function hasOrderFilters(p: OrdersParams): boolean {
  return Boolean(p.search || p.from || p.to || p.type !== "all");
}

/** Page numbers to show, with `null` marking a gap: 1 … 4 5 6 … 20. */
export function paginationItems(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((n) => wanted.add(n));

  const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items: (number | null)[] = [];
  pages.forEach((n, i) => {
    const gap = i > 0 ? n - pages[i - 1] - 1 : 0;
    // "…" for a single missing page would be longer than just showing it.
    if (gap === 1) items.push(n - 1);
    else if (gap > 1) items.push(null);
    items.push(n);
  });
  return items;
}
