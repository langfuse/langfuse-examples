"use client"

import { useParams } from "next/navigation"
import { useQueueAnnotation } from "@/hooks/use-queue-annotation"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { AnnotationHeader } from "@/components/annotation/annotation-header"
import { ChatBubble } from "@/components/annotation/chat-bubble"
import { ScorePanel } from "@/components/annotation/score-panel"
import { MetadataSidebar } from "@/components/annotation/metadata-sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export default function AnnotationInterface() {
  const params = useParams()
  const queueId = params.queueId as string

  const {
    items,
    currentIndex,
    currentItem,
    currentData,
    scoreConfigs,
    loading,
    loadingItem,
    isSubmitting,
    handleNext,
    handlePrev,
    handleScoreSubmit,
  } = useQueueAnnotation({ queueId })

  // Enable keyboard navigation
  useKeyboardNavigation({ onNext: handleNext, onPrev: handlePrev })

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading queue...</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No items in this queue.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <AnnotationHeader
        queueId={queueId}
        currentIndex={currentIndex}
        totalItems={items.length}
        onPrev={handlePrev}
        onNext={handleNext}
        canGoPrev={currentIndex > 0}
        canGoNext={currentIndex < items.length - 1}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {loadingItem ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4 ml-auto rounded-xl" />
                <Skeleton className="h-24 w-2/3 rounded-xl" />
                <Skeleton className="h-12 w-1/2 ml-auto rounded-xl" />
              </div>
            ) : (
              currentData?.messages.map((msg, idx) => (
                <ChatBubble key={idx} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
              ))
            )}

            {!loadingItem && currentData?.messages.length === 0 && (
              <div className="text-center text-muted-foreground py-20">No messages found for this trace.</div>
            )}
          </div>
        </div>

        {/* Sidebar / Scoring Panel */}
        <div className="w-80 border-l bg-card/30 backdrop-blur-sm p-4 overflow-y-auto shrink-0 hidden md:block">
          {currentItem && (
            <>
              <ScorePanel
                key={currentItem.id}
                scoreConfigs={scoreConfigs}
                onSubmit={handleScoreSubmit}
                isSubmitting={isSubmitting}
                isCompleted={currentItem.status === "COMPLETED"}
                completedAt={currentItem.completedAt}
                existingScores={currentData?.scores}
              />

              <MetadataSidebar item={currentItem} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
