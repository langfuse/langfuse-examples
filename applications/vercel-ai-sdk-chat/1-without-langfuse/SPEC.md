# Langfuse Docs AI Assistant — Application Spec

## Overview

A Next.js App Router application that serves as an AI-powered assistant for answering questions about Langfuse. It connects to the **public Langfuse Docs MCP server** (no authentication required) to search and retrieve documentation, and uses an **OpenAI reasoning model** via the **Vercel AI SDK** on the backend. The frontend uses **AI Elements** (the AI SDK's component library) to render a polished chat interface with reasoning/thinking visibility, streaming responses, tool call display, sources, and markdown rendering.

The app runs locally via `npm run dev` and can optionally be deployed to Vercel.

---

## Tech Stack

| Layer          | Technology                      | Version            |
| -------------- | ------------------------------- | ------------------ |
| Framework      | Next.js (App Router)            | 15 (latest stable) |
| AI Backend     | Vercel AI SDK                   | v6 (`ai` package)  |
| AI Provider    | `@ai-sdk/openai`                | latest             |
| MCP Client     | `@ai-sdk/mcp` (stable in v6)    | latest             |
| Frontend Hooks | `@ai-sdk/react` (`useChat`)     | latest             |
| UI Components  | AI Elements (`ai-elements` CLI) | latest             |
| Base UI        | shadcn/ui + Tailwind CSS v4     | latest             |
| Language       | TypeScript                      | 5.x                |
| Runtime        | Node.js                         | 18+                |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                                                     │
│  useChat() ─── AI Elements Components               │
│  (Conversation, Message, Reasoning,                 │
│   Sources, PromptInput, Loader)                     │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │ POST /api/chat
                   ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Route                       │
│              app/api/chat/route.ts                   │
│                                                     │
│  1. Receive UIMessage[] from client                 │
│  2. Create MCP client → Langfuse Docs MCP           │
│  3. Retrieve MCP tools (searchLangfuseDocs,         │
│     getLangfuseDocsPage, getLangfuseOverview)        │
│  4. streamText() with OpenAI reasoning model        │
│     + MCP tools + system prompt                     │
│  5. Return toUIMessageStreamResponse()              │
│     with sendReasoning: true                        │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │ streamableHttp
                   ▼
┌─────────────────────────────────────────────────────┐
│        Langfuse Docs MCP Server (Public)            │
│        https://langfuse.com/api/mcp                 │
│                                                     │
│  Tools:                                             │
│  • searchLangfuseDocs — RAG semantic search         │
│  • getLangfuseDocsPage — fetch specific page as MD  │
│  • getLangfuseOverview — fetch llms.txt index       │
│                                                     │
│  Transport: streamableHttp                          │
│  Auth: None                                         │
└─────────────────────────────────────────────────────┘
```

---

## Features

### 1. Reasoning/Thinking Display

**What:** The OpenAI reasoning model (e.g. `o4-mini`) generates internal reasoning tokens before producing a response. The AI SDK streams these as `reasoning` message parts.

**Backend:** `streamText()` is called with `sendReasoning: true` in `toUIMessageStreamResponse()`. The `reasoningEffort` provider option can be set (e.g. `"medium"` or `"high"`).

**Frontend:** The `<Reasoning>` component from AI Elements renders a collapsible "Thinking..." section that auto-opens while streaming and auto-closes when done. It shows duration and the reasoning text.

**Why it matters:** Provides transparency into the model's thought process — particularly useful for a docs assistant where users want to understand how the model arrived at an answer.

### 2. Streaming Chat with Message Parts

**What:** Responses stream token-by-token using the AI SDK's UI message stream protocol (SSE-based). Messages are rendered using `message.parts` which preserves the exact sequence of reasoning, text, tool calls, and sources.

**Backend:** `streamText()` → `toUIMessageStreamResponse()`.

**Frontend:** `useChat()` hook from `@ai-sdk/react`. The `status` field (`"submitted"` | `"streaming"` | `"ready"` | `"error"`) drives UI states like loading indicators, stop buttons, and input disabling.

### 3. MCP Tool Integration (Langfuse Docs)

**What:** The backend connects to the public Langfuse Docs MCP server at `https://langfuse.com/api/mcp` using the AI SDK's `createMCPClient` with HTTP transport. The three tools become available to the model:

- **`searchLangfuseDocs`** — semantic search (RAG) over all Langfuse documentation. Best for broad questions.
- **`getLangfuseDocsPage`** — fetch raw markdown for a specific docs page by path or URL. Best for specific pages/code samples.
- **`getLangfuseOverview`** — fetch the `llms.txt` index of all docs pages. Useful for discovering relevant pages.

**Backend pattern:**

```typescript
const mcpClient = await createMCPClient({
  transport: { type: "http", url: "https://langfuse.com/api/mcp" },
});

const result = streamText({
  model: openai("o4-mini"),
  messages: await convertToModelMessages(messages),
  system: SYSTEM_PROMPT,
  tools: { ...(await mcpClient.tools()) },
  maxSteps: 5, // allow multi-step tool usage
});
```

The client must be closed after the response finishes to release resources.

### 4. Tool Call Display

**What:** When the model calls an MCP tool, the frontend shows what's happening — which tool is being called, its inputs, and the result.

**Frontend:** AI Elements `<Tool>` component renders tool invocations with their state (`input-available` → `output-available`). Tool parts appear inline in the message flow at their natural position.

### 5. Sources Display

**What:** When the model retrieves information from Langfuse docs pages, the response can include source URLs. These are rendered as clickable links so users can verify answers.

**Frontend:** The `<Sources>` component from AI Elements renders a collapsible list of source URLs with titles. These appear above or alongside the answer text.

### 6. Markdown Rendering (Streaming)

**What:** The `<MessageResponse>` component from AI Elements handles streaming markdown rendering — it efficiently parses incremental markdown updates without re-parsing the entire content on each stream chunk. Supports GFM (tables, task lists, strikethrough), math, code blocks with syntax highlighting, and copy-to-clipboard.

### 7. Chat Status & UX Polish

**What:** Several UX features come from `useChat` and AI Elements:

- **Loading / Submitted state:** Show a spinner or `<Loader>` component while waiting for the first token.
- **Stop button:** `useChat` returns a `stop()` function to abort the current stream. The `<PromptInputSubmit>` component automatically toggles between send/stop based on `status`.
- **Regenerate:** `useChat` returns a `regenerate()` function. A `<MessageAction>` button can trigger it.
- **Copy message:** `<MessageAction>` with copy functionality.
- **Empty state:** `<ConversationEmptyState>` shows a welcome message with suggested starter questions.
- **Auto-scroll:** `<Conversation>` + `<ConversationScrollButton>` handles auto-scroll with a "scroll to bottom" button.
- **Error handling:** `status === "error"` renders an error state with retry option.

### 8. User-Configurable Reasoning Effort

**What:** A dropdown/select control in the UI that lets users choose how much "thinking" the model does before answering. This maps directly to OpenAI's `reasoningEffort` parameter.

**Options displayed to user:**

| Label    | Value      | Behavior                                             |
| -------- | ---------- | ---------------------------------------------------- |
| Quick    | `"low"`    | Minimal reasoning, fastest responses (~3–8s)         |
| Balanced | `"medium"` | Default. Good quality with moderate latency (~5–15s) |
| Thorough | `"high"`   | Deep reasoning, best for complex questions (~10–30s) |

**Frontend:** A `<select>` or AI Elements `<PromptInputSelect>` placed in the prompt input footer area. The selected value is stored in React state and sent as part of the request body.

```typescript
const [reasoningEffort, setReasoningEffort] = useState<
  "low" | "medium" | "high"
>("medium");

const { messages, sendMessage, status } = useChat({
  body: { reasoningEffort },
});
```

**Backend:** The route handler reads `reasoningEffort` from the request body and passes it to the model:

```typescript
const { messages, reasoningEffort = "medium" } = await req.json();

const result = streamText({
  model: openai("o4-mini", { reasoningEffort }),
  // ...
});
```

**UX notes:**

- The selector is disabled while streaming.
- A subtle label like "Thinking depth" or "Reasoning" next to the dropdown clarifies purpose.
- When set to `"low"`, fewer/shorter reasoning parts appear in the `<Reasoning>` block. When set to `"high"`, the thinking section is visibly longer — which itself becomes a nice demo of the feature.

### 9. System Prompt

The system prompt shapes the assistant's behavior:

```
You are a helpful AI assistant that specializes in answering questions about
Langfuse, the open-source LLM engineering platform.

Use the available tools to search Langfuse documentation and retrieve specific
pages when you need information to answer questions. Always cite your sources
when referencing documentation.

When answering:
- Be accurate and specific, referencing actual Langfuse features and APIs
- Include code examples when relevant
- If you're unsure, search the docs rather than guessing
- Link to relevant documentation pages when helpful
- Be concise but thorough
```

### 10. Conversation Download

**What:** AI Elements includes a `<ConversationDownload>` component that exports the chat as markdown. Useful for saving Q&A sessions.

---

## File Structure

```
langfuse-assistant/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # AI SDK streamText + MCP client
│   ├── layout.tsx                # Root layout with metadata
│   ├── page.tsx                  # Main chat page (client component)
│   └── globals.css               # Tailwind + streamdown styles
├── components/
│   ├── ai-elements/              # Installed via `npx ai-elements@latest`
│   │   ├── conversation.tsx
│   │   ├── message.tsx
│   │   ├── prompt-input.tsx
│   │   ├── reasoning.tsx
│   │   ├── sources.tsx
│   │   ├── loader.tsx
│   │   └── tool.tsx
│   └── ui/                       # shadcn/ui base components
│       ├── button.tsx
│       ├── spinner.tsx
│       └── ...
├── lib/
│   └── system-prompt.ts          # System prompt constant
├── .env.local                    # OPENAI_API_KEY
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## API Route Detail — `app/api/chat/route.ts`

```typescript
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { createMCPClient } from "@ai-sdk/mcp";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    messages,
    reasoningEffort = "medium",
  }: {
    messages: UIMessage[];
    reasoningEffort?: "low" | "medium" | "high";
  } = await req.json();

  const mcpClient = await createMCPClient({
    transport: {
      type: "http",
      url: "https://langfuse.com/api/mcp",
    },
  });

  try {
    const result = streamText({
      model: openai("o4-mini", { reasoningEffort }),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: {
        ...(await mcpClient.tools()),
      },
      maxSteps: 5,
      onFinish: async () => {
        await mcpClient.close();
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    });
  } catch (error) {
    await mcpClient.close();
    throw error;
  }
}
```

**Key decisions:**

- `maxSteps: 5` allows the model to call tools multiple times before finishing (e.g., search first, then fetch a specific page).
- `maxDuration: 60` gives reasoning models enough time (they can take 10–30s for complex queries).
- `reasoningEffort` is read from the request body (default `'medium'`), making it user-configurable from the frontend dropdown.
- MCP client is created per-request and closed after the stream finishes.

---

## Frontend Detail — `app/page.tsx`

The main page is a client component that uses `useChat` and renders AI Elements:

```typescript
"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useState } from "react";
// AI Elements imports
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from "@/components/ai-elements/sources";
import { Loader } from "@/components/ai-elements/loader";
```

**Message rendering** iterates over `message.parts` and switches on `part.type`:

- `"reasoning"` → `<Reasoning>` (collapsible thinking block)
- `"text"` → `<MessageResponse>` (streaming markdown)
- `"tool-*"` → tool call display
- `"source"` → accumulated into `<Sources>`

**Reasoning consolidation:** Some models return multiple reasoning parts. These are concatenated into a single `<Reasoning>` block to avoid multiple "Thinking..." indicators.

---

## Starter Questions (Empty State)

Displayed via `<ConversationEmptyState>` with clickable suggestion chips below the welcome message. Clicking a suggestion sends it as a user message immediately.

**Welcome copy:**

> 👋 Ask me anything about Langfuse
>
> I can search the docs, pull up code examples, and explain features of the Langfuse LLM engineering platform.

**Starter suggestions (pick 4–6 to display, rotate or randomize):**

| Category        | Question                                                           |
| --------------- | ------------------------------------------------------------------ |
| Getting started | "How do I set up Langfuse tracing in a TypeScript project?"        |
| Core concept    | "What's the difference between traces, spans, and generations?"    |
| Integration     | "Show me how to integrate Langfuse with the Vercel AI SDK"         |
| Integration     | "How do I trace LangChain or LangGraph agents with Langfuse?"      |
| Feature         | "How does Langfuse prompt management work?"                        |
| Feature         | "How do I set up LLM-as-a-judge evaluation in Langfuse?"           |
| Feature         | "What is the Langfuse Decorator in Python and how do I use it?"    |
| Pricing / Setup | "Can I self-host Langfuse? What are the deployment options?"       |
| Advanced        | "How do I use datasets and experiments for offline evaluation?"    |
| MCP             | "Does Langfuse have an MCP server? How do I connect it to my IDE?" |

**Implementation:** Use AI Elements' `<Suggestion>` component or custom styled buttons in the empty state area:

```tsx
const suggestions = [
  "How do I set up Langfuse tracing in a TypeScript project?",
  "What's the difference between traces, spans, and generations?",
  "Show me how to integrate Langfuse with the Vercel AI SDK",
  "How does Langfuse prompt management work?",
];

