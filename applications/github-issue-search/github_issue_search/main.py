import json
import os

import httpx
from dotenv import load_dotenv
from openai import OpenAI
from rich.console import Console
from rich.markdown import Markdown

load_dotenv()

GITHUB_REPO = "langfuse/langfuse"
GITHUB_API_BASE = "https://api.github.com"

SYSTEM_PROMPT = """\
You are a helpful assistant that searches past GitHub issues in the Langfuse \
repository (langfuse/langfuse) to help users find whether their question, bug, \
or feature request has already been reported.

When a user describes a problem or idea:
1. Think about what keywords and phrases would match relevant issues.
2. Use the search_issues tool to search. Call it multiple times with different \
queries to get better coverage (e.g. try synonyms, related terms, error messages).
3. Summarize what you found. Always include the issue number, title, state \
(open/closed), and URL so users can check directly.
4. If nothing relevant was found, let the user know it appears to be a new topic \
and encourage them to open an issue.

Be concise but thorough."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_issues",
            "description": (
                "Search GitHub issues in the langfuse/langfuse repository. "
                "Use different queries to cover different angles of the user's question."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query keywords for GitHub issues.",
                    }
                },
                "required": ["query"],
            },
        },
    }
]


def search_github_issues(query: str) -> list[dict]:
    """Search GitHub issues via the GitHub Search API."""
    github_token = os.environ.get("GITHUB_TOKEN")

    headers = {"Accept": "application/vnd.github+json"}
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    params = {
        "q": f"{query} repo:{GITHUB_REPO} is:issue",
        "sort": "relevance",
        "per_page": 5,
    }

    resp = httpx.get(
        f"{GITHUB_API_BASE}/search/issues",
        headers=headers,
        params=params,
    )
    resp.raise_for_status()

    return [
        {
            "number": item["number"],
            "title": item["title"],
            "state": item["state"],
            "url": item["html_url"],
            "body": (item["body"] or "")[:500],
            "labels": [label["name"] for label in item["labels"]],
            "created_at": item["created_at"],
            "comments": item["comments"],
        }
        for item in resp.json()["items"]
    ]


def handle_tool_calls(console: Console, tool_calls: list) -> list[dict]:
    """Execute tool calls and return tool result messages."""
    results = []
    for tool_call in tool_calls:
        if tool_call.function.name == "search_issues":
            args = json.loads(tool_call.function.arguments)
            console.print(f"  [dim]Searching: \"{args['query']}\"[/dim]")
            try:
                output = search_github_issues(args["query"])
                content = json.dumps(output)
            except httpx.HTTPStatusError as e:
                content = json.dumps({"error": f"GitHub API error: {e.response.status_code}"})

            results.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": content,
                }
            )
    return results


def main():
    console = Console()
    client = OpenAI()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    console.print("[bold]Langfuse GitHub Issue Search[/bold]")
    console.print("Describe a bug, feature idea, or question — I'll check if there's an existing issue.")
    console.print("Type 'quit' to exit.\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not user_input or user_input.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break

        messages.append({"role": "user", "content": user_input})

        while True:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=TOOLS,
            )

            choice = response.choices[0].message
            messages.append(choice)

            if not choice.tool_calls:
                break

            tool_results = handle_tool_calls(console, choice.tool_calls)
            messages.extend(tool_results)

        console.print()
        console.print(Markdown(choice.content))
        console.print()


if __name__ == "__main__":
    main()
