import type { ChatMessage } from "@/lib/types"

/**
 * Normalizes trace input/output to ChatMessage format.
 * Handles various input formats: arrays, strings, objects with role/content.
 */
export function normalizeTraceMessages(trace: any): ChatMessage[] {
  const messages: ChatMessage[] = []

  // Handle input
  if (Array.isArray(trace.input)) {
    messages.push(...trace.input.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp || trace.timestamp
    })))
  } else if (typeof trace.input === "string") {
    messages.push({ role: "user" as const, content: trace.input, timestamp: trace.timestamp })
  } else if (typeof trace.input === "object" && trace.input?.role && trace.input?.content) {
    messages.push({ ...trace.input, timestamp: trace.input.timestamp || trace.timestamp })
  }

  // Handle output
  if (Array.isArray(trace.output)) {
    trace.output.forEach((item: any) => {
      if (item.role && item.content) {
        // Standard ChatMessage format
        messages.push(item)
      } else if (item.text) {
        // OpenAI/Anthropic message content format with {type, text}
        messages.push({ role: "assistant" as const, content: item.text, timestamp: trace.timestamp })
      }
    })
  } else if (typeof trace.output === "string") {
    messages.push({ role: "assistant" as const, content: trace.output, timestamp: trace.timestamp })
  } else if (typeof trace.output === "object" && trace.output?.role && trace.output?.content) {
    messages.push(trace.output)
  }

  return messages
}

/**
 * Sorts messages by timestamp in ascending order.
 */
export function sortMessagesByTimestamp(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })
}
