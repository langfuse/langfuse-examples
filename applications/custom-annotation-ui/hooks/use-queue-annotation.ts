import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { submitScore, flushScores } from "@/lib/langfuse-web"
import { normalizeTraceMessages, sortMessagesByTimestamp } from "@/lib/message-utils"
import type { QueueItem, ChatMessage, ScoreConfig, AnnotationQueue, Score } from "@/lib/types"

interface UseQueueAnnotationParams {
  queueId: string
}

interface CurrentItemData {
  messages: ChatMessage[]
  scores?: Score[]
  context?: any
}

export function useQueueAnnotation({ queueId }: UseQueueAnnotationParams) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentData, setCurrentData] = useState<CurrentItemData | null>(null)
  const [loadingItem, setLoadingItem] = useState(false)
  const [queue, setQueue] = useState<AnnotationQueue | null>(null)
  const [scoreConfigs, setScoreConfigs] = useState<ScoreConfig[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derive currentIndex from URL (single source of truth)
  const currentIndex = useMemo(() => {
    const itemId = searchParams.get('itemId')
    if (!itemId || items.length === 0) return 0
    const index = items.findIndex(item => item.id === itemId)
    return index !== -1 ? index : 0
  }, [searchParams, items])

  const currentItem = useMemo(() => items[currentIndex], [items, currentIndex])

  // Fetch queue, items, and score configs on mount
  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        const [queueData, queueItems] = await Promise.all([
          api.getQueue(queueId),
          api.getQueueItems(queueId),
        ])

        setItems(queueItems)
        setQueue(queueData || null)

        // Set initial URL if no itemId in URL
        const itemId = searchParams.get('itemId')
        if (!itemId && queueItems.length > 0) {
          router.replace(`/queue/${queueId}?itemId=${queueItems[0].id}`, { scroll: false })
        }

        // Fetch all score configs
        if (queueData?.scoreConfigIds && queueData.scoreConfigIds.length > 0) {
          const configs = await Promise.all(
            queueData.scoreConfigIds.map(configId => api.getScoreConfig(configId))
          )
          setScoreConfigs(configs.filter((c): c is ScoreConfig => c !== undefined))
        }
      } catch (error) {
        console.error("Failed to fetch queue data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchQueueData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId])

  // Fetch details for the current item
  useEffect(() => {
    if (items.length === 0) return

    const item = items[currentIndex]
    if (!item) {
      setLoadingItem(false)
      return
    }

    const fetchItemDetails = async () => {
      setLoadingItem(true)
      const messages: ChatMessage[] = []
      let scores: Score[] = []

      try {
        if (item.objectType === "SESSION") {
          const session = await api.getSession(item.objectId)
          if (session) {
            session.traces.forEach((trace) => {
              messages.push(...normalizeTraceMessages(trace))
              if (trace.scores) {
                scores.push(...trace.scores)
              }
            })
          }
        } else if (item.objectType === "TRACE") {
          const trace = await api.getTrace(item.objectId)
          if (trace) {
            messages.push(...normalizeTraceMessages(trace))
            if (trace.scores) {
              scores = trace.scores
            }
          }
        }

        const sortedMessages = sortMessagesByTimestamp(messages)
        setCurrentData({ messages: sortedMessages, scores })
      } catch (error) {
        console.error("Failed to fetch item details", error)
      } finally {
        setLoadingItem(false)
      }
    }

    fetchItemDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items])

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      const nextItem = items[currentIndex + 1]
      router.push(`/queue/${queueId}?itemId=${nextItem.id}`, { scroll: false })
    }
  }, [currentIndex, items, queueId, router])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevItem = items[currentIndex - 1]
      router.push(`/queue/${queueId}?itemId=${prevItem.id}`, { scroll: false })
    }
  }, [currentIndex, items, queueId, router])

  const handleScoreSubmit = useCallback(async (
    scores: Array<{ configId: string; name: string; value: number }>,
    comment: string
  ) => {
    if (!currentItem) {
      console.error("No item found at current index")
      return
    }

    setIsSubmitting(true)

    try {
      // Queue all scores (doesn't send yet)
      scores.forEach(score => {
        const config = scoreConfigs.find(c => c.id === score.configId)

        // For categorical scores, find the label (stringValue) for the selected value
        let stringValue: string | undefined
        if (config?.dataType === "CATEGORICAL") {
          if (config.categories) {
            const category = config.categories.find(cat => cat.value === score.value)
            stringValue = category?.label

            if (!stringValue) {
              console.error(`No label found for categorical score "${score.name}" with value ${score.value}`)
              throw new Error(`Invalid category value for "${score.name}"`)
            }
          } else {
            console.error(`No categories defined for categorical score "${score.name}"`)
            throw new Error(`Configuration error for "${score.name}"`)
          }
        }

        submitScore({
          name: score.name,
          value: score.value,
          comment,
          configId: score.configId,
          queueId: queueId,
          dataType: config?.dataType,
          stringValue,
          ...(currentItem.objectType === "TRACE" && { traceId: currentItem.objectId }),
          ...(currentItem.objectType === "SESSION" && { sessionId: currentItem.objectId }),
        })
      })

      // Flush all scores at once (single network request)
      await flushScores()

      // Update queue item status via our API route
      await api.updateQueueItemStatus(queueId, currentItem.id, "COMPLETED")

      // Update local state to reflect completion
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === currentItem.id
            ? { ...item, status: "COMPLETED", completedAt: new Date().toISOString() }
            : item
        )
      )

      // Reset submitting state before navigation
      setIsSubmitting(false)

      // Auto advance to next item
      handleNext()
    } catch (error) {
      console.error("Error submitting scores:", error)
      alert("Failed to submit scores. Please try again.")
      setIsSubmitting(false)
    }
  }, [currentItem, scoreConfigs, queueId, handleNext])

  return {
    // State
    items,
    currentIndex,
    currentItem,
    currentData,
    queue,
    scoreConfigs,
    loading,
    loadingItem,
    isSubmitting,
    // Actions
    handleNext,
    handlePrev,
    handleScoreSubmit,
  }
}
