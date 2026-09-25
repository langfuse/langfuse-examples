import { LangfuseSpanProcessor, type ShouldExportSpan } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { registerTelemetry } from "ai";

// Optional: don't export Next.js infrastructure spans
const shouldExportSpan: ShouldExportSpan = (span) =>
  span.otelSpan.instrumentationScope.name !== "next.js";

// Next.js bundles instrumentation.ts separately from route handlers, so a plain
// module-level instance would exist twice. Keep one processor per process so the
// chat route flushes the same processor that register() attached.
const globalForLangfuse = globalThis as typeof globalThis & {
  langfuseSpanProcessor?: LangfuseSpanProcessor;
};

// Reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and LANGFUSE_BASE_URL.
export const langfuseSpanProcessor = (globalForLangfuse.langfuseSpanProcessor ??=
  new LangfuseSpanProcessor({ shouldExportSpan }));

export function register() {
  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });
  tracerProvider.register();

  // AI SDK 7: trace every streamText / generateText call as Langfuse observations
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
}
