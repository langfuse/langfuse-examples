# MCP Tracing with Langfuse

This example demonstrates how to integrate Model Context Protocol (MCP) https://modelcontextprotocol.io/ with
Langfuse https://langfuse.com/ tracing for observability in AI agent workflows.

## Key Features

- **Transparent Context Propagation**: Adds utils to automatically inject OpenTelemetry context into MCP tool calls
- **Framework Agnostic**: Works with any MCP server implementation (stdio, HTTP, SSE transports)
- **Standards Compliant**: Uses MCP's `_meta` field convention for context propagation (W3C Trace Context)
- **Distributed Tracing**: Enables end-to-end tracing from client to server to external APIs

## Prerequisites

• Python 3.11+
• Langfuse API key
• OpenAI API key
• Exa API key

## How to run

1. Install dependencies using uv https://docs.astral.sh/uv/getting-started/installation/

```
uv sync
```
2. Configure environment variablesCreate a .env file with your API keys:

```
OPENAI_API_KEY=sk-proj-123
EXA_API_KEY=your-exa-api-key

LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_SECRET_KEY=sk-lf-123
LANGFUSE_PUBLIC_KEY=pk-lf-132
```

3. Run the application:

```
uv run src/main.py
```

The application will start an interactive session where you can ask questions, and the agent will use the MCP
search tool to find information while tracing all operations with Langfuse.

## Acknowledgments

This example is based on the excellent article by [timvw](https://github.com/timvw): https://timvw.be/2025/10/14/fastmcp-distributed-tracing-transport-agnostic-context-propagation-with-_meta/