#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Fetch Plain support tickets from the past N days.

Usage:
    uv run scripts/fetch-plain-tickets.py [--days 7]

Reads PLAIN_API_KEY from .env file in the scripts folder, or from environment.
Outputs JSON to stdout with thread summaries.
"""

import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


API_URL = "https://core-api.uk.plain.com/graphql/v1"
SCRIPT_DIR = Path(__file__).parent

# Plain workspace ID used for constructing ticket URLs
PLAIN_WORKSPACE_ID = os.environ.get("PLAIN_WORKSPACE_ID", "YOUR_PLAIN_WORKSPACE_ID")


def load_api_key():
    """Load PLAIN_API_KEY from environment or .env file in the scripts folder."""
    api_key = os.environ.get("PLAIN_API_KEY")
    if api_key:
        return api_key

    env_file = SCRIPT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("PLAIN_API_KEY="):
                return line.split("=", 1)[1].strip()

    return None


def graphql(query, variables=None):
    """Execute a GraphQL query against the Plain API."""
    api_key = load_api_key()
    if not api_key:
        print("Error: PLAIN_API_KEY not found in environment or .env file", file=sys.stderr)
        sys.exit(1)

    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "weekly-digest/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            if "errors" in data:
                print(f"GraphQL errors: {json.dumps(data['errors'])}", file=sys.stderr)
            return data.get("data")
    except Exception as e:
        print(f"Error calling Plain API: {e}", file=sys.stderr)
        return None


THREADS_QUERY = """
query GetRecentThreads($after: String) {
  threads(
    filters: {
      statuses: [TODO, SNOOZED, DONE]
    }
    first: 50
    after: $after
  ) {
    edges {
      node {
        id
        title
        createdAt { iso8601 }
        updatedAt { iso8601 }
        status
        labels { labelType { name } }
        customer { fullName email { email } }
        previewText
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
"""

def fetch_all_threads(since_date):
    """Fetch all threads, paginating, and filter to those within the date range."""
    threads = []
    cursor = None

    while True:
        variables = {}
        if cursor:
            variables["after"] = cursor

        data = graphql(THREADS_QUERY, variables)
        if not data or not data.get("threads"):
            break

        edges = data["threads"]["edges"]
        page_info = data["threads"]["pageInfo"]

        matched_any = False
        for edge in edges:
            node = edge["node"]
            created = node["createdAt"]["iso8601"]
            updated = node["updatedAt"]["iso8601"]

            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            updated_dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))

            if created_dt >= since_date or updated_dt >= since_date:
                matched_any = True
                threads.append({
                    "id": node["id"],
                    "title": node["title"],
                    "created_at": created,
                    "updated_at": updated,
                    "status": node["status"],
                    "labels": [l["labelType"]["name"] for l in (node.get("labels") or [])],
                    "customer_name": (node.get("customer") or {}).get("fullName"),
                    "preview": node.get("previewText", ""),
                })

        # Stop early if no threads on this page matched the date range
        if not matched_any:
            break

        if not page_info["hasNextPage"]:
            break
        cursor = page_info["endCursor"]

    return threads


def main():
    parser = argparse.ArgumentParser(description="Fetch Plain support tickets")
    parser.add_argument("--days", type=int, default=7, help="Number of days to look back (default: 7)")
    args = parser.parse_args()

    since_date = datetime.now(timezone.utc) - timedelta(days=args.days)

    threads = fetch_all_threads(since_date)

    output = {
        "period": {
            "since": since_date.isoformat(),
            "days": args.days,
        },
        "total_tickets": len(threads),
        "tickets": threads,
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
