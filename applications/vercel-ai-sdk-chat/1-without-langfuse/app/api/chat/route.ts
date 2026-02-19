import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";
import { createMCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";

import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const maxDuration = 60;

type ReasoningEffort = "low" | "medium" | "high";

function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const payload = (await req.json()) as {
    messages?: UIMessage[];
    reasoningEffort?: ReasoningEffort;
  };

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const reasoningEffort = normalizeReasoningEffort(payload.reasoningEffort);

  const mcpClient = await createMCPClient({
    transport: {
      type: "http",
      url: "https://langfuse.com/api/mcp",
    },
  });

  try {
    const tools = await mcpClient.tools();

    const result = streamText({
      model: openai("o4-mini"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      providerOptions: {
        openai: {
          reasoningEffort,
        },
      },
      tools: {
        ...tools,
      },
      stopWhen: stepCountIs(5),
      onFinish: async () => {
        await mcpClient.close();
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });
  } catch (error) {
    await mcpClient.close();
    throw error;
  }
}
