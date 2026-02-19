import * as React from "react";

import { cn } from "@/lib/utils";

export function Sources({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-strong)] p-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function SourcesTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]",
        className,
      )}
      type="button"
      {...props}
    />
  );
}

export function SourcesContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("mt-2 grid gap-2", className)} {...props} />;
}

export function Source({
  href,
  title,
}: {
  href: string;
  title?: string;
}) {
  return (
    <li>
      <a
        className="line-clamp-2 rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] underline decoration-[color:var(--border)] underline-offset-2"
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {title ?? href}
      </a>
    </li>
  );
}
