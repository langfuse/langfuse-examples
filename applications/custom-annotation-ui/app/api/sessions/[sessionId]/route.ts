import { NextResponse } from "next/server"
import { langfuseApi } from "@/lib/langfuse-client"
import type { Session } from "@/lib/types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Use Langfuse SDK to fetch session
    const session = await langfuseApi.sessionsGet(sessionId)

    return NextResponse.json(session)
  } catch (error) {
    console.error("Error fetching session:", error)
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    )
  }
}
