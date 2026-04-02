/**
 * Shared test helpers for kiro-langfuse hook tests
 */

/**
 * Creates a mock Langfuse trace that records all method calls.
 * Use trace._calls to inspect what was recorded.
 */
export function createMockTrace() {
  const calls = {
    updates: [],
    generations: [],
    events: [],
    spans: [],
    scores: [],
  };

  const mockSpan = { end: () => {} };

  return {
    _calls: calls,
    update: (data) => calls.updates.push(data),
    generation: (data) => calls.generations.push(data),
    event: (data) => calls.events.push(data),
    span: (data) => {
      calls.spans.push(data);
      return mockSpan;
    },
    score: (data) => calls.scores.push(data),
  };
}

/**
 * Creates a minimal mock trace that only tracks scores.
 */
export function createScorableTrace() {
  const scores = [];
  return {
    _scores: scores,
    score: (data) => scores.push(data),
  };
}
