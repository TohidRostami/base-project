"use client";

import { cn } from "@/lib/utils";

/** A small either/or switch — the admin's way of picking between a few mutually exclusive modes. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  /** Read out by screen readers as the name of the group. */
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-11 rounded-md border px-3 text-sm transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-background hover:border-foreground/50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
