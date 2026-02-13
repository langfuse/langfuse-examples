# GitHub Discussion Search

CLI chatbot that searches past [Langfuse GitHub Discussions](https://github.com/orgs/langfuse/discussions) to help users find whether their question, idea, or feature request has already been discussed — before opening a new one.

An LLM generates targeted search queries against the GitHub GraphQL API, reviews the results, and summarizes what it finds with direct links to relevant discussions.

## Features

- Searches GitHub Discussions (ideas, feature requests, questions) in `langfuse/langfuse`
- LLM generates multiple search queries for better coverage
- System prompt managed in Langfuse (prompt name: `github-issue-search`)
- All LLM calls traced to Langfuse via the `@observe()` decorator

## Prerequisites

- Python >= 3.11, < 3.14
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
cp .env.example .env
```

Fill in your `.env`:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `GITHUB_TOKEN` | Yes | GitHub personal access token (fine-grained, public repo read access) |
| `LANGFUSE_PUBLIC_KEY` | Yes | Langfuse public key |
| `LANGFUSE_SECRET_KEY` | Yes | Langfuse secret key |
| `LANGFUSE_HOST` | Yes | Langfuse host (e.g. `https://cloud.langfuse.com`) |

Install dependencies:

```bash
uv sync --python 3.12
```

## Usage

```bash
uv run python -m github_issue_search.main
```

Then describe a bug, feature idea, or question. The bot will search existing discussions and tell you if something similar has already been discussed.

```
You: dark mode support
  Searching: "dark mode"
  Searching: "theme customization"

I found an existing discussion about this:

- #941 Dark mode (Ideas, open) — https://github.com/orgs/langfuse/discussions/941
```

Type `quit` to exit.

## Observability

All LLM calls and tool invocations are traced to Langfuse. View traces in your Langfuse dashboard under the `github-issue-search-bot` trace name.

The system prompt is managed in Langfuse as a text prompt named `github-issue-search` with the `production` label. You can edit it in the Langfuse UI without redeploying.
