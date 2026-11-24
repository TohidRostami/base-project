"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRouteTransition } from "@/components/shared/route-transition-provider";
import {
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { paginationItems } from "@/lib/admin-orders-params";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

const box =
  "flex size-8 shrink-0 items-center justify-center rounded-md border text-sm transition-colors";

/** Numbered pages with gaps (1 … 4 5 6 … 20), so a long list can be jumped through, not just stepped. */
export function OrdersPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const { push } = useRouteTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) params.delete("page");
    else params.set("page", String(newPage));
    const query = params.toString();
    push(query ? `${pathname}?${query}` : pathname);
  }

  // "First"/"last" are hidden on phones: page 1 and the last page are always in the list anyway,
  // and without them even the longest row (‹ 1 … 9 10 11 … 20 ›) fits on one line.
  const step = (
    target: number,
    disabled: boolean,
    label: string,
    icon: React.ReactNode,
    edge = false,
  ) => (
    <button
      type="button"
      onClick={() => goToPage(target)}
      disabled={disabled}
      aria-label={label}
      className={cn(
        box,
        "border-border",
        edge && "max-sm:hidden",
        disabled ? "cursor-not-allowed opacity-30" : "hover:bg-secondary",
      )}
    >
      {icon}
    </button>
  );

  return (
    <nav
      aria-label="صفحه‌بندی سفارش‌ها"
      className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5"
    >
      {/* In this RTL layout "previous" points right and "next" points left. */}
      {step(
        1,
        page <= 1,
        "صفحه‌ی اول",
        <ChevronsRight className="size-4" />,
        true,
      )}
      {step(
        page - 1,
        page <= 1,
        "صفحه‌ی قبل",
        <ChevronRight className="size-4" />,
      )}

      {paginationItems(page, totalPages).map((item, i) =>
        item === null ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="flex size-8 items-center justify-center text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            aria-label={`صفحه‌ی ${toPersianDigits(item)}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              box,
              item === page
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-secondary",
            )}
          >
            {toPersianDigits(item)}
          </button>
        ),
      )}

      {step(
        page + 1,
        page >= totalPages,
        "صفحه‌ی بعد",
        <ChevronLeft className="size-4" />,
      )}
      {step(
        totalPages,
        page >= totalPages,
        "صفحه‌ی آخر",
        <ChevronsLeft className="size-4" />,
        true,
      )}
    </nav>
  );
}
