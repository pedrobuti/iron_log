import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-accent", className)} aria-hidden />;
}

export function LoadingScreen({ message = "Carregando seus dados…" }: { message?: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-muted" role="status" aria-live="polite">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse-soft rounded-xl bg-surface-2", className)} aria-hidden />;
}
