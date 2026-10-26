package com.langfuse.springai;

import java.util.Locale;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.common.KeyValue;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * Deterministic tool used by the demo so traces are reproducible without an
 * external order service.
 */
@Component
public class OrderLookupTool {

    private static final Map<String, String> STATUSES = Map.of(
            "A1001", "SHIPPED",
            "A1002", "PROCESSING"
    );

    private final ObservationRegistry observationRegistry;
    private final ObjectMapper objectMapper;

    public OrderLookupTool(ObservationRegistry observationRegistry, ObjectMapper objectMapper) {
        this.observationRegistry = observationRegistry;
        this.objectMapper = objectMapper;
    }

    @Tool(name = "lookup_order", description = "Look up the status of an order by its order ID. Use this for any order status question.")
    public OrderStatus lookup(
            @ToolParam(description = "Order ID, for example A1001") String orderId) {
        String normalizedOrderId = orderId == null
                ? ""
                : orderId.trim().toUpperCase(Locale.ROOT);

        Observation active = observationRegistry.getCurrentObservation();
        if (isToolCallObservation(active)) {
            // Spring AI already created the tool_call span. Enrich it instead of
            // nesting a second, empty tool span under it.
            try {
                return execute(active, normalizedOrderId);
            } catch (RuntimeException exception) {
                active.error(exception);
                markError(active, exception);
                throw exception;
            }
        }

        Observation observation = Observation
                .createNotStarted("lookup-order", observationRegistry)
                .contextualName("lookup-order")
                .highCardinalityKeyValue("langfuse.observation.type", "tool")
                .highCardinalityKeyValue(
                        "langfuse.observation.input",
                        toJson(Map.of("orderId", normalizedOrderId)))
                .start();

        try (Observation.Scope ignored = observation.openScope()) {
            return execute(observation, normalizedOrderId);
        } catch (RuntimeException exception) {
            observation.error(exception);
            markError(observation, exception);
            throw exception;
        } finally {
            observation.stop();
        }
    }

    private OrderStatus execute(Observation observation, String normalizedOrderId) {
        OrderStatus result = new OrderStatus(
                normalizedOrderId,
                STATUSES.getOrDefault(normalizedOrderId, "NOT_FOUND"));
        observation.getContext().addHighCardinalityKeyValue(
                KeyValue.of("langfuse.observation.type", "tool"));
        observation.getContext().addHighCardinalityKeyValue(
                KeyValue.of(
                        "langfuse.observation.input",
                        toJson(Map.of("orderId", normalizedOrderId))));
        observation.getContext().addHighCardinalityKeyValue(
                KeyValue.of("langfuse.observation.output", toJson(result)));
        return result;
    }

    private boolean isToolCallObservation(Observation observation) {
        if (observation == null || observation.getContext().getName() == null) {
            return false;
        }
        String name = observation.getContext().getName();
        // Spring AI names the framework-created tool span `spring.ai.tool`;
        // Langfuse renders it as `tool_call <tool-name>`.
        return name.startsWith("spring.ai.tool") || name.startsWith("tool_call");
    }

    private void markError(Observation observation, RuntimeException exception) {
        observation.getContext().addHighCardinalityKeyValue(
                KeyValue.of("langfuse.observation.level", "ERROR"));
        observation.getContext().addHighCardinalityKeyValue(
                KeyValue.of(
                        "langfuse.observation.status_message",
                        exception.getMessage() == null
                                ? exception.getClass().getSimpleName()
                                : exception.getMessage()));
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }
}
