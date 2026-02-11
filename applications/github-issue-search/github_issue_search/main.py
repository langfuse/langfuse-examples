import json
import os

import httpx
from dotenv import load_dotenv
from langfuse import Langfuse, get_client, observe
from langfuse.openai import OpenAI
from rich.console import Console
from rich.markdown import Markdown

load_dotenv()

GITHUB_REPO = "langfuse/langfuse"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_discussions",
            "description": (
                "Search GitHub discussions (ideas, feature requests, questions) "
                "in langfuse/langfuse. Use different queries to cover different "
                "angles of the user's question."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query keywords.",
                    }
                },
                "required": ["query"],
            },
        },
    },
]


DISCUSSIONS_QUERY = """
query($search: String!) {
  search(query: $search, type: DISCUSSION, first: 5) {
    nodes {
      ... on Discussion {
        number
        title
        url
        body
        category { name }
        createdAt
        comments { totalCount }
        answer { id }
      }
    }
  }
}
"""


@observe()
def search_github_discussions(query: str) -> list[dict]:
    """Search GitHub discussions via the GraphQL API."""
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        return [{"error": "GITHUB_TOKEN required to search discussions"}]

    resp = httpx.post(
        "https://api.github.com/graphql",
        headers={"Authorization": f"Bearer {github_token}"},
        json={
            "query": DISCUSSIONS_QUERY,
            "variables": {"search": f"repo:{GITHUB_REPO} {query}"},
        },
    )
    resp.raise_for_status()

    return [
        {
            "number": node["number"],
            "title": node["title"],
            "url": node["url"],
            "body": (node["body"] or "")[:500],
            "category": node["category"]["name"],
            "created_at": node["createdAt"],
            "comments": node["comments"]["totalCount"],
            "answered": node["answer"] is not None,
        }
        for node in resp.json()["data"]["search"]["nodes"]
    ]


def handle_tool_calls(console: Console, tool_calls: list) -> list[dict]:
    """Execute tool calls and return tool result messages."""
    results = []
    for tool_call in tool_calls:
        if tool_call.function.name != "search_discussions":
            continue
        args = json.loads(tool_call.function.arguments)
        console.print(f"  [dim]Searching: \"{args['query']}\"[/dim]")
        try:
            output = search_github_discussions(args["query"])
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


@observe(name="github-issue-search-bot", capture_input=False)
def handle_turn(client: OpenAI, console: Console, messages: list):
    """Handle a single user turn, including tool-calling loop."""
    get_client().update_current_trace(input=messages[-1]["content"])

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

    return choice.content


def main():
    console = Console()
    client = OpenAI()
    langfuse = Langfuse()
    prompt = langfuse.get_prompt("github-issue-search", label="production")
    system_prompt = prompt.compile()
    messages = [{"role": "system", "content": system_prompt}]

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

        response_text = handle_turn(client, console, messages)

        console.print()
        console.print(Markdown(response_text))
        console.print()

    get_client().flush()


if __name__ == "__main__":
    main()
