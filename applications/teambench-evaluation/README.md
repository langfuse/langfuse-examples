# TeamBench evaluation in Langfuse

Compare an agent verifier's approval with the deterministic task grader, and inspect which roles ran in each ablation condition.

[TeamBench](https://github.com/ybkim95/TeamBench) evaluates agent coordination with separate Planner, Executor, and Verifier permissions. This example imports completed runs into Langfuse. It does not change the harness or require another model call.

## Run locally

Python 3.10 or newer is required. The local summary does not need Langfuse credentials or the SDK.

From your TeamBench checkout, generate results using the existing harness. Real agent runs need Docker and the model provider credentials described in the [TeamBench README](https://github.com/ybkim95/TeamBench#install).

```bash
python -m harness.ablation \
  --model gemini-3-flash-preview \
  --tasks DIST1_queue_race \
  --seeds 0 \
  --conditions full team_no_plan team_no_verify \
  --output shared/ablation_results/langfuse_example.json
```

From this example directory, inspect the results without sending anything.

```bash
python export_results.py \
  --results /path/to/TeamBench/shared/ablation_results/langfuse_example.json \
  --teambench-root /path/to/TeamBench
```

The `--teambench-root` is the working directory used for the original harness command. Relative `run_dir` values resolve against it. Keep the corresponding run directories to include verifier attestations and role summaries. Aggregate results alone still support deterministic scores, but missing attestations stay unknown rather than counting as rejections.

## Import into Langfuse

Install the SDK and set the credentials for your own project.

```bash
pip install -r requirements.txt
export LANGFUSE_PUBLIC_KEY=your_public_key
export LANGFUSE_SECRET_KEY=your_secret_key
export LANGFUSE_BASE_URL=https://cloud.langfuse.com

python export_results.py \
  --results /path/to/TeamBench/shared/ablation_results/langfuse_example.json \
  --teambench-root /path/to/TeamBench \
  --session-id teambench-first-comparison \
  --upload
```

Use `https://us.cloud.langfuse.com` for the US region or your self-hosted URL. Each invocation creates new traces, so avoid uploading the same file repeatedly.

## Inspect the disagreement

Each run becomes one trace tagged with its condition. Observed role phases become child spans with turn and tool call counts. Filter traces by `condition`, `task_id`, `seed`, or `model` to compare runs. This importer records import time, not original execution latency or token cost.

| Score | Meaning |
| --- | --- |
| `deterministic_success` | The harness task grader passed the submission |
| `deterministic_partial_score` | Partial credit reported by the harness, when available |
| `verifier_approved` | An independent verifier's final saved attestation says pass |
| `false_approval` | The verifier approved a submission that failed the task grader |

Filter for `false_approval = 1` to inspect approved submissions that failed grading. The local summary also reports the number of failed runs with observed verifier judgments and the fraction of those runs that were approved. This denominator differs from the fraction of all approvals that failed.

The `team_no_verify` harness condition writes a passing stub attestation. This example excludes that stub, and it does not label an Oracle or Restricted agent's self-attestation as an independent verifier judgment. Runs with provider errors or no grader score remain visible but are excluded from scoring and the summary's rates.

The example uploads task identifiers, condition, seed, model, run identifier, role counts, and numeric scores. It does not upload agent messages, tool arguments, tool output, workspace files, or attestation notes. The final saved attestation is compared with the final task grade, so intermediate verifier decisions before remediation are outside its scope.

## Check the importer

```bash
python -m unittest discover -s tests -v
```

Tests use temporary synthetic fixtures for disagreement, missing judgments, stub attestations, and unavailable grader output. They are not benchmark measurements. With the SDK installed, an additional test checks real SDK spans, session propagation, and scores using mock HTTP and an in-memory exporter. Without the SDK, that test is skipped.

## References

[TeamBench paper](https://arxiv.org/abs/2605.07073) and [source code](https://github.com/ybkim95/TeamBench)

[Langfuse Python instrumentation](https://langfuse.com/docs/observability/sdk/instrumentation) and [custom scores](https://langfuse.com/docs/evaluation/evaluation-methods/custom-scores)
