# Langfuse Docs AI Assistant

A Next.js App Router chat app that answers Langfuse questions using:

- OpenAI reasoning models via Vercel AI SDK
- Langfuse public Docs MCP server (`https://langfuse.com/api/mcp`)
- Streaming UI with reasoning, tool calls, markdown, and sources

> **Training Example App**
> This project is designed for trainings and workshops to showcase how to add Langfuse tracing, prompt management, and evaluation into a real application workflow.

## Features

- Streaming chat with `useChat` and `streamText`
- MCP docs tool usage (`searchLangfuseDocs`, `getLangfuseDocsPage`, `getLangfuseOverview`)
- Reasoning visibility (`sendReasoning: true`)
- Source links in responses (`sendSources: true` + URL inference fallback)
- Tool call cards with payloads hidden by default and toggle-to-expand details
- Reasoning depth control (`low`, `medium`, `high`)
- Regenerate, stop generation, copy response, conversation export
- Starter prompts and empty-state onboarding

## Tech Stack

- Next.js 15
- TypeScript 5
- Tailwind CSS v4
- `ai` SDK v6 + `@ai-sdk/react`
- `@ai-sdk/openai`
- `@ai-sdk/mcp`

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure your OpenAI key in this project root:

```bash
# .env or .env.local
OPENAI_API_KEY=your_key_here
```

3. Start dev server:

```bash
npm run dev
```

4. Open:

```text
http://127.0.0.1:3000
```

## Build and Typecheck

```bash
npm run typecheck
npm run build
```

## Key Files

- `app/api/chat/route.ts`: OpenAI + MCP backend streaming route
- `app/page.tsx`: Chat UI and rendering of parts (reasoning/text/tools/sources)
- `lib/system-prompt.ts`: Assistant behavior prompt
- `components/ai-elements/*`: UI primitives used by the chat screen
