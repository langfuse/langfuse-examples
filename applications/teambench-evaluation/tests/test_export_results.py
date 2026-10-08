"""Synthetic importer tests. These fixtures are not TeamBench experimental results."""
import json
from pathlib import Path
import tempfile
import unittest
import sys
from contextlib import nullcontext

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from export_results import load_records, scores_for, summarize, upload_records


class Observation:
    def __init__(self, client): self.client = client
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def update(self, **kwargs): self.client.outputs.append(kwargs)
    def update_trace(self, **kwargs): self.client.attributes.append(kwargs)
    def score_trace(self, **kwargs): self.client.scores.append(kwargs)


class Client:
    def __init__(self):
        self.scores, self.outputs, self.attributes, self.observations = [], [], [], []
        self.flushed = False
    def start_as_current_observation(self, **kwargs):
        self.observations.append(kwargs)
        return Observation(self)
    def get_trace_url(self): return "https://example.com/trace"
    def flush(self): self.flushed = True


class ImporterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.results = self.root / "results.json"
        self.row = {"task_id": "fixture-task", "condition": "full", "run_id": "fixture-run",
                    "seed": 0, "run_dir": "runs/fixture", "pass": False,
                    "partial_score": 0.5, "error": None, "failure_modes": []}
    def write(self, verdict=None, stub=False):
        self.results.write_text(json.dumps({"model": "fixture-model", "runs": [self.row]}))
        if verdict:
            path = self.root / self.row["run_dir"] / "submission" / "attestation.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({"verdict": verdict,
                                        "condition": "team_no_verify_stub" if stub else "full",
                                        "note": "MUST_NOT_UPLOAD"}))
        return load_records(self.results, self.root)[0]
    def test_false_approval_denominator(self):
        record = self.write("pass")
        self.assertEqual(scores_for(record)["false_approval"], 1)
        self.assertEqual(summarize([record])[0]["false_approval_rate_among_failed_runs"], 1)
    def test_missing_judgment_stays_unknown(self):
        record = self.write()
        self.assertNotIn("verifier_approved", scores_for(record))
        self.assertIsNone(summarize([record])[0]["false_approval_rate_among_failed_runs"])
    def test_no_verifier_stub_and_self_attestations(self):
        for condition in ["team_no_verify", "oracle", "restricted", "topo_self_check"]:
            self.row["condition"] = condition
            self.assertNotIn("verifier_approved", scores_for(self.write("pass")))
        self.row["condition"] = "full"
        self.assertNotIn("verifier_approved", scores_for(self.write("pass", stub=True)))
    def test_infrastructure_error_and_missing_grader_excluded(self):
        self.row["error"] = "provider unavailable"
        self.assertEqual(scores_for(self.write("pass")), {})
        self.row["error"] = None
        self.row["failure_modes"] = ["grader_no_score"]
        self.assertEqual(scores_for(self.write("pass")), {})
        self.assertEqual(summarize([self.write()])[0]["scored_runs"], 0)
    def test_booleans_and_finite_partial_scores(self):
        self.row["pass"] = "false"
        with self.assertRaises(ValueError): self.write()
        self.row["pass"] = False
        self.row["partial_score"] = float("nan")
        with self.assertRaises(ValueError): self.write()
    def test_run_path_cannot_escape_root(self):
        self.row["run_dir"] = "../outside"
        with self.assertRaises(ValueError): self.write()
    def test_role_upload_excludes_content(self):
        path = self.root / "runs/fixture/logs/verifier/attempt_0/turn_000.json"
        path.parent.mkdir(parents=True)
        path.write_text(json.dumps({"role": "verifier", "text": "MUST_NOT_UPLOAD",
                                    "tool_calls": [{"name": "read", "args": "MUST_NOT_UPLOAD"}]}))
        record = self.write("pass")
        client = Client()
        self.assertEqual(len(upload_records([record], client, "fixture-session",
                                            attribute_context=lambda **kwargs: nullcontext())), 1)
        self.assertTrue(client.flushed)
        self.assertNotIn("MUST_NOT_UPLOAD", repr(vars(client)))
        self.assertEqual(client.observations[1]["metadata"]["role"], "verifier")
        self.assertEqual(len(client.scores), 4)


if __name__ == "__main__": unittest.main()
