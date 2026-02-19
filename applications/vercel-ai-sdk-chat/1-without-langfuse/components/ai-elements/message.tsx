import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Message({
  from,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { from: "user" | "assistant" }) {
  return (
    <article
      className={cn(
        "flex w-full",
        from === "user" ? "justify-end" : "justify-start",
        className,
      )}
      {...props}
    />
  );
}

export function MessageContent({
  from,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { from: "user" | "assistant" }) {
  return (
    <div
      className={cn(
        from === "assistant"
          ? "max-w-3xl text-[color:var(--foreground)]"
          : "max-w-2xl rounded-2xl bg-[color:var(--chip)] px-5 py-3 text-[color:var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function MessageResponse({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown-content text-base leading-relaxed", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function MessageActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-5 flex flex-wrap gap-2", className)} {...props} />
  );
}

export function MessageAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("rounded-full border-[color:var(--border)] px-3", className)}
      size="sm"
      variant="outline"
      type="button"
      {...props}
    />
  );
}
