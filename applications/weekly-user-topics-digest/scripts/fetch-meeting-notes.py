#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Fetch meeting notes from Gmail and Google Calendar for the past N days.

This script uses the Gmail and Google Calendar MCP tools available in Claude.
It CANNOT be run standalone — it generates the MCP tool call instructions
that the skill executor (Claude) should follow.

When called, it outputs a JSON instruction set for the skill to execute via MCP.

Usage:
    uv run scripts/fetch-meeting-notes.py [--days 7]

The output is a JSON object with search queries and instructions for the MCP tools.
The skill (SKILL.md) should use these to call the Gmail and Calendar MCP tools.
"""

import argparse
import json
from datetime import datetime, timedelta


def main():
    parser = argparse.ArgumentParser(description="Generate meeting notes fetch instructions")
    parser.add_argument("--days", type=int, default=7, help="Number of days to look back (default: 7)")
    args = parser.parse_args()

    today = datetime.now()
    since_date = today - timedelta(days=args.days)
    since_str = since_date.strftime("%Y/%m/%d")
    since_iso = since_date.strftime("%Y-%m-%dT00:00:00Z")
    today_iso = today.strftime("%Y-%m-%dT23:59:59Z")

    instructions = {
        "period": {
            "since": since_date.strftime("%Y-%m-%d"),
            "until": today.strftime("%Y-%m-%d"),
            "days": args.days,
        },
        "gmail_searches": [
            {
                "description": "Meeting notes and recaps",
                "query": f"subject:(meeting notes OR call notes OR recap) after:{since_str}",
            },
            {
                "description": "Circleback/notetaker emails",
                "query": f"subject:(circleback OR notetaker) after:{since_str}",
            },
            {
                "description": "Google Meet recordings",
                "query": f"from:meet-recordings-noreply@google.com after:{since_str}",
            },
        ],
        "calendar_query": {
            "description": "All meetings in date range — check descriptions for embedded notes",
            "time_min": since_iso,
            "time_max": today_iso,
        },
        "extraction_instructions": (
            "For each meeting note found, extract: "
            "(1) meeting title and participants, "
            "(2) discussion points mentioning user problems, complaints, friction, or feature requests, "
            "(3) any direct quotes from customers about pain."
        ),
    }

    print(json.dumps(instructions, indent=2))


if __name__ == "__main__":
    main()
