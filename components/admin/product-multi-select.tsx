"use client";

import { useMemo, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toPersianDigits } from "@/lib/format";
import { normalizeFa } from "@/lib/search";
import type { DiscountProductOption } from "@/lib/queries/admin-discounts";

/**
 * Pick any number of products from a searchable list. The picked ones show
 * as removable chips underneath, so what a discount covers is always visible.
 */
export function ProductMultiSelect({
  options,
  value,
  onChange,
}: {
  options: DiscountProductOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => new Set(value), [value]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const shown = useMemo(() => {
    const q = normalizeFa(query).toLowerCase();
    return q
      ? options.filter((o) => normalizeFa(`${o.name} ${o.category}`).toLowerCase().includes(q))
      : options;
  }, [options, query]);

  function toggle(id: string) {
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function selectShown() {
    onChange([...new Set([...value, ...shown.map((o) => o.id)])]);
  }

  return (
    <div className="flex flex-col gap-3">
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <span className={value.length === 0 ? "text-muted-foreground" : undefined}>
              {value.length === 0 ? "انتخاب محصول‌ها…" : `${toPersianDigits(value.length)} محصول انتخاب شده`}
            </span>
            <ChevronDown className="size-4 opacity-60" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md"
          >
            <div className="relative pb-2">
              <Search className="pointer-events-none absolute start-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                // Enter must not submit the discount form.
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                placeholder="جستجوی نام یا دسته‌بندی"
                aria-label="جستجوی محصول"
                className="ps-9"
              />
            </div>

            <ul className="max-h-64 overflow-y-auto" aria-label="محصولات">
              {shown.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">محصولی پیدا نشد.</li>
              ) : (
                shown.map((o) => (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggle(o.id)}
                        className="size-4 shrink-0 accent-foreground"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {o.name}
                        {o.archived && <span className="text-muted-foreground"> (بایگانی)</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{o.category}</span>
                    </label>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
              <button
                type="button"
                onClick={selectShown}
                disabled={shown.length === 0}
                className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
              >
                {query.trim() ? "انتخاب همه‌ی نتایج" : "انتخاب همه"}
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={value.length === 0}
                className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
              >
                پاک‌کردن انتخاب‌ها
              </button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="محصولات انتخاب‌شده">
          {value.map((id) => (
            <li
              key={id}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary py-1 ps-3 pe-1 text-xs"
            >
              <span className="max-w-[16rem] truncate">{byId.get(id)?.name ?? "محصول حذف‌شده"}</span>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label={`حذف ${byId.get(id)?.name ?? "محصول"}`}
                className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
