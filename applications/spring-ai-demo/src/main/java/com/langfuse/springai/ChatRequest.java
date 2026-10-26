package com.langfuse.springai;

/**
 * Request body for {@code POST /v1/chat}.
 */
public record ChatRequest(String prompt, String userId, String sessionId) {
}
