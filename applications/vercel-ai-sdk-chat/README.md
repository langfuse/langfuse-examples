# Vercel AI SDK Chat — Langfuse Training Example

This example is designed for **trainings and workshops**. It demonstrates how to add Langfuse tracing, prompt management, and evaluation to a real Next.js chat application.

## Folder Structure

| Folder                   | Description                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`1-without-langfuse`** | Base application — a Next.js chat app using the Vercel AI SDK, **without** any Langfuse integration. Use this as the starting point for hands-on exercises. |
| **`2-with-langfuse`**    | Same application **with** Langfuse features added (tracing, prompts, evaluation). _Work in progress._                                                       |

## Training Flow

1. Start with `1-without-langfuse` to understand the base app.
2. Add Langfuse step by step (or compare with `2-with-langfuse` once complete).
3. Explore traces, prompts, and evaluations in the Langfuse dashboard.

## Base Application

The base app in `1-without-langfuse` is a **Langfuse Docs AI Assistant** that answers Langfuse questions using:

- OpenAI reasoning models via Vercel AI SDK
- Langfuse public Docs MCP server (`https://langfuse.com/api/mcp`)
- Streaming UI with reasoning, tool calls, markdown, and sources

See [`1-without-langfuse/README.md`](./1-without-langfuse/README.md) for setup and run instructions.
