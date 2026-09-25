import { LangfuseClient } from "@langfuse/client";

// Reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and LANGFUSE_BASE_URL.
const langfuse = new LangfuseClient();

// Message IDs are Langfuse trace IDs (32 hex characters) when tracing was active.
const TRACE_ID = /^[0-9a-f]{32}$/;

export async function POST(req: Request) {
  let body: { messageId?: unknown; value?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const { messageId, value, comment } = body;
  if (typeof messageId !== "string" || (value !== 0 && value !== 1)) {
    return Response.json(
      { error: "Expected { messageId: string, value: 0 | 1, comment?: string }" },
      { status: 400 },
    );
  }

  if (!TRACE_ID.test(messageId)) {
    // The message was generated without an active trace; nothing to attach feedback to.
    return Response.json({ ok: true, skipped: "message is not linked to a trace" });
  }

  langfuse.score.create({
    // A stable ID makes a changed rating update the score instead of adding a second one
    id: `user-feedback-${messageId}`,
    traceId: messageId,
    name: "user-feedback",
    value,
    dataType: "BOOLEAN",
    comment: typeof comment === "string" && comment.trim() ? comment.trim() : undefined,
  });
  await langfuse.flush();

  return Response.json({ ok: true });
}
