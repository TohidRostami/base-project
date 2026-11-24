"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchDiscountUsers } from "@/app/admin/discounts/actions";
import { phoneToLocal, toPersianDigits } from "@/lib/format";
import type { DiscountTargetUser } from "@/lib/queries/admin-discounts";

function describe(u: DiscountTargetUser) {
  return [u.email, u.phoneNumber ? toPersianDigits(phoneToLocal(u.phoneNumber)) : null].filter(Boolean).join(" · ");
}

/** Finds one customer by name, email or mobile number. */
export function DiscountUserPicker({
  value,
  onChange,
  invalid,
}: {
  value: DiscountTargetUser | null;
  onChange: (user: DiscountTargetUser | null) => void;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  // Results are stored with the query they answer, so a slow reply to an old query is never shown for a newer one.
  const [found, setFound] = useState<{ q: string; users: DiscountTargetUser[] } | null>(null);

  const q = query.trim();
  const searchable = q.length >= 2;

  useEffect(() => {
    if (!searchable) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchDiscountUsers(q)
        .then((users) => alive && setFound({ q, users }))
        .catch(() => alive && setFound({ q, users: [] }));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, searchable]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-background px-3.5 py-2.5 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium">{value.name}</div>
          <div className="truncate text-xs text-muted-foreground" dir="auto">
            {describe(value)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
            setFound(null);
          }}
          aria-label="تغییر کاربر"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const answered = searchable && found?.q === q;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Enter must not submit the discount form.
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="جستجوی نام، ایمیل یا شماره موبایل کاربر"
          aria-label="جستجوی کاربر"
          aria-invalid={invalid || undefined}
          className="ps-9"
        />
        {searchable && !answered && (
          <Loader2 className="absolute end-3 top-3.5 size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {answered && (
        <ul className="overflow-hidden rounded-md border border-border" aria-label="نتایج جستجو">
          {found.users.length === 0 ? (
            <li className="px-3.5 py-4 text-center text-sm text-muted-foreground">کاربری پیدا نشد.</li>
          ) : (
            found.users.map((u) => (
              <li key={u.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => onChange(u)}
                  className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-start text-sm hover:bg-secondary"
                >
                  <span>{u.name}</span>
                  <span className="text-xs text-muted-foreground" dir="auto">
                    {describe(u)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
