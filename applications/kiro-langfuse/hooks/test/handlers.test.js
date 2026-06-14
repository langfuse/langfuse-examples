import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeHookHandler } from "../lib/handlers.js";
import { createMockTrace } from "./helpers.js";

describe("handlers.js", () => {
  describe("routeHookHandler", () => {
    it("should handle all known hook types without error", () => {
      const hookTypes = [
        "prompt_submit",
        "agent_stop",
        "pre_tool_use",
        "post_tool_use",
        "file_create",
        "file_save",
        "file_delete",
        "pre_task_execution",
        "post_task_execution",
        "manual",
      ];

      for (const hookType of hookTypes) {
        const trace = createMockTrace();
        const input = {
          hook_event_name: hookType,
          prompt: "test prompt",
          model: "test-model",
          tool_name: "test-tool",
          file_path: "/test/file.js",
          task_name: "test-task",
          status: "completed",
        };

        const result = routeHookHandler(hookType, trace, input);
        assert.equal(result, null, `${hookType} should return null`);
      }
    });

    it("should return null for unknown hook type", () => {
      const trace = createMockTrace();
      const result = routeHookHandler("nonexistent_hook", trace, {});
      assert.equal(result, null);
    });
  });

  describe("handlePromptSubmit", () => {
    it("should create generation with prompt and model", () => {
      const trace = createMockTrace();
      routeHookHandler("prompt_submit", trace, {
        hook_event_name: "prompt_submit",
        prompt: "Create a REST API",
        model: "claude-sonnet",
      });

      assert.equal(trace._calls.updates.length, 1);
      assert.equal(trace._calls.updates[0].input, "Create a REST API");
      assert.equal(trace._calls.generations.length, 1);
      assert.equal(trace._calls.generations[0].model, "claude-sonnet");
      assert.equal(trace._calls.generations[0].input, "Create a REST API");
    });

    it("should truncate long prompt in trace name", () => {
      const trace = createMockTrace();
      const longPrompt = "A".repeat(200);
      routeHookHandler("prompt_submit", trace, {
        hook_event_name: "prompt_submit",
        prompt: longPrompt,
      });

      assert.ok(trace._calls.updates[0].name.length <= 100);
    });
  });

  describe("handleAgentStop", () => {
    it("should record completion with score 1.0", () => {
      const trace = createMockTrace();
      routeHookHandler("agent_stop", trace, {
        hook_event_name: "agent_stop",
        status: "completed",
      });

      assert.equal(trace._calls.events.length, 1);
      assert.equal(trace._calls.events[0].name, "Agent Stopped");
      assert.equal(trace._calls.events[0].level, "DEFAULT");
      assert.equal(trace._calls.scores.length, 1);
      assert.equal(trace._calls.scores[0].value, 1);
    });

    it("should record abort with score 0.5 and WARNING", () => {
      const trace = createMockTrace();
      routeHookHandler("agent_stop", trace, {
        hook_event_name: "agent_stop",
        status: "aborted",
      });

      assert.equal(trace._calls.events[0].level, "WARNING");
      assert.equal(trace._calls.scores[0].value, 0.5);
    });

    it("should record error with score 0 and ERROR", () => {
      const trace = createMockTrace();
      routeHookHandler("agent_stop", trace, {
        hook_event_name: "agent_stop",
        status: "error",
      });

      assert.equal(trace._calls.events[0].level, "ERROR");
      assert.equal(trace._calls.scores[0].value, 0);
    });
  });

  describe("handlePreToolUse / handlePostToolUse", () => {
    it("should create span with tool name for pre_tool_use", () => {
      const trace = createMockTrace();
      routeHookHandler("pre_tool_use", trace, {
        hook_event_name: "pre_tool_use",
        tool_name: "WriteFile",
        tool_input: { path: "/src/app.js" },
      });

      assert.equal(trace._calls.spans.length, 1);
      assert.equal(trace._calls.spans[0].name, "Tool: WriteFile");
      assert.deepEqual(trace._calls.spans[0].input.tool_name, "WriteFile");
    });

    it("should create span with result and duration for post_tool_use", () => {
      const trace = createMockTrace();
      routeHookHandler("post_tool_use", trace, {
        hook_event_name: "post_tool_use",
        tool_name: "Shell",
        tool_input: { command: "npm test" },
        result: "All tests passed",
        duration: 3500,
      });

      assert.equal(trace._calls.spans[0].name, "Tool Result: Shell");
      assert.equal(trace._calls.spans[0].output, "All tests passed");
      assert.equal(trace._calls.spans[0].metadata.duration_ms, 3500);
      assert.equal(trace._calls.spans[0].metadata.duration_formatted, "3.5s");
    });

    it("should default tool_name to 'unknown-tool'", () => {
      const trace = createMockTrace();
      routeHookHandler("pre_tool_use", trace, { hook_event_name: "pre_tool_use" });
      assert.equal(trace._calls.spans[0].name, "Tool: unknown-tool");
    });
  });

  describe("handleFileCreate / handleFileSave / handleFileDelete", () => {
    it("should create span with file name for file_create", () => {
      const trace = createMockTrace();
      routeHookHandler("file_create", trace, {
        hook_event_name: "file_create",
        file_path: "/src/components/Button.tsx",
      });

      assert.equal(trace._calls.spans[0].name, "Create: Button.tsx");
      assert.equal(trace._calls.spans[0].metadata.file_extension, "tsx");
    });

    it("should create span for file_save", () => {
      const trace = createMockTrace();
      routeHookHandler("file_save", trace, {
        hook_event_name: "file_save",
        file_path: "/src/index.js",
      });

      assert.equal(trace._calls.spans[0].name, "Save: index.js");
    });

    it("should create WARNING-level span for file_delete", () => {
      const trace = createMockTrace();
      routeHookHandler("file_delete", trace, {
        hook_event_name: "file_delete",
        file_path: "/src/old-utils.js",
      });

      assert.equal(trace._calls.spans[0].name, "Delete: old-utils.js");
      assert.equal(trace._calls.spans[0].level, "WARNING");
    });

    it("should handle missing file_path gracefully", () => {
      const trace = createMockTrace();
      routeHookHandler("file_create", trace, { hook_event_name: "file_create" });
      assert.equal(trace._calls.spans[0].name, "Create: unknown");
    });
  });

  describe("handlePreTaskExecution / handlePostTaskExecution", () => {
    it("should create span for task start", () => {
      const trace = createMockTrace();
      routeHookHandler("pre_task_execution", trace, {
        hook_event_name: "pre_task_execution",
        task_name: "implement-auth",
      });

      assert.equal(trace._calls.spans[0].name, "Task Start: implement-auth");
      assert.equal(trace._calls.spans[0].metadata.task_status, "in_progress");
    });

    it("should create span for task completion with duration", () => {
      const trace = createMockTrace();
      routeHookHandler("post_task_execution", trace, {
        hook_event_name: "post_task_execution",
        task_name: "implement-auth",
        result: "Auth module created",
        duration: 45000,
      });

      assert.equal(trace._calls.spans[0].name, "Task Done: implement-auth");
      assert.equal(trace._calls.spans[0].output, "Auth module created");
      assert.equal(trace._calls.spans[0].metadata.duration_formatted, "45.0s");
    });
  });

  describe("handleManual", () => {
    it("should create event for manual trigger", () => {
      const trace = createMockTrace();
      routeHookHandler("manual", trace, {
        hook_event_name: "manual",
        reason: "debugging",
      });

      assert.equal(trace._calls.events[0].name, "Manual Hook Triggered");
      assert.equal(trace._calls.events[0].metadata.trigger_reason, "debugging");
    });

    it("should default reason to 'on-demand'", () => {
      const trace = createMockTrace();
      routeHookHandler("manual", trace, { hook_event_name: "manual" });
      assert.equal(trace._calls.events[0].metadata.trigger_reason, "on-demand");
    });
  });
});
