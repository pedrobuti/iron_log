"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-xl border border-line bg-surface-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
