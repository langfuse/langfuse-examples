import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

function formatValue(value: unknown) {
  if (value == null) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function summarizeValue(value: unknown): string {
  if (value == null) {
    return "No payload";
  }

  if (typeof value === "string") {
    return value.length > 86 ? `${value.slice(0, 83)}...` : value;
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) {
      return "Empty object";
    }

    if (keys.length <= 4) {
      return `Fields: ${keys.join(", ")}`;
    }

    return `Fields: ${keys.slice(0, 4).join(", ")} +${keys.length - 4} more`;
  }

  return String(value);
}

export function Tool({
  name,
  input,
  output,
  className,
}: {
  name: string;
  input?: unknown;
  output?: unknown;
  className?: string;
}) {
  const hasOutput = output !== undefined;
  const [expanded, setExpanded] = useState(false);
  const inputSummary = useMemo(() => summarizeValue(input), [input]);
  const outputSummary = useMemo(() => summarizeValue(output), [output]);

  return (
    <section
      className={cn(
        "mb-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-strong)] p-4 text-sm text-[var(--foreground)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            <Wrench className="size-3.5" />
            Tool: {name}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">
            Input: {inputSummary}
          </p>
          {hasOutput ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              Output: {outputSummary}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-0.5 uppercase tracking-wide text-[11px] text-[var(--muted)]">
            {hasOutput ? "completed" : "running"}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            {expanded ? "Hide details" : "Show details"}
          </button>
        </div>
      </header>

      {expanded ? (
        <div className="mt-3 grid gap-2">
          <div>
            <p className="mb-1 font-medium">Input</p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-[color:var(--panel)] p-2.5">
              {formatValue(input)}
            </pre>
          </div>

          {hasOutput ? (
            <div>
              <p className="mb-1 font-medium">Output</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-[color:var(--panel)] p-2.5">
                {formatValue(output)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
