/**
 * Integration tests — scoring and completion status.
 *
 * Verifies that completion scores (success, error, aborted)
 * and custom scores are persisted correctly in Langfuse.
 *
 * Prerequisites:
 *   docker compose -f docker-compose.test.yml up --wait
 *
 * Run:
 *   npm run test:integration
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { fetchScores, uniqueTraceId } from "./setup.js";
import { SKIP, setupLangfuse, teardownLangfuse } from "./harness.js";
import {
  getOrCreateTrace,
  addScore,
  flushLangfuse,
} from "../../lib/langfuse-client.js";
import { routeHookHandler } from "../../lib/handlers.js";

describe("Scoring", { skip: SKIP }, () => {
  before(setupLangfuse);
  after(teardownLangfuse);

  it("should record error score as 0 when agent errors", async () => {
    const traceId = uniqueTraceId("error");

    const input = {
      conversation_id: traceId,
      hook_event_name: "prompt_submit",
      prompt: "Deploy to production",
      model: "claude-sonnet",
      workspace_roots: ["/test/deploy"],
    };

    const trace = getOrCreateTrace(input);

    routeHookHandler("prompt_submit", trace, input);
    routeHookHandler("agent_stop", trace, {
      ...input,
      hook_event_name: "agent_stop",
      status: "error",
    });

    await flushLangfuse();

    const scores = await fetchScores(traceId);
    const completionScore = scores.find((s) => s.name === "completion_status");
    assert.ok(completionScore, "Should have completion score");
    assert.equal(completionScore.value, 0, "Error status should score 0");
  });

  it("should record aborted score as 0.5", async () => {
    const traceId = uniqueTraceId("abort");

    const input = {
      conversation_id: traceId,
      hook_event_name: "prompt_submit",
      prompt: "Refactor the auth module",
      model: "claude-sonnet",
      workspace_roots: ["/test/auth"],
    };

    const trace = getOrCreateTrace(input);

    routeHookHandler("prompt_submit", trace, input);
    routeHookHandler("agent_stop", trace, {
      ...input,
      hook_event_name: "agent_stop",
      status: "aborted",
    });

    await flushLangfuse();

    const scores = await fetchScores(traceId);
    const completionScore = scores.find((s) => s.name === "completion_status");
    assert.ok(completionScore, "Should have completion score");
    assert.equal(completionScore.value, 0.5, "Aborted status should score 0.5");
  });

  it("should persist custom scores via addScore()", async () => {
    const traceId = uniqueTraceId("custom-score");

    const trace = getOrCreateTrace({
      conversation_id: traceId,
      hook_event_name: "manual",
      prompt: "Custom score test",
      model: "test-model",
      workspace_roots: ["/test/scores"],
    });

    addScore(trace, "code_quality", 0.85, "Good but could use more tests");
    await flushLangfuse();

    const scores = await fetchScores(traceId);
    const qualityScore = scores.find((s) => s.name === "code_quality");
    assert.ok(qualityScore, "Should have code_quality score");
    assert.equal(qualityScore.value, 0.85);
  });
});
