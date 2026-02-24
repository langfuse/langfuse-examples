"""Run Claude Code against a Langfuse dataset with auto-instrumentation.

Each dataset item input can be:
  - A string (used as the prompt directly)
  - A dict with "prompt" and optionally "sample-code-folder" (subfolder
    under agent-sandbox-repos/ to run the agent in; defaults to
    "default-hello-world")

Uses langsmith's Claude Agent SDK integration to automatically capture
tool calls and model completions as OpenTelemetry spans forwarded to Langfuse.

Usage:
    python run_experiment_auto.py --dataset "my-dataset" --run-name "eval-v1" --max-turns 10
"""

import argparse
import asyncio
import os
import shutil
import tempfile
from datetime import datetime

from dotenv import load_dotenv
from langfuse import get_client, propagate_attributes
from langsmith.integrations.claude_agent_sdk import configure_claude_agent_sdk

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
)
from claude_agent_sdk.types import TextBlock

SANDBOX_DIR = os.path.join(os.path.dirname(__file__), "agent-sandbox-repos")
DEFAULT_SANDBOX = "default-hello-world"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run Claude Code against a Langfuse dataset (auto-instrumented)"
    )
    parser.add_argument("--dataset", required=True, help="Langfuse dataset name")
    parser.add_argument(
        "--run-name",
        default=None,
        help="Experiment run name (defaults to <dataset>-<timestamp>)",
    )
    parser.add_argument(
        "--max-turns", type=int, default=10, help="Max Claude Code turns per item"
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=5,
        help="Delay in seconds between items (default: 5)",
    )
    return parser.parse_args()


def _load_agent_env(item_cwd: str) -> dict[str, str]:
    """Build env dict for the agent subprocess.

    Blanks out Langfuse vars from the root process (so the agent doesn't
    inherit the tracing project credentials), then loads the agent's own
    .env file from item_cwd.
    """
    agent_env: dict[str, str] = {
        "LANGFUSE_PUBLIC_KEY": "",
        "LANGFUSE_SECRET_KEY": "",
        "LANGFUSE_HOST": "",
    }

    env_path = os.path.join(item_cwd, ".env")
    if os.path.isfile(env_path):
        from dotenv import dotenv_values

        for k, v in dotenv_values(env_path).items():
            if v is not None:
                agent_env[k] = v

    return agent_env


async def run_claude_code(
    prompt: str, args, item_cwd: str, stderr_lines: list
) -> dict:
    """Run Claude Code for a single dataset item.

    Uses ClaudeSDKClient (not the standalone query() function) so that
    configure_claude_agent_sdk() auto-instrumentation captures tool calls
    and model completions as OTel spans.
    """
    options = ClaudeAgentOptions(
        max_turns=args.max_turns,
        cwd=item_cwd,
        permission_mode="bypassPermissions", # we don't want the agent to be stuck asking for permissions
        setting_sources=["user", "project"],
        stderr=lambda line: stderr_lines.append(line),
        env=_load_agent_env(item_cwd),
    )

    last_assistant_text = []
    all_text = []
    result_text = None
    session_meta = {}

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                last_assistant_text = []
                for block in message.content:
                    if isinstance(block, TextBlock):
                        all_text.append(block.text)
                        last_assistant_text.append(block.text)

            elif isinstance(message, ResultMessage):
                result_text = message.result
                session_meta = {
                    "duration_ms": message.duration_ms,
                    "duration_api_ms": message.duration_api_ms,
                    "num_turns": message.num_turns,
                    "session_id": message.session_id,
                    "total_cost_usd": message.total_cost_usd,
                    "is_error": message.is_error,
                }

    output = (
        result_text
        or "\n".join(last_assistant_text)
        or "\n".join(all_text)
    )

    return {
        "output": output,
        "session_meta": session_meta,
        "stderr": "\n".join(stderr_lines),
    }


