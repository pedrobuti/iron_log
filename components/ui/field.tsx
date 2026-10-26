"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return <input ref={ref} className={cn("input", invalid && "border-danger/60", className)} aria-invalid={invalid || undefined} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn("input appearance-none pr-8", invalid && "border-danger/60", className)} aria-invalid={invalid || undefined} {...props}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return <textarea ref={ref} className={cn("input min-h-[88px] resize-y py-2.5", invalid && "border-danger/60", className)} aria-invalid={invalid || undefined} {...props} />;
  },
);

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const switchId = id ?? autoId;
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <label htmlFor={switchId} className="block text-sm font-medium">
          {label}
        </label>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-line bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const cid = id ?? autoId;
  return (
    <label htmlFor={cid} className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        id={cid}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line bg-surface-2 accent-[rgb(var(--accent))]"
      />
      {label}
    </label>
  );
}
