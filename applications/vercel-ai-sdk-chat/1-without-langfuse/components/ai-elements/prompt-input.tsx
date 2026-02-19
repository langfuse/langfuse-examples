import * as React from "react";
import { Square, SendHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PromptInput({
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={cn(
        "mx-auto w-full rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] px-5 py-4 sm:px-6 sm:py-5",
        className,
      )}
      {...props}
    />
  );
}

export const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "max-h-56 min-h-24 w-full resize-y bg-transparent py-1 text-[18px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/85",
        className,
      )}
      {...props}
    />
  );
});

PromptInputTextarea.displayName = "PromptInputTextarea";

export function PromptInputFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-between gap-3",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-full border border-[color:var(--border)] bg-[color:var(--chip)] px-3 text-xs font-medium text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputSubmit({
  status,
  disabled,
  onStop,
}: {
  status: string;
  disabled?: boolean;
  onStop: () => void;
}) {
  const isWorking = status === "submitted" || status === "streaming";

  if (isWorking) {
    return (
      <Button
        type="button"
        variant="danger"
        className="h-11 w-11 rounded-full p-0"
        size="icon"
        onClick={onStop}
      >
        <Square className="size-4" />
        <span className="sr-only">Stop generation</span>
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      className="h-11 w-11 rounded-full p-0"
      disabled={disabled}
      size="icon"
    >
      <SendHorizontal className="size-4" />
      <span className="sr-only">Send message</span>
    </Button>
  );
}
