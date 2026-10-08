"""Exercise the installed Langfuse SDK with an in-memory exporter and mock HTTP."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from export_results import upload_records


@unittest.skipUnless(importlib.util.find_spec("langfuse"), "Install requirements.txt for the SDK check")
class SDKTests(unittest.TestCase):
    def test_spans_scores_and_session(self):
        import httpx
        from langfuse import Langfuse
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.sampling import ALWAYS_ON
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

        requests = []

        def respond(request):
            requests.append({"path": request.url.path, "body": json.loads(request.content)})
            return httpx.Response(200, json={"successes": [], "errors": []})

        environment = {k: "" for k in os.environ if k.upper().endswith("_PROXY")}
        environment["OTEL_SDK_DISABLED"] = "false"
        with patch.dict(os.environ, environment):
            exporter = InMemorySpanExporter()
            client = Langfuse(
                public_key="pk-lf-sdk-fixture", secret_key="sk-lf-sdk-fixture",
                tracing_enabled=True, sample_rate=1.0,
                httpx_client=httpx.Client(transport=httpx.MockTransport(respond)),
                tracer_provider=TracerProvider(sampler=ALWAYS_ON), span_exporter=exporter,
            )
            self.addCleanup(client.shutdown)
            record = {
                "task_id": "fixture-task", "condition": "full", "run_id": "fixture-run",
                "seed": 0, "model": "fixture-model", "passed": False, "partial_score": 0.5,
                "infrastructure_error": False, "grader_available": True,
                "verifier_approved": True,
                "roles": [{"role": "verifier", "phase": "verifier/attempt_0",
                           "turn_count": 1, "tool_call_count": 1}],
            }
            with patch.object(client, "_get_project_id", return_value="fixture-project"):
                urls = upload_records([record], client, "fixture-session")
            spans = exporter.get_finished_spans()
            self.assertEqual(len(spans), 2)
            root = next(s for s in spans if s.name == "teambench-evaluation")
            child = next(s for s in spans if s.name == "verifier/attempt_0")
            self.assertEqual(child.parent.span_id, root.context.span_id)
            self.assertIn("fixture-session", root.attributes.values())
            self.assertEqual(len(urls), 1)
            self.assertTrue(all(r["path"] == "/api/public/ingestion" for r in requests))
            scores = [e["body"] for r in requests for e in r["body"].get("batch", [])
                      if e.get("type") == "score-create"]
            self.assertEqual(len(scores), 4)
            self.assertEqual(next(s for s in scores if s["name"] == "false_approval")["value"], 1)


if __name__ == "__main__":
    unittest.main()
