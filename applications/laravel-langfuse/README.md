# Laravel Langfuse Integration Examples

Example applications demonstrating [Langfuse](https://langfuse.com/) observability in [Laravel](https://laravel.com/) using the [axyr/laravel-langfuse](https://github.com/axyr/laravel-langfuse) SDK.

Each example repository showcases the same 9 integration patterns with a different PHP AI SDK:

| Example                                                      | AI SDK                                                     | Description                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------- |
| [laravel-langfuse-ai-examples](https://github.com/axyr/laravel-langfuse-ai-examples) | [Laravel AI](https://github.com/laravel/ai)                | Laravel's first-party AI SDK                          |
| [laravel-langfuse-prism-examples](https://github.com/axyr/laravel-langfuse-prism-examples) | [Prism](https://github.com/prism-php/prism)                | Laravel package for integrating Large Language Models |
| [laravel-langfuse-neuron-ai-examples](https://github.com/axyr/laravel-langfuse-neuron-ai-examples) | [Neuron AI](https://github.com/neuron-core/neuron-laravel) | Neuron AI PHP agentic framework for Laravel           |

## What's Covered

Each example application demonstrates:

1. **Basic Agent** - Zero-config auto-tracing of LLM calls
2. **Agent with Tools** - Tool calls appearing as Langfuse spans
3. **Structured Output** - Structured JSON output in generations
4. **Streaming** - Streaming responses with auto-tracing
5. **Prompt Management** - Langfuse prompt management with variable compilation
6. **Scoring** - Numeric and categorical quality scores on traces
7. **RAG Pipeline** - Nested trace hierarchy (embedding, search, rerank, generate)
8. **Multi-Agent** - Multiple agents sharing a single trace
9. **Conversation** - Multi-turn conversation with session grouping

## Prerequisites

- PHP 8.3+
- Composer
- Docker and Docker Compose (for local Langfuse stack)
- An Anthropic, OpenAI, or other supported LLM API key

## Getting Started

Each example repository includes:

- A `docker-compose.yml` for running a full local Langfuse stack (Langfuse, PostgreSQL, ClickHouse, Redis, MinIO)
- A `.env.example` with pre-configured Langfuse credentials for local development
- Artisan commands to run each example (e.g., `php artisan example:basic-agent`)
- A full test suite using Pest

Clone any of the example repositories and follow the instructions in their README to get started.

## Related

- [axyr/laravel-langfuse](https://github.com/axyr/laravel-langfuse) - The Laravel SDK for Langfuse with auto-instrumentation support for Prism, Laravel AI, and Neuron AI
