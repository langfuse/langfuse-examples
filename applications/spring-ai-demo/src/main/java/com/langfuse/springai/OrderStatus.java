package com.langfuse.springai;

/**
 * Result returned by {@link OrderLookupTool}.
 */
public record OrderStatus(String orderId, String status) {
}
