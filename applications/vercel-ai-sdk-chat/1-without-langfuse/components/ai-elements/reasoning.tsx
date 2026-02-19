import * as React from "react";

import { cn } from "@/lib/utils";

export function Reasoning({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-strong)] p-4 text-sm text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function ReasoningTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "mb-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function ReasoningContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}
