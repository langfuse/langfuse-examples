# Evaluating AI Agent Skills with Langfuse

Evaluate how well an AI coding agent (Claude Code) performs tasks against a [Langfuse dataset](https://langfuse.com/docs/datasets/overview). Each dataset item defines a prompt and an optional sandbox repository for the agent to work in. Results are traced back to Langfuse as experiment runs for comparison and scoring.

## How It Works

1. The script iterates over items in a Langfuse dataset.
2. For each item, it copies a sandbox repository into an isolated temp directory.
3. Claude Code runs against the prompt inside that sandbox.
4. Tool calls and model completions are automatically captured as OpenTelemetry spans via [LangSmith's Claude Agent SDK integration](https://docs.smith.langchain.com/observability/how_to_guides/trace_with_claude_code) and forwarded to Langfuse.
5. Each item's output is linked to the dataset run in Langfuse for evaluation.

## Dataset Item Format

Each dataset item input can be:

- **A string** — used as the prompt directly; the agent runs in the `default-hello-world` sandbox.
- **A dict** with:
  - `"prompt"` (required): the prompt to give the agent.
  - `"sample-code-folder"` (optional): subfolder under `agent-sandbox-repos/` to run the agent in. Defaults to `default-hello-world`.

## Included Sandbox Repositories

The `agent-sandbox-repos/` directory contains sample codebases the agent operates on:

| Folder | Description |
|--------|-------------|
| `default-hello-world` | Minimal Python script (default fallback) |
| `openai-single-chat-completion` | Simple OpenAI chat completion |
| `openai-streaming` | OpenAI streaming response |
| `openai-custom-functions-rag` | OpenAI with function calling and RAG |
| `langchain-chain` | LangChain prompt → model → parser chain |
| `langchain-plus-direct-openai-mixed` | LangChain + direct OpenAI in one app |
| `instructor-pydantic-extraction` | Instructor with Pydantic structured extraction |
| `litellm-multi-provider` | LiteLLM calling multiple providers |
| `pydantic-ai-agent` | PydanticAI agent with tool use |
| `nextjs-vercel-ai-sdk` | Next.js app with Vercel AI SDK |

Each sandbox repo can include its own `.env` file with Langfuse credentials for the project the agent is working on (separate from the evaluation runner's credentials).

## Prerequisites

- Python 3.11+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- Langfuse account with API keys
- Anthropic API key

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Create a `.env` file with your credentials (see `.env.example`):

```
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
ANTHROPIC_API_KEY=sk-ant-...
```

3. Optionally, add `.env` files to sandbox repos under `agent-sandbox-repos/` if the agent needs Langfuse credentials for the project it's working on.

4. Create a dataset in Langfuse with items following the format described above.

## Usage

```bash
python run_experiment_auto.py --dataset "my-dataset"
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--dataset` | Yes | — | Langfuse dataset name |
| `--run-name` | No | `<dataset>-<timestamp>` | Experiment run name |
| `--max-turns` | No | `10` | Max Claude Code turns per item |
| `--delay` | No | `5` | Seconds to wait between items |

### Example

```bash
python run_experiment_auto.py --dataset "instrumentation-tests" --run-name "eval-v1" --max-turns 15
```

Results appear in Langfuse under the dataset's experiment runs, where you can compare outputs across runs and add scores.
