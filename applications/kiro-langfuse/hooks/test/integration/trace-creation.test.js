/**
 * Integration tests — trace creation and session grouping.
 *
 * Verifies that traces are created with the correct metadata
 * and that workspace-based session grouping works.
 *
 * Prerequisites:
 *   docker compose -f docker-compose.test.yml up --wait
 *
 * Run:
 *   npm run test:integration
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { fetchTrace, uniqueTraceId } from "./setup.js";
import { SKIP, setupLangfuse, teardownLangfuse } from "./harness.js";
import { getOrCreateTrace, flushLangfuse } from "../../lib/langfuse-client.js";

describe("Trace creation", { skip: SKIP }, () => {
  before(setupLangfuse);
  after(teardownLangfuse);

  it("should create a trace that is queryable via the API", async () => {
    const traceId = uniqueTraceId("basic");

    const input = {
      conversation_id: traceId,
      hook_event_name: "prompt_submit",
      prompt: "Integration test — basic trace creation",
      model: "test-model",
      workspace_roots: ["/test/workspace"],
      user_email: "test@kiro-langfuse.dev",
    };

    getOrCreateTrace(input);
    await flushLangfuse();

    const trace = await fetchTrace(traceId);

    assert.equal(trace.id, traceId, "Trace ID should match");
    assert.ok(trace.name, "Trace should have a name");
    assert.equal(trace.sessionId, "kiro-workspace", "Session ID derived from workspace");
    assert.equal(trace.userId, "test@kiro-langfuse.dev", "User ID should be set");
  });

  it("should group traces by workspace into the same session", async () => {
    const traceId1 = uniqueTraceId("sess1");
    const traceId2 = uniqueTraceId("sess2");
    const sharedWorkspace = ["/test/shared-project"];

    getOrCreateTrace({
      conversation_id: traceId1,
      hook_event_name: "prompt_submit",
      prompt: "First conversation",
      model: "claude-sonnet",
      workspace_roots: sharedWorkspace,
    });

    getOrCreateTrace({
      conversation_id: traceId2,
      hook_event_name: "prompt_submit",
      prompt: "Second conversation",
      model: "claude-sonnet",
      workspace_roots: sharedWorkspace,
    });

    await flushLangfuse();

    const trace1 = await fetchTrace(traceId1);
    const trace2 = await fetchTrace(traceId2);

    assert.equal(
      trace1.sessionId,
      trace2.sessionId,
      "Both traces should share the same sessionId"
    );
    assert.equal(trace1.sessionId, "kiro-shared-project");
  });
});
