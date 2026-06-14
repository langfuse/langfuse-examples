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

    public ChatService(ChatClient.Builder builder) {
        chatClient = builder.build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public String testAiCall() {
        LOGGER.info("Invoking LLM");
        String answer = chatClient.prompt("Reply with the word 'java'").call().content();
        LOGGER.info("AI answered: {}", answer);
        return answer;
    }
}
