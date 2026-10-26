package com.langfuse.springai;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.ObservationView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        classes = {SpringAiDemoApplication.class, TraceContractTest.TestConfig.class},
        properties = {
                "spring.ai.openai.api-key=test-key",
                "otel.traces.exporter=none",
                "otel.metrics.exporter=none",
                "otel.logs.exporter=none"
        })
class TraceContractTest {

    @Autowired
    private ChatController chatController;

    @Autowired
    private ObservationRegistry observationRegistry;

    @Autowired
    private OrderLookupTool orderLookupTool;

    private RecordingObservationHandler observations;

    @BeforeEach
    void setUp() {
        observations = new RecordingObservationHandler();
        observationRegistry.observationConfig().observationHandler(observations);
    }

    @Test
    void rootObservationExposesLangfuseAttributes() {
        ChatAnswer response = chatController.post(
                new ChatRequest(
                        "Use the order lookup tool for order A1001 and answer with the status.",
                        "demo-user",
                        "demo-session"));

        assertThat(response.answer()).isNotBlank();

        Observation.Context root = observations.find("handle-chat");

        assertThat(value(root, "langfuse.user.id")).isEqualTo("demo-user");
        assertThat(value(root, "langfuse.session.id")).isEqualTo("demo-session");
        assertThat(value(root, "langfuse.environment")).isEqualTo("development");
        assertThat(value(root, "langfuse.observation.input"))
                .contains("A1001")
                .contains("\"role\":\"user\"");
        assertThat(value(root, "langfuse.observation.output"))
                .contains("\"role\":\"assistant\"");
    }

    @Test
    void toolObservationIsNestedAndExposesArgumentsAndResult() {
        Observation root = Observation
                .createNotStarted("handle-chat", observationRegistry)
                .start();
        try (Observation.Scope ignored = root.openScope()) {
            OrderStatus status = orderLookupTool.lookup("A1001");
            assertThat(status.status()).isEqualTo("SHIPPED");
        } finally {
            root.stop();
        }

        Observation.Context tool = observations.find("lookup-order");

        assertThat(value(tool, "langfuse.observation.type")).isEqualTo("tool");
        assertThat(value(tool, "langfuse.observation.input")).contains("A1001");
        assertThat(value(tool, "langfuse.observation.output")).contains("SHIPPED");
        assertThat(hasAncestor(tool, "handle-chat")).isTrue();
    }

    @Test
    void unknownOrderIsReturnedWithoutBreakingTheTrace() {
        Observation root = Observation
                .createNotStarted("handle-chat", observationRegistry)
                .start();
        try (Observation.Scope ignored = root.openScope()) {
            OrderStatus status = orderLookupTool.lookup("A9999");
            assertThat(status.status()).isEqualTo("NOT_FOUND");
        } finally {
            root.stop();
        }

        Observation.Context tool = observations.find("lookup-order");

        assertThat(value(tool, "langfuse.observation.output")).contains("NOT_FOUND");
        assertThat(value(tool, "langfuse.observation.level")).isNull();
    }

    private static String value(Observation.Context context, String key) {
        var keyValue = context.getHighCardinalityKeyValue(key);
        return keyValue == null ? null : keyValue.getValue();
    }

    private static boolean hasAncestor(Observation.Context context, String expectedName) {
        ObservationView parent = context.getParentObservation();
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
    }

    static class FakeChatModel implements ChatModel {

        @Override
        public ChatResponse call(Prompt prompt) {
            return new ChatResponse(List.of(new Generation(
                    new AssistantMessage("Order status resolved by tool."))));
        }

        @Override
        public ChatOptions getDefaultOptions() {
            return ChatOptions.builder().build();
        }
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        @Primary
        FakeChatModel fakeChatModel() {
            return new FakeChatModel();
        }
    }
}
