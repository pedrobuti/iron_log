import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "danger" | "warn" | "info" | "success";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  accent: "bg-accent/15 text-accent border-accent/30",
  success: "bg-accent/15 text-accent border-accent/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  info: "bg-info/10 text-info border-info/30",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4", tones[tone], className)}
      {...props}
    />
  );
}
