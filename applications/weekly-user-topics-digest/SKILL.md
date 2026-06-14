---
name: weekly-user-topics-digest
description: >
  Generates a weekly digest of real user topics by pulling from three sources:
  (1) Circleback meeting notes from the past 7 days, (2) Plain support tickets from the
  past 7 days, and (3) GitHub issues filed or updated on the langfuse/langfuse repo in the
  past 7 days. Synthesizes into a ranked summary of genuine user topics — not just bugs,
  but friction, confusion, missing features, and workflow blockers that affect real users
  significantly. Use this skill whenever the user asks for: weekly summary, weekly digest,
  user pain points, what users are struggling with, Langfuse user issues, GitHub issue
  summary, Plain tickets summary, support tickets review, meeting notes summary, "what did
  users complain about this week", "what are the top issues from the past week", or
  "run the weekly digest."
---

# Weekly User Topics Digest

Synthesizes user topics from Circleback meeting notes, Plain support tickets, and GitHub
issues into a single prioritized digest.

All fetch scripts live in `scripts/` and output JSON to stdout.

---

## Prerequisites

Before first run, ensure these are set up:

1. **Circleback**: Add the MCP server once: `claude mcp add --transport http circleback https://app.circleback.ai/api/mcp`, then run `/mcp` in a session to complete the OAuth login in your browser.
3. **Plain**: A `PLAIN_API_KEY` must be present in `scripts/.env` (see `scripts/.env.example`).
4. **GitHub**: The `gh` CLI must be installed and authenticated (`gh auth login`).

---

## Step 0: Verify Source Availability

**Before doing any data fetching**, check that all three sources are accessible. Report any issues to the user and ask how to proceed.

1. **Circleback**: Check if the Circleback MCP tools are available. If no Circleback tools are listed, tell the user they need to add it: `claude mcp add --transport http circleback https://app.circleback.ai/api/mcp`
2. **Plain**: Run `uv run scripts/fetch-plain-tickets.py --days 1` as a quick connectivity check. If it errors, flag the missing/invalid API key.
3. **GitHub**: Run `gh auth status` to verify the CLI is authenticated.

**If any source is unavailable, tell the user which ones are missing and ask whether to proceed with the available sources or wait.** Do not silently skip sources and produce an incomplete digest.

**Circleback is mandatory.** If Circleback tools are not available, STOP and tell the user. Do not proceed with the rest of the skill. Meeting notes are a critical source and running without them produces an incomplete digest that is not useful.

---

## Step 1: Gather Circleback Notes

Use the Circleback MCP tools to fetch meeting notes from the past 7 days.

1. Call `SearchMeetings` with the appropriate date range (past 7 days) to list all recent meetings.
2. For each meeting returned, call `ReadMeetings` with the meeting IDs to get the full notes, action items, and attendees.
3. Focus on: customer calls, user interviews, support calls, feedback sessions.

Extract signals of user topics: complaints, workarounds, confusion, feature requests, churn signals.

**Linking to Circleback notes:** The `ReadMeetings` response includes a meeting ID. Construct links as `https://app.circleback.ai/meetings/<meetingId>`. Always use these per-meeting links in the digest — never link to the generic `https://app.circleback.ai` URL.

If the Circleback MCP is unavailable, this should have been caught in Step 0. Do not proceed without it.

---

## Step 2: Fetch Plain Support Tickets

Run the Plain tickets fetch script:

```bash
uv run scripts/fetch-plain-tickets.py --days 7
```

The script reads `PLAIN_API_KEY` from the `.env` file in the scripts folder. If the key is missing, the script will error — note this in the digest and proceed with other sources.

From the output, extract:
- The user's described problem (from the `preview` field which contains the thread's preview text)
- How many different customers reported the same/similar issue
- Labels/tags applied (these often categorize the pain type)
- Whether the issue was resolved or is still open (`status` field)

**Linking to Plain tickets:** The ticket `id` field (e.g. `th_01KKBRQ39DC7M9SF5VHAYQST3V`) must be combined with the workspace ID to form a working link. The Plain workspace ID is configured via the `PLAIN_WORKSPACE_ID` environment variable. Construct links as: `https://app.plain.com/workspace/${PLAIN_WORKSPACE_ID}/thread/<ticket_id>`

---

## Step 3: Fetch GitHub Issues from Langfuse

Run the GitHub issues fetch script:

```bash
uv run scripts/fetch-github-issues.py --days 7
```

Requires `gh` CLI installed and authenticated. No API key needed for public repos.

The script outputs all issues and separately highlights `high_signal_issues` (3+ thumbs up or 5+ comments). Pay special attention to those. Also look through `all_issues` for:
- Body describing a completely broken workflow
- "Same issue" / "me too" patterns across issues
- Issues with many labels suggesting widespread impact

### Evaluating GitHub issues carefully

For each issue you consider including in the digest, you MUST read the full issue thread (body + comments) before deciding to include it. Pay attention to:

