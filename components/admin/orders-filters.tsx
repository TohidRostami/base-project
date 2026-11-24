"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useRouteTransition } from "@/components/shared/route-transition-provider";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { SegmentedControl } from "@/components/admin/segmented-control";
import {
  ORDER_TYPE_OPTIONS,
  hasOrderFilters,
  parseOrdersParams,
  type OrderTypeFilter,
} from "@/lib/admin-orders-params";

export function OrdersFilters() {
  const { push } = useRouteTransition();
  const searchParams = useSearchParams();

  // The same reading of the URL the server uses, so the bar always shows what the table is filtered by.
  const current = parseOrdersParams(Object.fromEntries(searchParams));

  const [search, setSearch] = useState(current.search);

  // Keep the box in step with the URL (back/forward, "clear filters").
  const [seenUrlSearch, setSeenUrlSearch] = useState(current.search);
  if (current.search !== seenUrlSearch) {
    setSeenUrlSearch(current.search);
    setSearch(current.search);
  }

  /** Writes the given filters to the URL; `null`/"" removes one. */
  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    // A new filter narrows the result set, so whatever page you were on
    // may no longer exist — always land back on page 1.
    params.delete("page");
    push(`/admin/orders?${params.toString()}`);
  }

  function setRange(from: string, to: string) {
    // Picked backwards (end before start)? Same span — put them the right way round.
    if (from && to && from > to) [from, to] = [to, from];
    // `date` is the old single-day filter, replaced by from/to.
    update({ from, to, date: null });
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    update({ search: search.trim() });
  }

  function clearFilters() {
    setSearch("");
    push("/admin/orders");
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 md:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو با شماره سفارش یا نام مشتری..."
            className="pe-10"
          />
        </div>
        <Button variant="accent" type="submit">
          جستجو
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(0,18rem)_auto] lg:items-end">
        <div className="flex flex-col gap-1.5">
          <Label>از تاریخ</Label>
          <JalaliDatePicker
            value={current.from ?? ""}
            onChange={(value) => setRange(value, current.to ?? "")}
            placeholder="بدون تاریخ شروع"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>تا تاریخ</Label>
          <JalaliDatePicker
            value={current.to ?? ""}
            onChange={(value) => setRange(current.from ?? "", value)}
            placeholder="بدون تاریخ پایان"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <Label>نوع سفارش</Label>
          <SegmentedControl<OrderTypeFilter>
            label="نوع سفارش"
            value={current.type}
            onChange={(type) => update({ type: type === "all" ? null : type })}
            options={ORDER_TYPE_OPTIONS}
          />
        </div>

        {hasOrderFilters(current) && (
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            className="h-11 sm:col-span-2 lg:col-span-1"
          >
            <X className="size-4" />
            پاک کردن فیلترها
          </Button>
        )}
      </div>
    </div>
  );
}
