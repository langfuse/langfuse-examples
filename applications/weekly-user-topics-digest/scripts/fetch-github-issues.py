#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Fetch GitHub issues from a repo that were filed or updated in the past 7 days.

Usage:
    uv run scripts/fetch-github-issues.py [--days 7]

Outputs JSON to stdout with open and closed issues, including title, body preview,
comment count, reaction count, and labels.

Requires: `gh` CLI installed and authenticated.
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime, timedelta


REPO = "langfuse/langfuse"


def gh_api(endpoint, params=None):
    """Call the GitHub API via gh CLI."""
    cmd = ["gh", "api", endpoint]
    if params:
        for k, v in params.items():
            cmd.extend(["-f", f"{k}={v}"])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"Warning: gh api call failed: {result.stderr}", file=sys.stderr)
            return None
        return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Warning: gh api error: {e}", file=sys.stderr)
        return None


def fetch_issues(state, since, per_page=100):
    """Fetch issues from the repo."""
    endpoint = f"/repos/{REPO}/issues?state={state}&sort=updated&since={since}&per_page={per_page}"
    cmd = ["gh", "api", endpoint]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"Warning: Failed to fetch {state} issues: {result.stderr}", file=sys.stderr)
            return []
        return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Warning: Error fetching {state} issues: {e}", file=sys.stderr)
        return []


def fetch_reactions(issue_number):
    """Fetch reaction counts for an issue."""
    endpoint = f"/repos/{REPO}/issues/{issue_number}/reactions?per_page=100"
    cmd = ["gh", "api", endpoint]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            return 0
        reactions = json.loads(result.stdout)
        return sum(1 for r in reactions if r.get("content") == "+1")
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        return 0


def process_issue(issue):
    """Extract relevant fields from a GitHub issue."""
    # Skip pull requests (GitHub API returns PRs as issues too)
    if "pull_request" in issue:
        return None

    body = (issue.get("body") or "")[:500]
    labels = [l["name"] for l in issue.get("labels", [])]
    comment_count = issue.get("comments", 0)
    thumbs_up = fetch_reactions(issue["number"])

    return {
        "number": issue["number"],
        "title": issue["title"],
        "state": issue["state"],
        "body_preview": body,
        "labels": labels,
        "comment_count": comment_count,
        "thumbs_up": thumbs_up,
        "created_at": issue["created_at"],
        "updated_at": issue["updated_at"],
        "url": issue["html_url"],
        "user": issue.get("user", {}).get("login", "unknown"),
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch GitHub issues from langfuse/langfuse")
    parser.add_argument("--days", type=int, default=7, help="Number of days to look back (default: 7)")
    args = parser.parse_args()

    since_date = datetime.utcnow() - timedelta(days=args.days)
    since_iso = since_date.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Fetch open and recently closed issues
    open_issues = fetch_issues("open", since_iso, per_page=100)
    closed_issues = fetch_issues("closed", since_iso, per_page=50)

    all_issues = []
    for issue in open_issues + closed_issues:
        processed = process_issue(issue)
        if processed:
            all_issues.append(processed)

    # Separate high-signal issues
    high_signal = [
        i for i in all_issues
        if i["thumbs_up"] >= 3
        or i["comment_count"] >= 5
    ]

    output = {
        "period": {
            "since": since_iso,
            "days": args.days,
        },
        "total_open_scanned": len([i for i in all_issues if i["state"] == "open"]),
        "total_closed_scanned": len([i for i in all_issues if i["state"] == "closed"]),
        "high_signal_issues": high_signal,
        "all_issues": all_issues,
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
