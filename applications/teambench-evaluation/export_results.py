"""Import completed TeamBench ablation runs into Langfuse without rerunning agents."""
from __future__ import annotations

import argparse
from collections import defaultdict
import json
import math
from pathlib import Path


# The harness writes a passing attestation for team_no_verify as a stub.
# Oracle/restricted/self-check attestations are not independent verifier votes.
VERIFIER_CONDITIONS = {"full", "team_no_plan", "hetero", "enforced",
                       "prompt_only", "enforced_shared_history"}


def read_object(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}")
    return value


def load_records(results_path: Path, teambench_root: Path) -> list[dict]:
    """Read the aggregate `runs` schema produced by harness.ablation."""
    report = read_object(results_path)
    runs = report.get("runs")
    if not isinstance(runs, list) or not runs:
        raise ValueError("Expected a nonempty runs list from harness.ablation")
    root = teambench_root.resolve()
    records = []
    identities = set()
    for row in runs:
        if not isinstance(row, dict):
            raise ValueError("Each run must be an object")
        for key in ("task_id", "condition", "run_id"):
            if not isinstance(row.get(key), str) or not row[key]:
                raise ValueError(f"Each run needs a nonempty {key}")
        identity = (row["task_id"], row["condition"], row["run_id"])
        if identity in identities:
            raise ValueError(f"Duplicate run {identity}")
        identities.add(identity)
        if type(row.get("pass")) is not bool:
            raise ValueError("The pass field must be a JSON boolean")
        partial = row.get("partial_score")
        if partial is not None and (type(partial) not in (int, float)
                                   or not math.isfinite(partial)
                                   or not 0 <= partial <= 1):
            raise ValueError("partial_score must be finite and between 0 and 1")
        record = {"task_id": row["task_id"], "condition": row["condition"],
                  "run_id": row["run_id"], "seed": row.get("seed"),
                  "model": report.get("model", "unknown"), "passed": row["pass"],
                  "partial_score": partial, "infrastructure_error": bool(row.get("error")),
                  "grader_available": "grader_no_score" not in row.get("failure_modes", []),
                  "verifier_approved": None, "roles": []}
        run_dir_value = row.get("run_dir")
        if run_dir_value:
            run_dir = (root / run_dir_value).resolve()
            if not run_dir.is_relative_to(root):
                raise ValueError("run_dir must be inside the supplied TeamBench root")
            attestation_path = run_dir / "submission" / "attestation.json"
            if row["condition"] in VERIFIER_CONDITIONS and attestation_path.is_file():
                if not attestation_path.resolve().is_relative_to(root):
                    raise ValueError("Attestation must be inside the TeamBench root")
                attestation = read_object(attestation_path)
                # A synthetic stub must never be reported as an agent judgment.
                if (attestation.get("condition") != "team_no_verify_stub"
                        and attestation.get("verdict") in ("pass", "fail")):
                    record["verifier_approved"] = attestation["verdict"] == "pass"
            groups = defaultdict(list)
            for path in sorted((run_dir / "logs").glob("**/turn_*.json")):
                if not path.resolve().is_relative_to(root):
                    raise ValueError("Turn logs must be inside the TeamBench root")
                turn = read_object(path)
                role = turn.get("role")
                if not isinstance(role, str) or not role:
                    raise ValueError("Turn logs must name the agent role")
                groups[(role, str(path.parent.relative_to(run_dir / "logs")))].append(turn)
            for (role, phase), turns in groups.items():
                record["roles"].append({"role": role, "phase": phase,
                                        "turn_count": len(turns),
                                        "tool_call_count": sum(len(t.get("tool_calls", []))
                                                               for t in turns)})
        records.append(record)
    return records


def scores_for(record: dict) -> dict[str, float]:
    if record["infrastructure_error"] or not record["grader_available"]:
        return {}
    scores = {"deterministic_success": float(record["passed"])}
    if record["partial_score"] is not None:
        scores["deterministic_partial_score"] = record["partial_score"]
    approved = record["verifier_approved"]
    if approved is not None:
        scores["verifier_approved"] = float(approved)
        scores["false_approval"] = float(approved and not record["passed"])
    return scores


def summarize(records: list[dict]) -> list[dict]:
    groups = defaultdict(list)
    for record in records:
        groups[record["condition"]].append(record)
    summaries = []
    for condition, rows in sorted(groups.items()):
        eligible = [r for r in rows if scores_for(r)]
        judged = [r for r in eligible if r["verifier_approved"] is not None]
        failed_judged = [r for r in judged if not r["passed"]]
        summaries.append({
            "condition": condition, "runs": len(rows), "scored_runs": len(eligible),
            "excluded_runs": len(rows) - len(eligible),
            "success_rate": sum(r["passed"] for r in eligible) / len(eligible) if eligible else None,
            "runs_with_verifier_judgment": len(judged),
            "failed_runs_with_verifier_judgment": len(failed_judged),
            "false_approval_rate_among_failed_runs":
                sum(r["verifier_approved"] for r in failed_judged) / len(failed_judged)
                if failed_judged else None,
        })
    return summaries


def upload_records(records: list[dict], client, session_id: str, attribute_context=None) -> list[str]:
    """Import metadata and scores only. No agent text, file contents, or tool arguments."""
    if attribute_context is None:
        from langfuse import propagate_attributes
        attribute_context = propagate_attributes
    urls = []
    try:
        for record in records:
            metadata = {k: record[k] for k in ("task_id", "condition", "run_id", "seed", "model")}
            metadata.update({"source": "TeamBench", "imported": True,
                             "timing": "import time, not original execution time"})
            with attribute_context(
                session_id=session_id, tags=["teambench", record["condition"]],
            ), client.start_as_current_observation(
                name="teambench-evaluation", as_type="span", metadata=metadata,
            ) as trace:
                for role in record["roles"]:
                    with client.start_as_current_observation(
                        name=role["phase"], as_type="span", metadata=role,
                    ) as role_span:
                        role_span.update(output={"turn_count": role["turn_count"],
                                                 "tool_call_count": role["tool_call_count"]})
                trace.update(output={"infrastructure_error": record["infrastructure_error"],
                                     "grader_available": record["grader_available"],
                                     "scores": scores_for(record)})
                for name, value in scores_for(record).items():
                    trace.score_trace(name=name, value=value, data_type="NUMERIC")
                url = client.get_trace_url()
                if url:
                    urls.append(url)
    finally:
        client.flush()
    return urls


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", required=True, type=Path,
                        help="Aggregate JSON from python -m harness.ablation")
    parser.add_argument("--teambench-root", required=True, type=Path,
                        help="Root used when running TeamBench, for resolving run_dir paths")
    parser.add_argument("--session-id", default="teambench-example")
    parser.add_argument("--upload", action="store_true", help="Send metadata and scores to Langfuse")
    args = parser.parse_args()
    records = load_records(args.results, args.teambench_root)
    print(json.dumps(summarize(records), indent=2))
    if args.upload:
        from langfuse import get_client
        import os
        if not os.environ.get("LANGFUSE_PUBLIC_KEY") or not os.environ.get("LANGFUSE_SECRET_KEY"):
            parser.error("Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY before uploading")
        client = get_client()
        for url in upload_records(records, client, args.session_id):
            print(url)


if __name__ == "__main__":
    main()