async def run_experiment(args):
    load_dotenv()

    # Allow running from within a Claude Code session
    os.environ.pop("CLAUDECODE", None)

    # Enable OTel mode for langsmith so spans go to Langfuse, not LangSmith
    os.environ["LANGSMITH_OTEL_ENABLED"] = "true"
    os.environ["LANGSMITH_OTEL_ONLY"] = "true"
    os.environ["LANGSMITH_TRACING"] = "true"

    langfuse = get_client()

    # Auto-instrument Claude Agent SDK: tool calls and model completions
    # are automatically captured as OTel spans forwarded to Langfuse.
    configure_claude_agent_sdk()

    dataset = langfuse.get_dataset(args.dataset)
    run_name = args.run_name or f"{args.dataset}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    print(
        f"Running experiment '{run_name}' on dataset '{args.dataset}' "
        f"({len(dataset.items)} items)"
    )

    # Manual loop instead of langfuse.run_experiment() because we need
    # item.run() + propagate_attributes() to bridge the Langfuse observation
    # context into OTel — otherwise auto-instrumented spans from
    # configure_claude_agent_sdk() would create orphaned traces instead of
    # nesting under each dataset item's run.
    for i, item in enumerate(dataset.items):
        item_input = item.input
        if isinstance(item_input, str):
            prompt = item_input
            sample_folder = DEFAULT_SANDBOX
        elif isinstance(item_input, dict):
            prompt = item_input.get("prompt") or str(item_input)
            sample_folder = item_input.get("sample-code-folder", DEFAULT_SANDBOX)
        else:
            prompt = str(item_input)
            sample_folder = DEFAULT_SANDBOX

        print(f"\n  [{i + 1}/{len(dataset.items)}] Processing item {item.id}...")
        print(f"    Folder: {sample_folder}")
        print(f"    Prompt: {prompt[:80]}...")

        source_cwd = os.path.join(SANDBOX_DIR, sample_folder)
        if not os.path.isdir(source_cwd):
            print(f"    SKIP — folder not found: {source_cwd}")
            continue

        item_cwd = tempfile.mkdtemp(prefix=f"eval-item-{i}-{sample_folder}-")
        try:
            for entry in os.listdir(source_cwd):
                src = os.path.join(source_cwd, entry)
                dst = os.path.join(item_cwd, entry)
                if os.path.isdir(src):
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)

            with item.run(
                run_name=run_name,
                run_description="Claude Code evaluation run (auto-instrumented)",
                run_metadata={
                    "max_turns": args.max_turns,
                    "sample_folder": sample_folder,
                    "cwd": item_cwd,
                },
            ) as root_span:
                stderr_lines = []
                try:
                    # propagate_attributes bridges the Langfuse observation
                    # context to OTel so auto-instrumented spans nest under
                    # the item.run() trace.
                    with propagate_attributes():
                        result = await run_claude_code(
                            prompt, args, item_cwd, stderr_lines
                        )

                    root_span.update(
                        input=item_input,
                        output=result["output"],
                        metadata=result["session_meta"],
                    )

                    print(
                        f"    Done. {len(result['output'])} chars output"
                    )
                except Exception as e:
                    import traceback
                    error_detail = traceback.format_exc()
                    stderr_output = "\n".join(stderr_lines)
                    root_span.update(
                        output=f"Error: {e}",
                        metadata={"stderr": stderr_output},
                    )
                    print(f"    Error: {e}")
                    if stderr_output:
                        print(f"    Stderr:\n{stderr_output}")
                    else:
                        print(f"    Traceback:\n{error_detail}")
        finally:
            shutil.rmtree(item_cwd, ignore_errors=True)

        # Delay between items to avoid rate limiting
        if i < len(dataset.items) - 1 and args.delay > 0:
            print(f"    Waiting {args.delay}s before next item...")
            await asyncio.sleep(args.delay)

    langfuse.flush()
    print(f"\nExperiment '{run_name}' complete. View results in Langfuse.")


def main():
    args = parse_args()
    asyncio.run(run_experiment(args))


if __name__ == "__main__":
    main()
