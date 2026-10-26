package com.langfuse.springai;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.common.KeyValue;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/v1/chat")
public class ChatController {

    private final ChatService chatService;
    private final ObservationRegistry observationRegistry;
    private final ObjectMapper objectMapper;
    private final String environment;

    public ChatController(
            ChatService chatService,
            ObservationRegistry observationRegistry,
            ObjectMapper objectMapper,
            @Value("${langfuse.environment:development}") String environment) {
        this.chatService = chatService;
        this.observationRegistry = observationRegistry;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    /**
     * Original demo endpoint. Kept for backwards compatibility.
     */
    @GetMapping
    public String get() {
        return chatService.testAiCall();
    }

    /**
     * Traced chat endpoint with user/session and a deterministic tool call.
     */
    @PostMapping
    public ChatAnswer post(@RequestBody ChatRequest request) {
        String prompt = requirePrompt(request);
        String userId = defaultIfBlank(request.userId(), "anonymous");
        String sessionId = defaultIfBlank(request.sessionId(), "anonymous-session");

        Observation observation = Observation
                .createNotStarted("handle-chat", observationRegistry)
                .contextualName("handle-chat")
                .highCardinalityKeyValue("langfuse.user.id", userId)
                .highCardinalityKeyValue("langfuse.session.id", sessionId)
                .highCardinalityKeyValue("langfuse.environment", environment)
                .highCardinalityKeyValue(
                        "langfuse.observation.input",
                        toJson(List.of(Map.of("role", "user", "content", prompt))))
                .start();

        try (Observation.Scope ignored = observation.openScope()) {
            String answer = chatService.chat(prompt);
            String safeAnswer = answer == null ? "" : answer;
            observation.getContext().addHighCardinalityKeyValue(
                    KeyValue.of(
                            "langfuse.observation.output",
                            toJson(List.of(
                                    Map.of("role", "assistant", "content", safeAnswer)))));
            return new ChatAnswer(safeAnswer);
        } catch (RuntimeException exception) {
            observation.error(exception);
            observation.getContext().addHighCardinalityKeyValue(
                    KeyValue.of("langfuse.observation.level", "ERROR"));
            observation.getContext().addHighCardinalityKeyValue(
                    KeyValue.of(
                            "langfuse.observation.status_message",
                            exception.getMessage() == null
                                    ? exception.getClass().getSimpleName()
                                    : exception.getMessage()));
            throw exception;
        } finally {
            observation.stop();
        }
    }

    private String requirePrompt(ChatRequest request) {
        if (request == null || request.prompt() == null || request.prompt().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "prompt must not be blank");
        }
        return request.prompt().trim();
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }
}
