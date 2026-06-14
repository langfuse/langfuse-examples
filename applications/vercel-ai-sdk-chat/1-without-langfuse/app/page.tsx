"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Compass,
  Copy,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Loader } from "@/components/ai-elements/loader";
import { Tool } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReasoningEffort = "low" | "medium" | "high";

type SourceEntry = {
  title?: string;
  url: string;
};

type StarterCard = {
  title: string;
  description: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STARTER_CARDS: StarterCard[] = [
  {
    title: "Tracing setup",
    description: "Set up Langfuse tracing in a TypeScript app with best practices.",
    prompt: "How do I set up Langfuse tracing in a TypeScript project?",
    icon: Sparkles,
  },
  {
    title: "Concepts",
    description: "Understand traces, spans, and generations with concrete examples.",
    prompt: "What's the difference between traces, spans, and generations?",
    icon: Users,
  },
  {
    title: "Vercel AI SDK",
    description: "Integrate Langfuse telemetry into Vercel AI SDK chat applications.",
    prompt: "Show me how to integrate Langfuse with the Vercel AI SDK.",
    icon: Briefcase,
  },
  {
    title: "Agent tracing",
    description: "Trace LangChain and LangGraph agents with clean hierarchy and metadata.",
    prompt: "How do I trace LangChain or LangGraph agents with Langfuse?",
    icon: Target,
  },
  {
    title: "Prompt management",
    description: "Manage prompts with versioning and environment-based rollout strategies.",
    prompt: "How does Langfuse prompt management work?",
    icon: BarChart3,
  },
  {
    title: "Evaluation",
    description: "Implement LLM-as-a-judge evaluation loops with Langfuse scoring.",
    prompt: "How do I set up LLM-as-a-judge evaluation in Langfuse?",
    icon: Compass,
  },
];

function readPartText(part: unknown): string {
  if (!part || typeof part !== "object") {
    return "";
  }

  const candidate = part as { text?: unknown; reasoning?: unknown; content?: unknown };

  if (typeof candidate.text === "string") {
    return candidate.text;
  }

  if (typeof candidate.reasoning === "string") {
    return candidate.reasoning;
  }

  if (typeof candidate.content === "string") {
    return candidate.content;
  }

  return "";
}

function parseSourcePart(part: unknown): SourceEntry | null {
  if (!part || typeof part !== "object") {
    return null;
  }

  const source = part as {
    url?: unknown;
    href?: unknown;
    source?: { url?: unknown; title?: unknown };
    title?: unknown;
  };

  const url =
    typeof source.url === "string"
      ? source.url
      : typeof source.href === "string"
        ? source.href
        : typeof source.source?.url === "string"
          ? source.source.url
          : null;

  if (!url) {
    return null;
  }

  const title =
    typeof source.title === "string"
      ? source.title
      : typeof source.source?.title === "string"
        ? source.source.title
        : undefined;

  return { title, url };
}

function inferUrlsFromValue(value: unknown, maxUrls = 12): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const urlRegex = /https?:\/\/[^\s"'<>`)\]}]+/g;

  const visit = (current: unknown, depth: number) => {
    if (current == null || depth > 6 || urls.length >= maxUrls) {
      return;
    }

    if (typeof current === "string") {
      const matches = current.match(urlRegex) ?? [];
      for (const match of matches) {
        const normalized = match.replace(/[),.;!?]+$/, "");
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          urls.push(normalized);
          if (urls.length >= maxUrls) {
            break;
          }
        }
      }
      return;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item, depth + 1);
        if (urls.length >= maxUrls) {
          break;
        }
      }
      return;
    }

    if (typeof current === "object") {
      for (const item of Object.values(current as Record<string, unknown>)) {
        visit(item, depth + 1);
        if (urls.length >= maxUrls) {
          break;
        }
      }
    }
  };

  visit(value, 0);
  return urls;
}

