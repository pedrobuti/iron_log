"use client";

import type { ReactNode } from "react";

/** Cores dos gráficos lidas dos tokens do tema (funcionam em claro e escuro). */
export const CHART_COLORS = {
  accent: "rgb(var(--accent))",
  secondary: "rgb(var(--info))",
  muted: "rgb(var(--muted))",
  grid: "rgb(var(--line) / 0.6)",
  text: "rgb(var(--muted))",
};

export const AXIS_PROPS = {
  stroke: "rgb(var(--line))",
  tick: { fill: CHART_COLORS.text, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: ReactNode;
  rows: { name: string; value: ReactNode; color?: string }[];
}) {
  if (!active) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      {label ? <p className="mb-1 font-medium text-fg">{label}</p> : null}
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2 text-muted">
            {r.color ? <span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden /> : null}
            <span>{r.name}</span>
            <span className="ml-auto font-medium tabular text-fg">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">{message}</div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-4 text-xs text-muted" aria-label="Legenda">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