// In empty state:
<ConversationEmptyState
  icon={<BotIcon className="size-12" />}
  title="Ask me anything about Langfuse"
  description="I can search the docs, pull up code examples, and explain features."
/>
<div className="flex flex-wrap gap-2 justify-center mt-4">
  {suggestions.map((q) => (
    <button
      key={q}
      onClick={() => sendMessage({ text: q })}
      className="rounded-full border px-4 py-2 text-sm hover:bg-muted transition"
    >
      {q}
    </button>
  ))}
</div>
```

---

## Environment Variables

| Variable         | Required | Description                               |
| ---------------- | -------- | ----------------------------------------- |
| `OPENAI_API_KEY` | Yes      | OpenAI API key for reasoning model access |

No Langfuse keys needed — the Docs MCP server is public.

---

## Setup & Running

```bash
# Clone / scaffold
npx create-next-app@latest langfuse-assistant --typescript --tailwind --app --src-dir=false

# Install dependencies
npm install ai @ai-sdk/react @ai-sdk/openai @ai-sdk/mcp

# Install AI Elements (adds components to your project)
npx ai-elements@latest add conversation message prompt-input reasoning sources loader tool

# Set up environment
echo "OPENAI_API_KEY=sk-..." > .env.local

# Run
npm run dev
```

---

## OpenAI Model Options

The spec uses `o4-mini` as the default reasoning model. Alternatives:

| Model     | Reasoning             | Tool Calling | Cost | Latency |
| --------- | --------------------- | ------------ | ---- | ------- |
| `o4-mini` | Yes (medium-quality)  | Yes          | Low  | 5–15s   |
| `o3`      | Yes (high-quality)    | Yes          | High | 10–30s  |
| `o3-mini` | Yes (fast)            | Yes          | Low  | 3–10s   |
| `gpt-5`   | Yes (highest-quality) | Yes          | High | 10–30s  |

The `reasoningEffort` setting (`'minimal'` | `'low'` | `'medium'` | `'high'`) controls how much thinking the model does. Higher effort = better answers but more latency.

For a faster alternative without reasoning display, `gpt-4o` or `gpt-4o-mini` can be used (remove `sendReasoning` and reasoning UI).

---

## Future Enhancements (Out of Scope for v1)

- **Model selector:** Use AI Elements' `<ModelSelector>` to let users pick between models (e.g. o4-mini, o3, gpt-4o).
- **Chat persistence:** Save conversations to localStorage or a database.
- **File attachments:** Allow users to upload docs for contextual questions.
- **Authenticated Langfuse MCP:** Connect to the project-scoped MCP server at `/api/public/mcp` for prompt management features (requires Langfuse API keys).
- **Human-in-the-loop tool approval:** Use AI SDK v6's `needsApproval` to let users confirm before tool calls execute.

---

## Key AI SDK Features Used

| Feature                   | SDK API                       | Purpose                                         |
| ------------------------- | ----------------------------- | ----------------------------------------------- |
| Streaming text generation | `streamText()`                | Core chat backend                               |
| UI message protocol       | `toUIMessageStreamResponse()` | Stream to frontend                              |
| Chat hook                 | `useChat()`                   | Frontend state management                       |
| Message parts             | `message.parts`               | Render reasoning, text, tools, sources in order |
| Reasoning streaming       | `sendReasoning: true`         | Expose model thinking                           |
| MCP client                | `createMCPClient()`           | Connect to Langfuse docs tools                  |
| MCP tool discovery        | `mcpClient.tools()`           | Auto-discover available tools                   |
| Multi-step tool use       | `maxSteps: 5`                 | Allow sequential tool calls                     |
| Chat status               | `status` field                | Loading/streaming/ready/error states            |
| Stop generation           | `stop()`                      | User can abort streaming                        |
| Regenerate                | `regenerate()`                | Retry last response                             |
| Provider options          | `reasoningEffort`             | Control reasoning depth                         |
| Convert messages          | `convertToModelMessages()`    | UIMessage → model format                        |
