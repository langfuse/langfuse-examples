import { NextResponse } from "next/server"
import { langfuseApi } from "@/lib/langfuse-client"
import type { Trace } from "@/lib/types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ traceId: string }> }
) {
  try {
    const { traceId } = await params

    // Use Langfuse SDK to fetch trace
    const trace = await langfuseApi.traceGet(traceId)

    return NextResponse.json(trace)
  } catch (error) {
    console.error("Error fetching trace:", error)
    return NextResponse.json(
      { error: "Failed to fetch trace" },
      { status: 500 }
    )
  }
}
