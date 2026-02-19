import * as React from "react";
import { ArrowDown, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Conversation({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export const ConversationContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 space-y-8 overflow-y-auto px-4 pb-8 pt-6 sm:px-6",
        className,
      )}
      {...props}
    />
  );
});

ConversationContent.displayName = "ConversationContent";

export function ConversationEmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto mt-10 max-w-2xl rounded-sm bg-[color:var(--card-strong)] p-6 text-center",
        className,
      )}
    >
      {icon ? <div className="mx-auto mb-3 inline-flex text-[var(--accent)]">{icon}</div> : null}
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

export function ConversationScrollButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-6 right-4 z-20 sm:right-6">
      <Button
        className="pointer-events-auto rounded-full"
        size="icon"
        variant="secondary"
        onClick={onClick}
      >
        <ArrowDown className="size-4" />
        <span className="sr-only">Scroll to newest</span>
      </Button>
    </div>
  );
}

export function ConversationDownload({
  markdown,
  fileName,
}: {
  markdown: string;
  fileName: string;
}) {
  const download = React.useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [fileName, markdown]);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={download}
      disabled={!markdown.trim()}
      type="button"
      className="rounded-full"
    >
      <Download className="size-3.5" />
      Export
    </Button>
  );
}