- **Dates**: Only include issues where the relevant activity (opening, new comments, new reactions) happened in the past 7 days. An old issue that was reopened or commented on counts, but only if the new activity is substantive and from this week. A user commenting "thanks, that workaround worked" on a 6-month-old issue is not a new topic.
- **Resolution**: Check if the issue was actually a user mistake, misconfiguration, or misunderstanding. If the thread shows it was resolved as user error, do not include it.
- **Staleness**: If an issue has had no engineer response or activity for a long time, note it as stale in the digest.
- **Bug confirmation**: For bug reports, check whether an engineer from Langfuse has confirmed it as a real bug. If not, indicate it as "unconfirmed" in the digest. Don't present unconfirmed reports as established facts.

---

## Step 4: Synthesize into User Topics Digest

Merge signals across all three sources into a list of concrete user topics.

### Important guidelines

- **Focus on what users are talking about, not just bugs.** The digest should surface the topics users care about most — feature requests, workflow friction, confusion, missing capabilities, and yes, bugs too, but bugs should not dominate. A bug is just one type of topic.
- **Be specific, not vague.** Each topic must describe a concrete, specific problem or request. "Users struggle with tracing" is too vague. "Users can't filter traces by metadata keys that contain dots (e.g. `user.id`)" is specific. If you can't describe the topic specifically, you haven't understood it well enough yet.
- **Don't over-group.** Only group items together if they are genuinely about the same specific problem or request. Read the actual content of each item before deciding to merge — don't group based on surface-level keyword similarity. Two tickets that both mention "traces" could be about completely different things. A self-hosted user asking about a beta feature and a cloud user reporting missing data are NOT the same topic just because both involve "observations." If you can't explain in one sentence why two items are the same problem, they are separate topics.
- **Exclude routine operational interactions.** Things like SSO setup requests, billing questions, or standard onboarding flows are not user pain — they are expected processes. Only flag these if there's a pattern suggesting the process itself is broken or confusing.
- **Include links.** Every piece of evidence must include a direct link (GitHub issue URL, Plain ticket URL, Circleback meeting link) so the reader can dig deeper.

### Ranking Logic

Rank topics by combining:
1. **Cross-source frequency** — appears in Plain AND GitHub AND meetings = high priority
2. **Volume** — many tickets/reactions/comments about same issue
3. **Severity** — blocks a core workflow > minor annoyance
4. **User type** — paying/enterprise customers weighted more heavily
5. **Trend** — new this week vs. recurring (note both)
6. **Breadth of audience** — topics affecting all users (e.g., core platform features, dashboard, API) rank higher than topics that only affect a subset (e.g., a specific integration or self-hosting). Integration-specific issues and self-hosting issues can still appear in the digest, but should not be ranked at the top unless they have very high volume or severity.

### Categorization

Do NOT use a fixed set of categories. Instead, create ad-hoc categories that make sense for THIS week's topics, from the perspective of a Langfuse engineer deciding what to do with them. The categories should help answer: "what can we act on, and how?"

Example categories (use these as inspiration, not as a fixed list — adapt to what you actually find):

- **Clear action needed** — issues where the problem is well-understood and what needs to be done is obvious. The decision of what to do is straightforward, even if the implementation itself might not be trivial.
- **Roadmap input** — feature requests, unconfirmed bug reports that need investigation, and other topics that require design, planning, or deeper analysis before action. Useful for roadmap prioritization and triage.
- **Already in progress / known** — topics that relate to work the team is already doing (e.g., if a major release like v4 is underway, group related feedback here). Use context from meetings and any knowledge of ongoing initiatives to identify these.

Keep the number of categories small (2-4). The goal is that an engineer reading the digest can quickly scan each section and know what kind of action is needed. Include ALL noteworthy topics — don't limit to a fixed number like 10.

### Output format

```
## Weekly User Topics Digest — [DATE_7_DAYS_AGO] → [TODAY]

### [Category Name]

**[Specific Topic Title]**
[2-3 sentence description that is specific enough for someone unfamiliar to understand exactly what the problem/request is and why it matters]
- Sources:
  - [Plain ticket title](https://app.plain.com/workspace/${PLAIN_WORKSPACE_ID}/thread/<ticket_id>) — "[relevant quote from ticket]"
  - [GitHub #NNN](link) — N thumbs up, N comments — confirmed bug / unconfirmed / stale (no response in X months)
  - [Meeting name](https://app.circleback.ai/meetings/<meetingId>) — "[what was said]"

**[Specific Topic Title]**
...

### [Another Category Name]
...

---

### What to Watch
[1-2 items that aren't critical yet but are trending upward, with links]

### Sources Reviewed
- Circleback notes: [N meetings]
- Plain tickets: [N tickets in last 7 days]
- GitHub issues scanned: [N open, N recently closed]
- Date range: [Last 7 days]
```

---

## Notes

- If any source is unavailable (no API key, MCP error, script failure), note it in the digest and continue with the other sources
- Only group items if they are truly the same specific issue — when in doubt, keep separate
- Redact obviously private customer info (names, emails) before displaying
