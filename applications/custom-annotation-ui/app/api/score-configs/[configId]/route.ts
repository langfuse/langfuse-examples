import { NextResponse } from "next/server"
import { langfuseApi } from "@/lib/langfuse-client"
import type { ScoreConfig } from "@/lib/types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const { configId } = await params
    
    // Use Langfuse SDK to fetch score config
    const scoreConfig = await langfuseApi.scoreConfigsGetById(configId)

    return NextResponse.json(scoreConfig)
  } catch (error) {
    console.error("Error fetching score config:", error)
    return NextResponse.json(
      { error: "Failed to fetch score config" },
      { status: 500 }
    )
  }
}
