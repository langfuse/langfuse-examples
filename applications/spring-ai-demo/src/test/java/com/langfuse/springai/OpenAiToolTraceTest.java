package com.langfuse.springai;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import io.micrometer.observation.ObservationRegistry;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises the real Spring AI OpenAI client against a local fake OpenAI
 * endpoint. The first response asks for a tool call; the second returns the
 * final answer. No external API key or network call is needed.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "otel.traces.exporter=none",
                "otel.metrics.exporter=none",
                "otel.logs.exporter=none"
        })
class OpenAiToolTraceTest {

    private static final AtomicInteger REQUESTS = new AtomicInteger();
    private static final HttpServer OPENAI = startFakeOpenAi();

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObservationRegistry observationRegistry;

    private RecordingObservationHandler observations;

    @DynamicPropertySource
    static void openAiProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.ai.openai.api-key", () -> "test-key");
        registry.add("spring.ai.openai.base-url",
                () -> "http://127.0.0.1:" + OPENAI.getAddress().getPort());
        registry.add("spring.ai.openai.chat.options.model", () -> "test-model");
    }

    @BeforeEach
    void setUp() {
        REQUESTS.set(0);
        observations = new RecordingObservationHandler();
        observationRegistry.observationConfig().observationHandler(observations);
    }

    @AfterAll
    static void stopFakeOpenAi() {
        OPENAI.stop(0);
    }

    @Test
    void realChatClientExecutesToolInsideRootTrace() {
        int requestsBefore = REQUESTS.get();
        var response = restTemplate.postForEntity(
                "/v1/chat",
                new ChatRequest(
                        "Use the order lookup tool for order A1001 and answer with the status.",
                        "demo-user",
                        "demo-session"),
                ChatAnswer.class);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().answer()).contains("SHIPPED");
        assertThat(REQUESTS.get() - requestsBefore).isEqualTo(2);

        Observation.Context root = observations.find("handle-chat");
        Observation.Context tool = observations.findByPrefix("spring.ai.tool");

        assertThat(value(root, "langfuse.observation.output")).contains("SHIPPED");
        assertThat(value(tool, "langfuse.observation.type")).isEqualTo("tool");
        assertThat(value(tool, "langfuse.observation.input")).contains("A1001");
        assertThat(value(tool, "langfuse.observation.output")).contains("SHIPPED");
        assertThat(hasAncestor(tool, "handle-chat")).isTrue();
        assertThat(observations.countType("tool")).isEqualTo(1);
    }

    private static HttpServer startFakeOpenAi() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/v1/chat/completions", OpenAiToolTraceTest::handleChat);
            server.start();
            return server;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not start fake OpenAI server", exception);
        }
    }

    private static void handleChat(HttpExchange exchange) throws IOException {
        // The demo also calls the model once on startup, so pick the response
        // from the request body instead of relying on a global call counter.
        String requestBody = new String(
                exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        boolean toolsAvailable = requestBody.contains("\"tools\"");
        boolean isSecondRound = requestBody.contains("\"tool_call_id\"");
        REQUESTS.incrementAndGet();

        byte[] response;
        if (!toolsAvailable) {
            // The startup call registers no tool, so answer with plain text.
            response = """
                    {
                      "id": "chatcmpl-plain",
                      "object": "chat.completion",
                      "created": 1699999999,
                      "model": "test-model",
                      "choices": [{
                        "index": 0,
                        "message": {"role": "assistant", "content": "java"},
                        "finish_reason": "stop"
                      }],
                      "usage": {"prompt_tokens": 8, "completion_tokens": 1, "total_tokens": 9}
                    }
                    """.getBytes(StandardCharsets.UTF_8);
        } else if (!isSecondRound) {
            response = """
                    {
                      "id": "chatcmpl-tool",
                      "object": "chat.completion",
                      "created": 1700000000,
                      "model": "test-model",
                      "choices": [{
                        "index": 0,
                        "message": {
                          "role": "assistant",
                          "content": null,
                          "tool_calls": [{
                            "id": "call_1",
                            "type": "function",
                            "function": {
                              "name": "lookup_order",
                              "arguments": "{\\"orderId\\":\\"A1001\\"}"
                            }
                          }]
                        },
                        "finish_reason": "tool_calls"
                      }],
                      "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
                    }
                    """.getBytes(StandardCharsets.UTF_8);
        } else {
            response = """
                    {
                      "id": "chatcmpl-final",
                      "object": "chat.completion",
                      "created": 1700000001,
                      "model": "test-model",
                      "choices": [{
                        "index": 0,
                        "message": {"role": "assistant", "content": "Order A1001 is SHIPPED."},
                        "finish_reason": "stop"
                      }],
                      "usage": {"prompt_tokens": 20, "completion_tokens": 8, "total_tokens": 28}
                    }
                    """.getBytes(StandardCharsets.UTF_8);
        }

        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.length);
        try (OutputStream body = exchange.getResponseBody()) {
            body.write(response);
        }
    }

    private static String value(Observation.Context context, String key) {
        var keyValue = context.getHighCardinalityKeyValue(key);
        return keyValue == null ? null : keyValue.getValue();
    }

    private static boolean hasAncestor(Observation.Context context, String expectedName) {
        var parent = context.getParentObservation();
        while (parent != null) {
            if (expectedName.equals(parent.getContextView().getName())) {
                return true;
            }
            parent = parent.getContextView().getParentObservation();
        }
        return false;
    }

    static class RecordingObservationHandler implements ObservationHandler<Observation.Context> {

        private final List<Observation.Context> contexts = new CopyOnWriteArrayList<>();

        @Override
        public boolean supportsContext(Observation.Context context) {
            return true;
        }

        @Override
        public void onStart(Observation.Context context) {
            contexts.add(context);
        }

        Observation.Context find(String name) {
            return contexts.stream()
                    .filter(context -> name.equals(context.getName()))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("Missing observation: " + name));
        }

        Observation.Context findByPrefix(String prefix) {
            return contexts.stream()
                    .filter(context -> context.getName() != null
                            && context.getName().startsWith(prefix))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError(
                            "Missing observation prefix: " + prefix + " in " + contexts.stream()
                                    .map(Observation.Context::getName)
                                    .toList()));
        }

        long countType(String type) {
            return contexts.stream()
                    .filter(context -> {
                        var keyValue = context.getHighCardinalityKeyValue(
                                "langfuse.observation.type");
                        return keyValue != null && type.equals(keyValue.getValue());
                    })
                    .count();
        }
    }
}