function markdownFromMessages(messages: unknown[]) {
  const blocks: string[] = [
    "# Langfuse Assistant Conversation",
    "",
    `Exported at: ${new Date().toISOString()}`,
    "",
  ];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      continue;
    }

    const message = msg as {
      role?: string;
      parts?: unknown[];
      content?: string;
    };

    blocks.push(`## ${message.role === "user" ? "User" : "Assistant"}`);

    if (Array.isArray(message.parts) && message.parts.length > 0) {
      const text = message.parts
        .map((part) => readPartText(part))
        .filter(Boolean)
        .join("\n\n");
      blocks.push(text || "(no text)");
    } else {
      blocks.push(message.content ?? "(no text)");
    }

    blocks.push("");
  }

  return blocks.join("\n");
}

export default function Home() {
  const [input, setInput] = useState("");
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>("medium");
  const [reasoningOpen, setReasoningOpen] = useState<Record<string, boolean>>({});
  const [sourcesOpen, setSourcesOpen] = useState<Record<string, boolean>>({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    regenerate,
    setMessages,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        reasoningEffort,
      },
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      setShowScrollButton(distance > 100);
    };

    handleScroll();
    element.addEventListener("scroll", handleScroll);

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    contentRef.current.scrollTo({
      top: contentRef.current.scrollHeight,
      behavior: status === "ready" ? "smooth" : "auto",
    });
  }, [messages, status]);

  const scrollToBottom = useCallback(() => {
    if (!contentRef.current) {
      return;
    }

    contentRef.current.scrollTo({
      top: contentRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const resetToHome = useCallback(() => {
    stop();
    setMessages([]);
    clearError();
    setInput("");
    setReasoningOpen({});
    setSourcesOpen({});
    setShowScrollButton(false);

    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
  }, [clearError, setMessages, stop]);

  const submitText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) {
        return;
      }

      sendMessage(
        {
          text: trimmed,
        },
        {
          body: {
            reasoningEffort,
          },
        },
      );
    },
    [isStreaming, reasoningEffort, sendMessage],
  );

  const submitCurrentInput = useCallback(() => {
    const currentInput = input;
    if (!currentInput.trim() || isStreaming) {
      return;
    }

    setInput("");
    submitText(currentInput);
  }, [input, isStreaming, submitText]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      submitCurrentInput();
    },
    [submitCurrentInput],
  );

  const downloadMarkdown = useMemo(
    () => markdownFromMessages(messages as unknown[]),
    [messages],
  );

  return (
    <main className="flex h-[100dvh] w-full flex-col">
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--background)]">
        <header className="sticky top-0 z-10 border-b border-[color:var(--border)]/70 bg-[color:var(--background)]/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div
            className={cn(
              "mx-auto flex w-full max-w-5xl items-center justify-between gap-4 transition-opacity duration-200",
              messages.length === 0 ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <button
              className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              onClick={resetToHome}
              title="Reset chat and return home"
              type="button"
            >
              Langfuse Docs Assistant
            </button>

            <ConversationDownload
              fileName="langfuse-conversation.md"
              markdown={downloadMarkdown}
            />
          </div>
        </header>

        <Conversation className="min-h-0 flex-1 overflow-hidden">
          <ConversationContent
            className="mx-auto w-full max-w-5xl pb-14 pt-8 sm:pt-12"
            ref={contentRef}
          >
            {messages.length === 0 ? (
              <div className="motion-fade-up px-1">
                <div className="mx-auto max-w-4xl text-center">
                  <h1 className="text-4xl font-medium tracking-tight text-[var(--foreground)] sm:text-6xl">
                    Langfuse Assistant <span className="text-[var(--muted)]">✦</span>
                  </h1>
                  <p className="mx-auto mt-5 max-w-4xl text-lg text-[var(--muted)] sm:text-2xl">
                    Ask product, SDK, tracing, and evaluation questions grounded
                    in live Langfuse docs.
                  </p>
                </div>

                <section className="motion-fade-up-delayed mx-auto mt-14 max-w-5xl">
                  <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                    What do you want to know?
                  </h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {STARTER_CARDS.map((card) => {
                      const Icon = card.icon;

                      return (
                        <button
                          key={card.title}
                          className="group flex min-h-32 cursor-pointer items-start justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-left transition-colors hover:bg-[color:var(--card-strong)]"
                          onClick={() => submitText(card.prompt)}
                          type="button"
                        >
                          <div className="max-w-[84%]">
                            <p className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                              {card.title}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/85">
                              {card.description}
                            </p>
                          </div>

                          <Icon className="mt-0.5 size-6 text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : null}

            {messages.map((message) => {
              const messageRecord = message as unknown as Record<string, unknown>;
              const role = messageRecord.role === "user" ? "user" : "assistant";
              const messageId = String(messageRecord.id ?? Math.random());
              const parts = Array.isArray(messageRecord.parts)
                ? messageRecord.parts
                : [];

              const reasoningText = parts
                .filter((part) => {
                  if (!part || typeof part !== "object") {
                    return false;
                  }

                  const type = (part as { type?: unknown }).type;
                  return type === "reasoning";
                })
                .map((part) => readPartText(part))
                .filter(Boolean)
                .join("\n\n");

              const explicitSources = parts
                .filter((part) => {
                  if (!part || typeof part !== "object") {
                    return false;
                  }

                  const type = (part as { type?: unknown }).type;
                  return type === "source" || type === "source-url";
                })
                .map((part) => parseSourcePart(part))
                .filter((entry): entry is SourceEntry => entry !== null)
                .filter(
                  (entry, index, all) =>
                    all.findIndex((candidate) => candidate.url === entry.url) ===
                    index,
                );

              const inferredSources: SourceEntry[] = inferUrlsFromValue(
                parts,
                8,
              ).map((url) => ({
                url,
              }));

              const sources = [...explicitSources, ...inferredSources].filter(
                (entry, index, all) =>
                  all.findIndex((candidate) => candidate.url === entry.url) ===
                  index,
              );

              const renderParts =
                parts.length > 0
                  ? parts.filter((part) => {
                      if (!part || typeof part !== "object") {
                        return false;
                      }

                      const type = (part as { type?: unknown }).type;
                      return (
                        type !== "reasoning" &&
                        type !== "source" &&
                        type !== "source-url"
                      );
                    })
                  : [{ type: "text", text: String(messageRecord.content ?? "") }];

              return (
                <Message from={role} key={messageId}>
                  <MessageContent from={role}>
                    {reasoningText ? (
                      <Reasoning>
                        <ReasoningTrigger
                          onClick={() =>
                            setReasoningOpen((prev) => ({
                              ...prev,
                              [messageId]: !prev[messageId],
                            }))
                          }
                        >
                          Thinking{" "}
                          {isStreaming && role === "assistant"
                            ? "(streaming)"
                            : "(tap to expand)"}
                        </ReasoningTrigger>

                        {reasoningOpen[messageId] ?? isStreaming ? (
                          <ReasoningContent>{reasoningText}</ReasoningContent>
                        ) : null}
                      </Reasoning>
                    ) : null}

                    {sources.length > 0 ? (
                      <Sources>
                        <SourcesTrigger
                          onClick={() =>
                            setSourcesOpen((prev) => ({
                              ...prev,
                              [messageId]: !prev[messageId],
                            }))
                          }
                        >
                          Sources ({sources.length}){" "}
                          {sourcesOpen[messageId] ? "▲" : "▼"}
                        </SourcesTrigger>

                        {sourcesOpen[messageId] ?? false ? (
                          <SourcesContent>
                            {sources.map((source) => (
                              <Source
                                href={source.url}
                                key={source.url}
                                title={source.title}
                              />
                            ))}
                          </SourcesContent>
                        ) : null}
                      </Sources>
                    ) : null}

                    {renderParts.map((part, index) => {
                      if (!part || typeof part !== "object") {
                        return null;
                      }

                      const typedPart = part as {
                        type?: unknown;
                        toolName?: unknown;
                        name?: unknown;
                        input?: unknown;
                        output?: unknown;
                        args?: unknown;
                        result?: unknown;
                      };

                      const partType =
                        typeof typedPart.type === "string" ? typedPart.type : "";
                      const hasToolName = typeof typedPart.toolName === "string";
                      const hasToolAlias = typeof typedPart.name === "string";
                      const isToolPart =
                        hasToolName ||
                        hasToolAlias ||
                        partType === "tool" ||
                        partType === "dynamic-tool" ||
                        partType.startsWith("tool-");

                      if (partType === "text") {
                        const text = readPartText(part);
                        if (!text.trim()) {
                          return null;
                        }

                        return (
                          <MessageResponse key={`${messageId}-text-${index}`}>
                            {text}
                          </MessageResponse>
                        );
                      }

                      if (isToolPart) {
                        const toolName =
                          hasToolName
                            ? (typedPart.toolName as string)
                            : hasToolAlias
                              ? (typedPart.name as string)
                            : partType === "dynamic-tool"
                              ? "tool-call"
                              : partType.replace("tool-", "") || "tool";

                        const input = typedPart.input ?? typedPart.args;
                        const output = typedPart.output ?? typedPart.result;

                        return (
                          <Tool
                            input={input}
                            key={`${messageId}-tool-${index}`}
                            name={toolName}
                            output={output}
                          />
                        );
                      }

                      if (partType === "step-start") {
                        return null;
                      }

                      return (
                        <Tool
                          input={part}
                          key={`${messageId}-unknown-${index}`}
                          name={partType || "part"}
                        />
                      );
                    })}

                    {role === "assistant" ? (
                      <MessageActions>
                        <MessageAction
                          onClick={() => {
                            const text = renderParts
                              .map((part) => readPartText(part))
                              .filter(Boolean)
                              .join("\n\n");
                            navigator.clipboard.writeText(text);
                          }}
                        >
                          <Copy className="size-3.5" />
                          Copy
                        </MessageAction>

                        <MessageAction onClick={() => regenerate()}>
                          <RefreshCw className="size-3.5" />
                          Regenerate
                        </MessageAction>
                      </MessageActions>
                    ) : null}
                  </MessageContent>
                </Message>
              );
            })}

            {status === "submitted" ? (
              <div className="mx-auto flex w-full max-w-3xl items-center gap-2 text-xl font-semibold text-[var(--muted)]">
                <Loader />
                <span>Thinking...</span>
              </div>
            ) : null}

            {error ? (
              <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-base text-[var(--foreground)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    Something went wrong while generating.
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {String(error.message ?? error)}
                  </p>
                  <Button
                    className="mt-3 rounded-full"
                    onClick={() => regenerate()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}
          </ConversationContent>

          <ConversationScrollButton
            onClick={scrollToBottom}
            visible={showScrollButton}
          />
        </Conversation>

        <div className="sticky bottom-0 z-10 border-t border-[color:var(--border)]/80 bg-[color:var(--background)] px-4 py-4 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <PromptInput onSubmit={onSubmit}>
              <PromptInputTextarea
                disabled={isStreaming}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything about Langfuse..."
                value={input}
                onKeyDown={(event) => {
                  if (!event.metaKey || event.key !== "Enter" || isStreaming) {
                    return;
                  }

                  event.preventDefault();
                  submitCurrentInput();
                }}
              />

              <PromptInputFooter>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--chip)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    <Lock className="size-3.5" />
                    Knowledge Base
                  </span>
                  <PromptInputSelect
                    className="h-8 rounded-full bg-[color:var(--chip)] px-3 text-xs"
                    disabled={isStreaming}
                    onChange={(event) =>
                      setReasoningEffort(event.target.value as ReasoningEffort)
                    }
                    value={reasoningEffort}
                  >
                    <option value="low">Quick</option>
                    <option value="medium">Balanced</option>
                    <option value="high">Deep</option>
                  </PromptInputSelect>
                </div>

                <PromptInputSubmit
                  disabled={!input.trim()}
                  onStop={stop}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="mt-2 text-center text-[11px] text-[var(--muted)]/80 sm:text-xs">
              Langfuse Assistant can be wrong. Validate important details.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
