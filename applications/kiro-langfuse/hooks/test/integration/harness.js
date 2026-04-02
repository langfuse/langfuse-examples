/**
 * Shared test harness for integration tests.
 *
 * Provides before/after hooks that configure the Langfuse client
 * to point at the Docker instance and wait for it to become healthy.
 */

import {
  waitForLangfuse,
  langfuseConfig,
  shouldRunIntegration,
} from "./setup.js";

import {
  shutdownLangfuse,
  resetLangfuseClient,
} from "../../lib/langfuse-client.js";

/** Skip flag — true when Docker stack isn't up */
export const SKIP = !shouldRunIntegration();

/** Call in before() to configure the client and wait for Langfuse. */
export async function setupLangfuse() {
  process.env.LANGFUSE_SECRET_KEY = langfuseConfig.secretKey;
  process.env.LANGFUSE_PUBLIC_KEY = langfuseConfig.publicKey;
  process.env.LANGFUSE_BASE_URL = langfuseConfig.baseUrl;
  resetLangfuseClient();

  console.log("⏳ Waiting for Langfuse to become healthy…");
  await waitForLangfuse();
  console.log("✅ Langfuse is healthy");
}

/** Call in after() to cleanly shut down the client. */
export async function teardownLangfuse() {
  try {
    await shutdownLangfuse();
  } catch {
    // best-effort
  }
  resetLangfuseClient();
}
