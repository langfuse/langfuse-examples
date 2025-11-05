import { openai } from '@ai-sdk/openai';
import {
  observe,
  updateActiveObservation,
  updateActiveTrace,
  getActiveTraceId,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { after } from "next/server";

import { langfuseSpanProcessor } from "@/instrumentation";

const handler = async (req: Request) => {
  const {
    messages,
    chatId,
    model = 'gpt-4o-mini'
  }: { messages: UIMessage[]; chatId: string; model?: string } =
    await req.json();

  // Set session id on active trace
  const inputText = messages[messages.length - 1].parts.find(
    (part) => part.type === "text"
  )?.text;

  updateActiveObservation({
    input: inputText,
  });

  updateActiveTrace({
    name: "langfuse-chatbot",
    sessionId: chatId,
    input: inputText,
  });

  const result = streamText({
    model: openai(model),
    messages: convertToModelMessages(messages),
    system: `Your are helpful Langfuse assistant. Help the user with their questions about Langfuse.`,
    experimental_telemetry: {
      isEnabled: true,
    },
    onFinish: async (result) => {
      updateActiveObservation({
        output: result.content,
      });
      updateActiveTrace({
        output: result.content,
      });

      // End span manually after stream has finished
      trace.getActiveSpan()?.end();
    },
    onError: async (error) => {
      updateActiveObservation({
        output: error,
        level: "ERROR"
      });
      updateActiveTrace({
        output: error,
      });

      // End span manually after stream has finished
      trace.getActiveSpan()?.end();
    },
  });

  // Important in serverless environments: schedule flush after request is finished
  after(async () => await langfuseSpanProcessor.forceFlush());

  return result.toUIMessageStreamResponse({
    generateMessageId: () => getActiveTraceId() || "",
    sendSources: true,
    sendReasoning: true,
  });
};

export const POST = observe(handler, {
  name: "handle-chat-message",
  endOnExit: false, // end observation _after_ stream has finished
});