/**
 * Browser-safe Langfuse client
 * Only uses the public key - safe to use in client-side code
 */
import { LangfuseWeb } from "langfuse"

// Initialize LangfuseWeb with only the public key
export const langfuseWeb = new LangfuseWeb({
  publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_HOST || "https://cloud.langfuse.com",
})

// Helper function to submit a single score (without flushing)
export async function submitScore(params: {
  traceId?: string
  observationId?: string
  sessionId?: string
  name: string
  value: number
  stringValue?: string
  comment?: string
  configId?: string
  dataType?: "NUMERIC" | "CATEGORICAL" | "BOOLEAN"
  queueId?: string
}) {
  try {
    // Create idempotency key to prevent duplicate scores
    // Using the pattern: <objectId>-<scoreName> ensures we update the same score
    // when re-scoring the same item
    const objectId = params.traceId || params.sessionId || params.observationId
    const idempotencyKey = objectId && params.name ? `${objectId}-${params.name}` : undefined

    // Handle value based on data type per Langfuse API requirements:
    // - CATEGORICAL: Must submit the string label as the value
    // - NUMERIC: Submit the numeric value
    // - BOOLEAN: Submit 0 or 1 as numeric value
    const scoreValue = params.dataType === "CATEGORICAL" && params.stringValue
      ? params.stringValue
      : params.value

    const scorePayload: any = {
      name: params.name,
      value: scoreValue,
      configId: params.configId,
    }

    // Add idempotency key to update existing scores instead of creating duplicates
    if (idempotencyKey) scorePayload.id = idempotencyKey

    // Add optional fields only if they exist
    // Note: Provide exactly one of: traceId, sessionId, or observationId (with traceId)
    if (params.traceId) scorePayload.traceId = params.traceId
    if (params.sessionId) scorePayload.sessionId = params.sessionId
    if (params.observationId) scorePayload.observationId = params.observationId
    if (params.comment) scorePayload.comment = params.comment
    if (params.queueId) scorePayload.queueId = params.queueId
    if (params.dataType) scorePayload.dataType = params.dataType
    // Note: For categorical scores, stringValue is not needed since value is already the string

    // Debug logging
    console.log("Submitting score to Langfuse:", {
      name: params.name,
      value: params.value,
      dataType: params.dataType,
      stringValue: params.stringValue,
      configId: params.configId,
      queueId: params.queueId,
      traceId: params.traceId,
      sessionId: params.sessionId,
      fullPayload: scorePayload
    })

    // Queue the score (don't flush yet - caller will flush all at once)
    langfuseWeb.score(scorePayload)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error submitting score to Langfuse:", {
      error: errorMessage,
      scoreName: params.name,
      traceId: params.traceId,
      configId: params.configId,
    })
    throw new Error(`Failed to submit score "${params.name}": ${errorMessage}`)
  }
}

// Flush all pending scores to Langfuse
export async function flushScores() {
  return langfuseWeb.flush()
}
