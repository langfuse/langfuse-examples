import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildInputFromEnv,
  generateTraceName,
  generateSessionId,
  generateTags,
  getFileExtension,
  formatDuration,
  determineLevel,
} from "../lib/utils.js";

describe("utils.js", () => {
  describe("buildInputFromEnv", () => {
    beforeEach(() => {
      delete process.env.KIRO_HOOK_EVENT;
      delete process.env.USER_PROMPT;
      delete process.env.KIRO_CONVERSATION_ID;
      delete process.env.KIRO_WORKSPACE_ROOT;
      delete process.env.KIRO_MODEL;
      delete process.env.KIRO_TOOL_NAME;
      delete process.env.KIRO_FILE_PATH;
      delete process.env.KIRO_USER_EMAIL;
    });

    it("should use env vars when set", () => {
      process.env.KIRO_HOOK_EVENT = "prompt_submit";
      process.env.USER_PROMPT = "build a todo app";
      process.env.KIRO_CONVERSATION_ID = "conv-123";
      process.env.KIRO_WORKSPACE_ROOT = "/projects/myapp";
      process.env.KIRO_MODEL = "claude-sonnet";
      process.env.KIRO_TOOL_NAME = "write";
      process.env.KIRO_FILE_PATH = "/src/app.js";
      process.env.KIRO_USER_EMAIL = "dev@example.com";

      const result = buildInputFromEnv({});

      assert.equal(result.hook_event_name, "prompt_submit");
      assert.equal(result.prompt, "build a todo app");
      assert.equal(result.conversation_id, "conv-123");
      assert.deepEqual(result.workspace_roots, ["/projects/myapp"]);
      assert.equal(result.model, "claude-sonnet");
      assert.equal(result.tool_name, "write");
      assert.equal(result.file_path, "/src/app.js");
      assert.equal(result.user_email, "dev@example.com");
    });

    it("should fall back to stdin data when env vars missing", () => {
      const stdinData = {
        hook_event_name: "file_save",
        prompt: "refactor code",
        conversation_id: "conv-456",
        workspace_roots: ["/other/project"],
        model: "gpt-4",
        tool_name: "shell",
        file_path: "/src/main.ts",
        user_email: "other@example.com",
      };

      const result = buildInputFromEnv(stdinData);

      assert.equal(result.hook_event_name, "file_save");
      assert.equal(result.prompt, "refactor code");
      assert.equal(result.conversation_id, "conv-456");
      assert.deepEqual(result.workspace_roots, ["/other/project"]);
      assert.equal(result.model, "gpt-4");
    });

    it("should prefer env vars over stdin data", () => {
      process.env.KIRO_HOOK_EVENT = "agent_stop";
      const stdinData = { hook_event_name: "prompt_submit" };

      const result = buildInputFromEnv(stdinData);
      assert.equal(result.hook_event_name, "agent_stop");
    });

    it("should generate conversation_id when none provided", () => {
      const result = buildInputFromEnv({});
      assert.ok(result.conversation_id.startsWith("kiro-"));
    });

    it("should default hook_event_name to 'unknown'", () => {
      const result = buildInputFromEnv({});
      assert.equal(result.hook_event_name, "unknown");
    });

    it("should default model to 'kiro-agent'", () => {
      const result = buildInputFromEnv({});
      assert.equal(result.model, "kiro-agent");
    });

    it("should use cwd as workspace_roots fallback", () => {
      const result = buildInputFromEnv({});
      assert.deepEqual(result.workspace_roots, [process.cwd()]);
    });
  });

  describe("generateTraceName", () => {
    it("should return model-based name when no prompt", () => {
      assert.equal(generateTraceName(null, "claude-sonnet"), "Kiro claude-sonnet");
    });

    it("should return generic name when no prompt or model", () => {
      assert.equal(generateTraceName(null, null), "Kiro Agent");
    });

    it("should return short prompts as-is", () => {
      assert.equal(generateTraceName("fix the bug", "claude"), "fix the bug");
    });

    it("should truncate long prompts at word boundary", () => {
      const longPrompt =
        "Please refactor the authentication module to use JWT tokens instead of session cookies for better scalability";
      const name = generateTraceName(longPrompt, "claude");
      assert.ok(name.length <= 53); // 50 + "..."
      assert.ok(name.endsWith("..."));
    });

    it("should collapse whitespace and newlines", () => {
      const name = generateTraceName("fix\n  the\n  bug", "claude");
      assert.equal(name, "fix the bug");
    });
  });

  describe("generateSessionId", () => {
    it("should use folder name from workspace root", () => {
      assert.equal(generateSessionId(["/home/user/myproject"]), "kiro-myproject");
    });

    it("should use first root when multiple provided", () => {
      assert.equal(
        generateSessionId(["/home/user/primary", "/home/user/secondary"]),
        "kiro-primary"
      );
    });

    it("should return default when no roots", () => {
      assert.equal(generateSessionId([]), "kiro-default-session");
      assert.equal(generateSessionId(null), "kiro-default-session");
    });
  });

  describe("generateTags", () => {
    it("should always include 'kiro' tag", () => {
      const tags = generateTags("prompt_submit", {});
      assert.ok(tags.includes("kiro"));
    });

    it("should add model tag", () => {
      const tags = generateTags("prompt_submit", { model: "Claude Sonnet 4" });
      assert.ok(tags.includes("claude-sonnet-4"));
    });

    it("should sanitize model name for tag", () => {
      const tags = generateTags("prompt_submit", { model: "GPT-4o (Preview)" });
      const modelTag = tags.find((t) => t !== "kiro" && t !== "prompt");
      assert.ok(modelTag);
      assert.ok(!modelTag.includes("("));
      assert.ok(!modelTag.includes(")"));
    });

    it("should add correct tags for each hook type", () => {
      assert.ok(generateTags("prompt_submit", {}).includes("prompt"));
      assert.ok(generateTags("agent_stop", {}).includes("agent-stop"));
      assert.ok(generateTags("pre_tool_use", {}).includes("tool-use"));
      assert.ok(generateTags("post_tool_use", {}).includes("tool-use"));
      assert.ok(generateTags("file_create", {}).includes("file-create"));
      assert.ok(generateTags("file_save", {}).includes("file-save"));
      assert.ok(generateTags("file_delete", {}).includes("file-delete"));
      assert.ok(generateTags("pre_task_execution", {}).includes("spec-task"));
      assert.ok(generateTags("post_task_execution", {}).includes("spec-task"));
      assert.ok(generateTags("manual", {}).includes("manual"));
    });

    it("should add tool name tag for tool hooks", () => {
      const tags = generateTags("pre_tool_use", { tool_name: "WriteFile" });
      assert.ok(tags.includes("tool-writefile"));
    });

    it("should add file-ops parent tag for file hooks", () => {
      assert.ok(generateTags("file_create", {}).includes("file-ops"));
      assert.ok(generateTags("file_save", {}).includes("file-ops"));
      assert.ok(generateTags("file_delete", {}).includes("file-ops"));
    });

    it("should not produce duplicate tags", () => {
      const tags = generateTags("file_create", { model: "kiro" });
      const kiroCount = tags.filter((t) => t === "kiro").length;
      assert.equal(kiroCount, 1);
    });
  });

  describe("getFileExtension", () => {
    it("should extract common extensions", () => {
      assert.equal(getFileExtension("/src/app.js"), "js");
      assert.equal(getFileExtension("/src/main.ts"), "ts");
      assert.equal(getFileExtension("style.CSS"), "css");
      assert.equal(getFileExtension("data.json"), "json");
    });

    it("should handle dotfiles", () => {
      assert.equal(getFileExtension(".gitignore"), "gitignore");
    });

    it("should handle multiple dots", () => {
      assert.equal(getFileExtension("app.test.js"), "js");
    });

    it("should return 'unknown' for no extension", () => {
      assert.equal(getFileExtension("Makefile"), "unknown");
    });

    it("should return 'unknown' for null/undefined", () => {
      assert.equal(getFileExtension(null), "unknown");
      assert.equal(getFileExtension(undefined), "unknown");
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds", () => {
      assert.equal(formatDuration(500), "500ms");
      assert.equal(formatDuration(0), "0ms");
      assert.equal(formatDuration(999), "999ms");
    });

    it("should format seconds", () => {
      assert.equal(formatDuration(1000), "1.0s");
      assert.equal(formatDuration(5500), "5.5s");
      assert.equal(formatDuration(59999), "60.0s");
    });

    it("should format minutes", () => {
      assert.equal(formatDuration(60000), "1m 0s");
      assert.equal(formatDuration(90000), "1m 30s");
      assert.equal(formatDuration(125000), "2m 5s");
    });

    it("should handle null/negative", () => {
      assert.equal(formatDuration(null), "0ms");
      assert.equal(formatDuration(-100), "0ms");
      assert.equal(formatDuration(undefined), "0ms");
    });
  });

  describe("determineLevel", () => {
    it("should map statuses correctly", () => {
      assert.equal(determineLevel("error"), "ERROR");
      assert.equal(determineLevel("aborted"), "WARNING");
      assert.equal(determineLevel("completed"), "DEFAULT");
      assert.equal(determineLevel("unknown"), "DEFAULT");
      assert.equal(determineLevel(undefined), "DEFAULT");
    });
  });
});
