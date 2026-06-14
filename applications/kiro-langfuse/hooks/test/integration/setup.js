/**
 * Integration test setup helpers.
 *
 * Provides utilities to wait for the Dockerised Langfuse instance,
 * fetch traces via the public API, and create a properly configured
 * Langfuse SDK client for assertions.
 */

const LANGFUSE_BASE_URL =
  process.env.LANGFUSE_BASE_URL || "http://localhost:3033";
const LANGFUSE_PUBLIC_KEY =
  process.env.LANGFUSE_PUBLIC_KEY || "pk-lf-test";
const LANGFUSE_SECRET_KEY =
  process.env.LANGFUSE_SECRET_KEY || "sk-lf-test";

/** Max time (ms) to wait for Langfuse to become healthy. */
const HEALTH_TIMEOUT = 60_000;
/** Interval (ms) between health-check retries. */
const HEALTH_INTERVAL = 2_000;
/** Max time (ms) to wait for an ingested trace to appear via the API. */
const TRACE_POLL_TIMEOUT = 15_000;
/** Interval (ms) between trace-fetch retries. */
const TRACE_POLL_INTERVAL = 1_000;

// ────────────────────────────────────────────────────────
// Basic-auth header used by all public API calls
// ────────────────────────────────────────────────────────
function authHeader() {
  const encoded = Buffer.from(
    `${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`
  ).toString("base64");
  return `Basic ${encoded}`;
}

// ────────────────────────────────────────────────────────
// Health check — blocks until Langfuse is ready
// ────────────────────────────────────────────────────────

/**
 * Polls the Langfuse health endpoint until it responds 200.
 * Throws after HEALTH_TIMEOUT ms.
 */
export async function waitForLangfuse() {
  const deadline = Date.now() + HEALTH_TIMEOUT;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${LANGFUSE_BASE_URL}/api/public/health`);
      if (res.ok) return;
    } catch {
      // server not up yet — retry
    }
    await sleep(HEALTH_INTERVAL);
  }

  throw new Error(
    `Langfuse did not become healthy within ${HEALTH_TIMEOUT / 1000}s at ${LANGFUSE_BASE_URL}`
  );
}

// ────────────────────────────────────────────────────────
// Trace fetching — polls until the trace is queryable
// ────────────────────────────────────────────────────────

/**
 * Fetch a single trace by ID, retrying until it appears or times out.
 * Langfuse ingestion is async so there is a short delay between
 * `flushAsync()` and the trace being visible in the API.
 *
 * @param {string} traceId
 * @returns {Promise<object>} The trace object from the API
 */
export async function fetchTrace(traceId) {
  const deadline = Date.now() + TRACE_POLL_TIMEOUT;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${LANGFUSE_BASE_URL}/api/public/traces/${traceId}`,
        { headers: { Authorization: authHeader() } }
      );

      if (res.ok) {
        return await res.json();
      }

      // 404 means trace hasn't been ingested yet — keep polling
      if (res.status !== 404) {
        const body = await res.text();
        throw new Error(`Unexpected response ${res.status}: ${body}`);
      }
    } catch (err) {
      if (err.message.startsWith("Unexpected response")) throw err;
      // network error — retry
    }
    await sleep(TRACE_POLL_INTERVAL);
  }

  throw new Error(
    `Trace ${traceId} did not appear within ${TRACE_POLL_TIMEOUT / 1000}s`
  );
}

/**
 * Fetch observations (generations, spans, events) for a given trace.
 *
 * @param {string} traceId
 * @returns {Promise<object[]>} Array of observation objects
 */
export async function fetchObservations(traceId) {
  const deadline = Date.now() + TRACE_POLL_TIMEOUT;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${LANGFUSE_BASE_URL}/api/public/observations?traceId=${traceId}`,
        { headers: { Authorization: authHeader() } }
      );

      if (res.ok) {
        const body = await res.json();
        // Only return once we have at least one observation
        if (body.data && body.data.length > 0) {
          return body.data;
        }
      }
    } catch {
      // retry
    }
    await sleep(TRACE_POLL_INTERVAL);
  }

  throw new Error(
    `No observations found for trace ${traceId} within ${TRACE_POLL_TIMEOUT / 1000}s`
  );
}

/**
 * Fetch scores for a given trace via the trace endpoint.
 * The /api/public/traces/:id response includes a `scores` array
 * that is correctly filtered to that trace.
 *
 * @param {string} traceId
 * @returns {Promise<object[]>} Array of score objects
 */
export async function fetchScores(traceId) {
  const deadline = Date.now() + TRACE_POLL_TIMEOUT;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${LANGFUSE_BASE_URL}/api/public/traces/${traceId}`,
        { headers: { Authorization: authHeader() } }
      );

      if (res.ok) {
        const trace = await res.json();
        if (trace.scores && trace.scores.length > 0) {
          return trace.scores;
        }
      }
    } catch {
      // retry
    }
    await sleep(TRACE_POLL_INTERVAL);
  }

  throw new Error(
    `No scores found for trace ${traceId} within ${TRACE_POLL_TIMEOUT / 1000}s`
  );
}

// ────────────────────────────────────────────────────────
// Environment helpers
// ────────────────────────────────────────────────────────

/**
 * Returns true when integration tests should run.
 * Set LANGFUSE_INTEGRATION_TEST=true to enable.
 */
export function shouldRunIntegration() {
  return process.env.LANGFUSE_INTEGRATION_TEST === "true";
}

/**
 * Generate a unique trace ID to avoid collisions between test runs.
 */
export function uniqueTraceId(prefix = "integ") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Config object for creating a Langfuse client in tests.
 */
export const langfuseConfig = {
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
};

// ────────────────────────────────────────────────────────
// Tiny helpers
// ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
