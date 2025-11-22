import type {
  AnnotationQueue,
  QueueItem,
  Session,
  Trace,
  ScoreConfig,
} from "./types"

/**
 * Helper to create absolute URLs when running on server, relative when on client
 */
function getBaseUrl(): string {
  // Client-side: use relative URLs
  if (typeof window !== 'undefined') {
    return ''
  }

  // Server-side: construct absolute URL
  // Use NEXT_PUBLIC_LANGFUSE_HOST if available, otherwise localhost
  if (process.env.NEXT_PUBLIC_LANGFUSE_HOST) {
    // Extract the hostname and port from LANGFUSE_HOST if it's set
    // but we actually want to use localhost for the Next.js server
    return 'http://localhost:3000'
  }

  return 'http://localhost:3000'
}

/**
 * Client-side API wrapper that calls our Next.js API routes.
 * 
 * This layer keeps secret keys secure by routing all Langfuse API calls
 * through our Next.js API routes (app/api/route.ts files), which use the
 * Langfuse SDK server-side with full authentication.
 * 
 * IMPORTANT: This file is imported by browser components and should never
 * contain secret keys or make direct calls to the Langfuse API.
 */
export const api = {
  /**
   * Get all annotation queues
   */
  getQueues: async (): Promise<AnnotationQueue[]> => {
    const response = await fetch(`${getBaseUrl()}/api/queues`)
    if (!response.ok) {
      throw new Error("Failed to fetch queues")
    }
    return response.json()
  },

  /**
   * Get a specific annotation queue
   */
  getQueue: async (queueId: string): Promise<AnnotationQueue | undefined> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/queues/${queueId}`)
      if (!response.ok) {
        console.error(`Failed to fetch queue ${queueId}: ${response.status} ${response.statusText}`)
        return undefined
      }
      return response.json()
    } catch (error) {
      console.error(`Error fetching queue ${queueId}:`, error)
      return undefined
    }
  },

  /**
   * Get items for a specific queue
   */
  getQueueItems: async (queueId: string, status?: "PENDING" | "COMPLETED"): Promise<QueueItem[]> => {
    try {
      const baseUrl = getBaseUrl()
      const url = status
        ? `${baseUrl}/api/queues/${queueId}/items?status=${status}`
        : `${baseUrl}/api/queues/${queueId}/items`

      const response = await fetch(url)
      if (!response.ok) {
        return []
      }
      return response.json()
    } catch (error) {
      console.error(`Error fetching queue items for ${queueId}:`, error)
      return []
    }
  },

  /**
   * Get a specific queue item
   */
  getQueueItem: async (queueId: string, itemId: string): Promise<QueueItem | undefined> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/queues/${queueId}/items/${itemId}`)
      if (!response.ok) {
        return undefined
      }
      return response.json()
    } catch (error) {
      console.error(`Error fetching queue item ${itemId}:`, error)
      return undefined
    }
  },

  /**
   * Get a session by ID
   */
  getSession: async (sessionId: string): Promise<Session | undefined> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/sessions/${sessionId}`)
      if (!response.ok) {
        return undefined
      }
      return response.json()
    } catch (error) {
      console.error(`Error fetching session ${sessionId}:`, error)
      return undefined
    }
  },

  /**
   * Get a trace by ID
   */
  getTrace: async (traceId: string): Promise<Trace | undefined> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/traces/${traceId}`)
      if (!response.ok) {
        return undefined
      }
      return response.json()
    } catch (error) {
      console.error(`Error fetching trace ${traceId}:`, error)
      return undefined
    }
  },

  /**
   * Update a queue item status
   */
  updateQueueItemStatus: async (
    queueId: string,
    itemId: string,
    status: "PENDING" | "COMPLETED"
  ): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/api/queues/${queueId}/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      throw new Error("Failed to update queue item status")
    }
  },

  /**
   * Get a score config by ID
   */
  getScoreConfig: async (configId: string): Promise<ScoreConfig | undefined> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/score-configs/${configId}`)
      if (!response.ok) {
        return undefined
      }
      return response.json()
    } catch (error) {
      console.error(`Error fetching score config ${configId}:`, error)
      return undefined
    }
  },
}
