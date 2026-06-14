# Weekly User Topics Digest

A Claude Code skill that generates a weekly digest of real user topics by pulling from three sources: Circleback meeting notes, Plain support tickets, and GitHub issues. It synthesizes these into a ranked summary of genuine user topics — friction, confusion, missing features, and workflow blockers.

## How It Works

The skill uses three Python scripts to fetch data from different sources, then synthesizes the results into a prioritized digest with categories and actionable insights.

1. **Circleback meeting notes** — fetched via MCP tools (customer calls, user interviews, support calls)
2. **Plain support tickets** — fetched via GraphQL API
3. **GitHub issues** — fetched via `gh` CLI

## Prerequisites

- **Circleback MCP**: Add once with `claude mcp add --transport http circleback https://app.circleback.ai/api/mcp`, then run `/mcp` to complete OAuth
- **Plain**: Set `PLAIN_API_KEY` in `scripts/.env` (see `scripts/.env.example`)
- **Plain workspace ID**: Set `PLAIN_WORKSPACE_ID` environment variable for ticket URL construction
- **GitHub**: `gh` CLI installed and authenticated (`gh auth login`)

## Setup

1. Copy the env example and add your API key:

```bash
cp scripts/.env.example scripts/.env
# Edit scripts/.env with your Plain API key
```

2. Set the Plain workspace ID:

```bash
export PLAIN_WORKSPACE_ID=your_workspace_id
```

3. Install the skill in Claude Code by placing `SKILL.md` in your skills directory, or invoke it from this repo.

## Scripts

| Script | Source | Auth |
|--------|--------|------|
| `scripts/fetch-plain-tickets.py` | Plain support tickets | `PLAIN_API_KEY` in `.env` |
| `scripts/fetch-github-issues.py` | GitHub issues | `gh` CLI |
| `scripts/fetch-meeting-notes.py` | Gmail/Calendar meeting notes | MCP tools |

All scripts accept a `--days N` flag (default: 7) and output JSON to stdout.

## Usage

Run the skill via Claude Code:

```
run the weekly digest
```

Or run individual scripts directly:

```bash
uv run scripts/fetch-plain-tickets.py --days 7
uv run scripts/fetch-github-issues.py --days 7
uv run scripts/fetch-meeting-notes.py --days 7
```
