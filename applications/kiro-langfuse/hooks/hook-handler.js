#!/usr/bin/env node

/**
 * Kiro Hooks Langfuse Integration
 *
 * Main entry point for Kiro hooks that sends traces to Langfuse.
 *
 * Supported Kiro Hook Types:
 *   - PromptSubmit        → Captures user prompts
 *   - AgentStop           → Records agent completion
 *   - PreToolUse          → Logs before tool invocation (read, write, shell, web, @mcp, etc.)
 *   - PostToolUse         → Logs after tool invocation with results
 *   - FileCreate          → Tracks new file creation
 *   - FileSave            → Tracks file saves
 *   - FileDelete          → Tracks file deletions
 *   - PreTaskExecution    → Logs before spec task starts
 *   - PostTaskExecution   → Logs after spec task completes
 *   - Manual              → On-demand hook execution
 *
 * @version 1.0.0
 * @see https://kiro.dev/docs/hooks/
 * @see https://langfuse.com/docs
 */

import { readStdin, buildInputFromEnv } from "./lib/utils.js";
import {
  getOrCreateTrace,
  flushLangfuse,
  HOOK_HANDLER_VERSION,
} from "./lib/langfuse-client.js";
import { routeHookHandler } from "./lib/handlers.js";
import { appendFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = dirname(__filename2);
const DEBUG_LOG = resolve(__dirname2, "..", "hook-debug.log");

function debugLog(msg) {
  try {
    appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore */ }
}

/**
 * Main handler function.
 * Reads hook data from stdin/env, creates Langfuse trace, and routes to handler.
 */
async function main() {
  try {
    debugLog(`Hook invoked. KIRO_HOOK_EVENT=${process.env.KIRO_HOOK_EVENT}`);

    // Read JSON input from stdin (Kiro passes hook data via stdin for shell commands)
    const stdinData = await readStdin();
    debugLog(`stdin parsed: ${JSON.stringify(stdinData).substring(0, 200)}`);

    const input = buildInputFromEnv(stdinData);
    const trace = getOrCreateTrace(input);

    const hookName = input.hook_event_name;
    const response = routeHookHandler(hookName, trace, input);

    // Output response to stdout (Kiro adds stdout to agent context on success)
    if (response !== null && response !== undefined) {
      console.log(JSON.stringify(response));
    }

    // Flush and shutdown Langfuse — ensures all HTTP requests complete
    await flushLangfuse();
    process.exit(0);
  } catch (error) {
    // Log to stderr (Kiro shows stderr to agent on failure)
    console.error(`[Kiro-Langfuse v${HOOK_HANDLER_VERSION}] Error: ${error.message}`);
    process.exit(1);
  }
}

main();
