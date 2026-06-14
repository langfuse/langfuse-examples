import { NextResponse } from "next/server"
import { langfuseApi } from "@/lib/langfuse-client"
import type { AnnotationQueue } from "@/lib/types"

export async function GET() {
  try {
    // Use Langfuse SDK to fetch annotation queues
    const response = await langfuseApi.annotationQueuesListQueues({
      page: 1,
      limit: 100,
    })

    // Fetch items for each queue to calculate counts
    const queuesWithCounts = await Promise.all(
      response.data.map(async (queue) => {
        try {
          // Use SDK to fetch queue items
          const itemsResponse = await langfuseApi.annotationQueuesListQueueItems({
            queueId: queue.id,
            page: 1,
            limit: 100,
          })

          return {
            ...queue,
            pendingItemCount: itemsResponse.data.filter((item: any) => item.status === "PENDING").length,
            completedItemCount: itemsResponse.data.filter((item: any) => item.status === "COMPLETED").length,
          }
        } catch (error) {
          console.error(`Error fetching items for queue ${queue.id}:`, error)
          return {
            ...queue,
            pendingItemCount: 0,
            completedItemCount: 0,
          }
        }
      })
    )

    return NextResponse.json(queuesWithCounts)
  } catch (error) {
    console.error("Error fetching queues:", error)
    return NextResponse.json(
      { error: "Failed to fetch queues" },
      { status: 500 }
    )
  }
}
