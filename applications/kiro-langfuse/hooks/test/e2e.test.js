import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeHookHandler } from "../lib/handlers.js";
import { createMockTrace } from "./helpers.js";

describe("E2E: simulated Kiro hook flow", () => {
  it("should handle a full Todo App development session", () => {
    const sessionEvents = [
      {
        hook: "prompt_submit",
        input: {
          hook_event_name: "prompt_submit",
          prompt: "Create a todo app with add, complete, and delete functionality",
          model: "claude-sonnet",
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "pre_tool_use",
        input: {
          hook_event_name: "pre_tool_use",
          tool_name: "read",
          tool_input: { path: "/projects/todo-app/package.json" },
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "post_tool_use",
        input: {
          hook_event_name: "post_tool_use",
          tool_name: "read",
          result: '{"name": "todo-app"}',
          duration: 15,
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "file_create",
        input: {
          hook_event_name: "file_create",
          file_path: "/projects/todo-app/src/TodoApp.tsx",
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "file_save",
        input: {
          hook_event_name: "file_save",
          file_path: "/projects/todo-app/src/TodoApp.tsx",
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "file_create",
        input: {
          hook_event_name: "file_create",
          file_path: "/projects/todo-app/src/TodoApp.test.ts",
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "pre_tool_use",
        input: {
          hook_event_name: "pre_tool_use",
          tool_name: "shell",
          tool_input: { command: "npm test" },
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "post_tool_use",
        input: {
          hook_event_name: "post_tool_use",
          tool_name: "shell",
          result: "Tests: 5 passed, 5 total",
          duration: 4200,
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "file_delete",
        input: {
          hook_event_name: "file_delete",
          file_path: "/projects/todo-app/src/old-utils.js",
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
      {
        hook: "agent_stop",
        input: {
          hook_event_name: "agent_stop",
          status: "completed",
          conversation_id: "e2e-test-001",
          workspace_roots: ["/projects/todo-app"],
        },
      },
    ];

    const trace = createMockTrace();

    for (const event of sessionEvents) {
      assert.doesNotThrow(() => {
        routeHookHandler(event.hook, trace, event.input);
      }, `Failed on event: ${event.hook}`);
    }

    assert.equal(trace._calls.generations.length, 1, "Should have 1 generation (prompt)");
    // pre_tool(read) + post_tool(read) + file_create(TodoApp.tsx) + file_save(TodoApp.tsx) +
    // file_create(test) + pre_tool(shell) + post_tool(shell) + file_delete = 8
    assert.equal(trace._calls.spans.length, 8, "Should have 8 spans total");
    assert.equal(trace._calls.events.length, 1, "Should have 1 event (agent_stop)");
    assert.equal(trace._calls.scores.length, 1, "Should have 1 score");
    assert.equal(trace._calls.scores[0].value, 1, "Completion score should be 1.0");
  });

  it("should handle error scenario gracefully", () => {
    const trace = createMockTrace();

    routeHookHandler("prompt_submit", trace, {
      hook_event_name: "prompt_submit",
      prompt: "deploy to production",
      conversation_id: "e2e-error-001",
    });

    routeHookHandler("agent_stop", trace, {
      hook_event_name: "agent_stop",
      status: "error",
      conversation_id: "e2e-error-001",
    });

    assert.equal(trace._calls.scores[0].value, 0);
    assert.equal(trace._calls.events[0].level, "ERROR");
  });
});
