/**
 * Integration tests — hook event flows.
 *
 * Verifies that full hook sequences (prompt → tools → files → agent stop),
 * task execution hooks, and manual hooks all produce the correct
 * observations in Langfuse.
 *
 * Prerequisites:
 *   docker compose -f docker-compose.test.yml up --wait
 *
 * Run:
 *   npm run test:integration
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { fetchTrace, fetchObservations, fetchScores, uniqueTraceId } from "./setup.js";
import { SKIP, setupLangfuse, teardownLangfuse } from "./harness.js";
import { getOrCreateTrace, flushLangfuse } from "../../lib/langfuse-client.js";
import { routeHookHandler } from "../../lib/handlers.js";

describe("Hook event flows", { skip: SKIP }, () => {
  before(setupLangfuse);
  after(teardownLangfuse);

  it("should record a full hook session with observations", async () => {
    const traceId = uniqueTraceId("flow");

    const baseInput = {
      conversation_id: traceId,
      workspace_roots: ["/test/todo-app"],
      model: "claude-sonnet",
    };

    const trace = getOrCreateTrace({
      ...baseInput,
      hook_event_name: "prompt_submit",
      prompt: "Build a todo app",
    });

    const events = [
      {
        hook: "prompt_submit",
        extra: { prompt: "Build a todo app" },
      },
      {
        hook: "pre_tool_use",
        extra: { tool_name: "read", tool_input: { path: "package.json" } },
      },
      {
        hook: "post_tool_use",
        extra: { tool_name: "read", result: '{"name":"todo"}', duration: 25 },
      },
      {
        hook: "file_create",
        extra: { file_path: "/test/todo-app/src/App.tsx" },
      },
      {
        hook: "file_save",
        extra: { file_path: "/test/todo-app/src/App.tsx" },
      },
      {
        hook: "pre_tool_use",
        extra: { tool_name: "shell", tool_input: { command: "npm test" } },
      },
      {
        hook: "post_tool_use",
        extra: { tool_name: "shell", result: "3 passed", duration: 3200 },
      },
      {
        hook: "file_delete",
        extra: { file_path: "/test/todo-app/old-utils.js" },
      },
      {
        hook: "agent_stop",
        extra: { status: "completed" },
      },
    ];

    for (const evt of events) {
      routeHookHandler(evt.hook, trace, {
        ...baseInput,
        hook_event_name: evt.hook,
        ...evt.extra,
      });
    }

    await flushLangfuse();

    const fetchedTrace = await fetchTrace(traceId);
    assert.equal(fetchedTrace.id, traceId);

    const observations = await fetchObservations(traceId);
    assert.ok(observations.length > 0, "Should have observations");

    const types = observations.map((o) => o.type);
    assert.ok(types.includes("GENERATION"), "Should have a generation (prompt_submit)");
    assert.ok(types.includes("SPAN"), "Should have spans (tool use, file ops)");
    assert.ok(types.includes("EVENT"), "Should have an event (agent_stop)");

    const scores = await fetchScores(traceId);
    assert.ok(scores.length > 0, "Should have at least one score");

    const completionScore = scores.find((s) => s.name === "completion_status");
    assert.ok(completionScore, "Should have a completion_status score");
    assert.equal(completionScore.value, 1, "Completed status should score 1.0");
  });

  it("should record pre/post task execution as spans", async () => {
    const traceId = uniqueTraceId("task");

    const input = {
      conversation_id: traceId,
      hook_event_name: "pre_task_execution",
      model: "claude-sonnet",
      workspace_roots: ["/test/tasks"],
      task_name: "implement-auth",
    };

    const trace = getOrCreateTrace(input);

    routeHookHandler("pre_task_execution", trace, input);
    routeHookHandler("post_task_execution", trace, {
      ...input,
      hook_event_name: "post_task_execution",
      result: "Auth module implemented",
      duration: 15000,
    });

    await flushLangfuse();

    const observations = await fetchObservations(traceId);
    const spans = observations.filter((o) => o.type === "SPAN");
    assert.ok(spans.length >= 2, "Should have at least 2 spans (pre + post task)");

    const taskStart = spans.find((s) => s.name.includes("Task Start"));
    const taskDone = spans.find((s) => s.name.includes("Task Done"));
    assert.ok(taskStart, "Should have a Task Start span");
    assert.ok(taskDone, "Should have a Task Done span");
  });

  it("should record manual hook as an event", async () => {
    const traceId = uniqueTraceId("manual");

    const input = {
      conversation_id: traceId,
      hook_event_name: "manual",
      model: "claude-sonnet",
      workspace_roots: ["/test/manual"],
      reason: "user-triggered-debug",
    };

    const trace = getOrCreateTrace(input);
    routeHookHandler("manual", trace, input);
    await flushLangfuse();

    const observations = await fetchObservations(traceId);
    const events = observations.filter((o) => o.type === "EVENT");
    assert.ok(events.length >= 1, "Should have at least 1 event");
    assert.ok(
      events.some((e) => e.name === "Manual Hook Triggered"),
      "Should have Manual Hook Triggered event"
    );
  });
});
