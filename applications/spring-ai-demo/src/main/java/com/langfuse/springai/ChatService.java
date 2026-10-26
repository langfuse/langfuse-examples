package com.langfuse.springai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    static final Logger LOGGER = LoggerFactory.getLogger(ChatService.class);

    private final ChatClient chatClient;
    private final OrderLookupTool orderLookupTool;

    public ChatService(ChatClient.Builder builder, OrderLookupTool orderLookupTool) {
        this.chatClient = builder.build();
        this.orderLookupTool = orderLookupTool;
    }

    /**
     * Keeps the original demo endpoint working with its fixed prompt, and still
     * runs once on startup so the first trace appears without a manual call.
     */
    @EventListener(ApplicationReadyEvent.class)
    public String testAiCall() {
        LOGGER.info("Invoking LLM with the original demo prompt");
        String answer = chatClient.prompt("Reply with the word 'java'").call().content();
        LOGGER.info("AI answered: {}", answer);
        return answer;
    }

    /**
     * Runs a user prompt with the deterministic order tool enabled.
     */
    public String chat(String prompt) {
        LOGGER.info("Invoking LLM with order tool");
        String answer = chatClient
                .prompt()
                .user(prompt)
                .tools(orderLookupTool)
                .call()
                .content();
        LOGGER.info("AI answered: {}", answer);
        return answer;
    }
}
