import { NextResponse } from "next/server"
import { langfuseApi } from "@/lib/langfuse-client"
import type { PaginatedResponse, QueueItem } from "@/lib/types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ queueId: string }> }
) {
  try {
    const { queueId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as "PENDING" | "COMPLETED" | null

    // Use Langfuse SDK to fetch queue items
    const response = await langfuseApi.annotationQueuesListQueueItems({
      queueId,
      page: 1,
      limit: 100,
      ...(status && { status })
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error("Error fetching queue items:", error)
    return NextResponse.json(
      { error: "Failed to fetch queue items" },
      { status: 500 }
    )
  }
}
