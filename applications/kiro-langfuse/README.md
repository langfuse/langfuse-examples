# kiro-langfuse

Langfuse observability integration for [Kiro](https://kiro.dev) IDE. Automatically traces AI agent activity during coding sessions using [Kiro Hooks](https://kiro.dev/docs/hooks/).


## Features

- All 10 Kiro hook types supported (Prompt Submit, Agent Stop, Pre/Post Tool Use, File Create/Save/Delete, Pre/Post Task Execution, Manual)
- Traces grouped by conversation
- Sessions grouped by workspace
- Dynamic tagging (tool type, file operations, model)
- Completion status scoring
- Non-blocking error handling

## Supported Hooks

| Kiro Hook Type | What it traces |
|---|---|
| Prompt Submit | User prompts and queries |
| Agent Stop | Agent completion with status scores |
| Pre Tool Use | Tool invocations before execution |
| Post Tool Use | Tool results and duration |
| File Create | New file creation |
| File Save | File modifications |
| File Delete | File deletions (WARNING level) |
| Pre Task Execution | Spec task start |
| Post Task Execution | Spec task completion |
| Manual Trigger | On-demand trace events |

## Setup

### 1. Copy to your project

```bash
cp -r kiro-langfuse/.kiro/hooks/ your-project/.kiro/hooks/
cp -r kiro-langfuse/hooks/ your-project/hooks/
```

### 2. Install dependencies

```bash
cd your-project/hooks && npm install
```

### 3. Configure Langfuse credentials

Create a `.env` file in your project root:

```bash
cp .env.example .env
# Edit .env with your Langfuse keys
```

Get your keys from [Langfuse Cloud](https://cloud.langfuse.com) or your self-hosted instance.

### 4. Enable hooks in Kiro

Open the Hook UI in Kiro:
- **Mac**: `Cmd + Shift + P` > "Kiro: Open Kiro Hook UI"
- **Windows/Linux**: `Ctrl + Shift + P` > "Kiro: Open Kiro Hook UI"

The hook files in `.kiro/hooks/` should appear automatically. Toggle them on as needed.

## How It Works

```
Kiro triggers hook event
    -> Shell command runs hook-handler.js
    -> Reads input from stdin + environment variables
    -> Creates/updates Langfuse trace for the conversation
    -> Routes to event-specific handler
    -> Creates spans, generations, scores in Langfuse
    -> Flushes data before exit
```

### Trace Hierarchy

- **Trace** - one per conversation
  - **Session** - grouped by workspace folder
  - **Generations** - user prompts
  - **Spans** - tool use, file operations, task execution
  - **Events** - agent stop, manual triggers
  - **Scores** - completion status (0-1)

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Kiro IDE](https://kiro.dev)
- A [Langfuse](https://langfuse.com) account (cloud or self-hosted)

## Project Structure

```
.kiro/
  hooks/
    langfuse-prompt-submit.kiro.hook
    langfuse-agent-stop.kiro.hook
    langfuse-pre-tool-use.kiro.hook
    langfuse-post-tool-use.kiro.hook
    langfuse-file-save.kiro.hook
    langfuse-file-create.kiro.hook
    langfuse-file-delete.kiro.hook
    langfuse-pre-task-execution.kiro.hook
    langfuse-post-task-execution.kiro.hook
    langfuse-manual.kiro.hook
hooks/
  hook-handler.js          # Main entry point
  package.json
  lib/
    langfuse-client.js     # Langfuse SDK wrapper
    handlers.js            # Event-specific handlers
    utils.js               # Shared utilities
  test/
    helpers.js             # Mock factories
    utils.test.js          # Utility function tests
    handlers.test.js       # Hook handler tests
    langfuse-client.test.js # Client wrapper tests
    e2e.test.js            # End-to-end flow tests
    integration/
      setup.js               # Docker test helpers
      harness.js             # Shared before/after setup
      trace-creation.test.js # Trace creation & session tests
      hook-flow.test.js      # Full hook flow & event tests
      scoring.test.js        # Completion & custom score tests
docker-compose.test.yml    # Langfuse v3 test stack
```

## Testing

### Unit tests

```bash
cd hooks && npm test
```

Runs 61 tests covering utilities, handlers, client wrapper, and end-to-end flows. No external services required.

### Integration tests (Docker)

Runs against a real Langfuse v3 instance in Docker:

```bash
# 1. Create .env.test with your test passwords (see .env.test.example)
cp .env.test.example .env.test

# 2. Start the Langfuse stack (first run takes ~2 min for DB migrations)
docker compose --env-file .env.test -f docker-compose.test.yml up --wait

# 3. Run integration tests
cd hooks && npm run test:integration

# 4. Tear down when done
docker compose -f docker-compose.test.yml down -v
```

The integration tests verify trace creation, observation nesting, score recording, and session grouping against the live Langfuse API.

## Viewing Traces

1. Go to your [Langfuse dashboard](https://cloud.langfuse.com)
2. Navigate to **Traces**
3. Filter by tag `kiro` or by session name (your workspace folder)
4. Click a trace to see the full conversation breakdown with nested spans

## Customizing

### Filter specific tools

Edit `.kiro/hooks/langfuse-pre-tool-use.kiro.hook` and update the `"toolName"` field to target specific tools. Kiro supports the following built-in categories:

- `read` — all built-in file read tools
- `write` — all built-in file write tools
- `shell` — all built-in shell command-related tools
- `web` — all built-in web tools
- `spec` — all built-in spec tools
- `*` — all tools (built-in and MCP)

You can also use prefix filters to target tools by source:

- `@mcp` — all MCP tools
- `@powers` — all Powers tools
- `@builtin` — all built-in tools

Prefixes starting with `@` are matched by regex, so you can use patterns like `@mcp.sql.` to match specific MCP tools by name.

To configure tool hooks via the Kiro Hook UI, type each tool name and press Enter to add it.

### Filter specific files

Edit `.kiro/hooks/langfuse-file-save.kiro.hook` and change `"patterns": ["**/*"]` to target specific files:
- `["src/**/*.ts"]` - TypeScript source files
- `["**/*.js", "**/*.ts"]` - JS and TS files
- `["**/*", "!node_modules/**"]` - exclude node_modules

## References

- [Kiro Hooks Documentation](https://kiro.dev/docs/hooks/)
- [Kiro Hook Types](https://kiro.dev/docs/hooks/types/)
- [Kiro Hook Actions](https://kiro.dev/docs/hooks/actions/)
- [Langfuse Documentation](https://langfuse.com/docs)
