import { openai } from "@ai-sdk/openai";
import { propagateAttributes, startActiveObservation } from "@langfuse/tracing";
import { isSpanContextValid } from "@opentelemetry/api";
import { convertToModelMessages, generateId, streamText, type UIMessage } from "ai";
import { after } from "next/server";

import { langfuseSpanProcessor } from "@/instrumentation";

export async function POST(req: Request) {
  const {
    messages,
    chatId,
    model = "gpt-4o-mini",
  }: { messages: UIMessage[]; chatId: string; model?: string } = await req.json();

  const inputText = messages
    .at(-1)
    ?.parts.find((part) => part.type === "text")?.text;

  // One trace per assistant response. The observation is ended manually once
  // the stream has finished, so it covers the whole response.
  return startActiveObservation(
    "handle-chat-message",
    async (span) => {
      span.update({ input: inputText });

      // The trace ID becomes the assistant message ID, so feedback on that
      // message can be attached to this trace. Fall back to a random ID when
      // tracing is not active (e.g. no Langfuse keys in local development);
      // feedback on those messages is skipped by the feedback route.
      const traceId = isSpanContextValid(span.otelSpan.spanContext())
        ? span.traceId
        : undefined;

      return propagateAttributes(
        { traceName: "langfuse-chatbot", sessionId: chatId },
        async () => {
          const result = streamText({
            model: openai(model),
            system:
              "You are a helpful Langfuse assistant. Help the user with their questions about Langfuse.",
            messages: await convertToModelMessages(messages),
            onFinish: ({ text }) => {
              span.update({ output: text });
              span.end();
            },
            onError: ({ error }) => {
              span.update({ level: "ERROR", statusMessage: String(error) });
              span.end();
            },
          });

          // Important in serverless environments: flush after the response is sent
          after(async () => await langfuseSpanProcessor.forceFlush());

          return result.toUIMessageStreamResponse({
            generateMessageId: () => traceId ?? generateId(),
          });
        },
      );
    },
    { endOnExit: false },
  );
}
