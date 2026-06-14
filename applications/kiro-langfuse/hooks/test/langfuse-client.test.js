import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addCompletionScores,
  addScore,
  addTagsToTrace,
} from "../lib/langfuse-client.js";
import { createScorableTrace } from "./helpers.js";

describe("langfuse-client.js", () => {
  describe("addCompletionScores", () => {
    it("should score completed as 1", () => {
      const trace = createScorableTrace();
      addCompletionScores(trace, { status: "completed" });
      assert.equal(trace._scores[0].value, 1);
      assert.equal(trace._scores[0].name, "completion_status");
    });

    it("should score aborted as 0.5", () => {
      const trace = createScorableTrace();
      addCompletionScores(trace, { status: "aborted" });
      assert.equal(trace._scores[0].value, 0.5);
    });

    it("should score error as 0", () => {
      const trace = createScorableTrace();
      addCompletionScores(trace, { status: "error" });
      assert.equal(trace._scores[0].value, 0);
    });

    it("should score unknown status as 0.5", () => {
      const trace = createScorableTrace();
      addCompletionScores(trace, { status: "something_else" });
      assert.equal(trace._scores[0].value, 0.5);
    });
  });

  describe("addTagsToTrace", () => {
    it("should call update with tags", () => {
      let updated = null;
      const trace = { update: (data) => (updated = data) };
      addTagsToTrace(trace, ["kiro", "test"]);
      assert.deepEqual(updated.tags, ["kiro", "test"]);
    });

    it("should not call update with empty tags", () => {
      let called = false;
      const trace = { update: () => (called = true) };
      addTagsToTrace(trace, []);
      assert.equal(called, false);
    });

    it("should not call update with null tags", () => {
      let called = false;
      const trace = { update: () => (called = true) };
      addTagsToTrace(trace, null);
      assert.equal(called, false);
    });
  });

  describe("addScore", () => {
    it("should add score to trace", () => {
      let scored = null;
      const trace = { score: (data) => (scored = data) };
      addScore(trace, "quality", 0.95, "high quality", "NUMERIC");
      assert.deepEqual(scored, {
        name: "quality",
        value: 0.95,
        comment: "high quality",
        dataType: "NUMERIC",
      });
    });

    it("should not throw on null trace", () => {
      assert.doesNotThrow(() => addScore(null, "test", 1));
    });
  });
});
