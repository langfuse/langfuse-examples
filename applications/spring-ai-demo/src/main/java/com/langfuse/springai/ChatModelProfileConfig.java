package com.langfuse.springai;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

@Configuration
public class ChatModelProfileConfig {

    @Bean
    @Primary
    @Profile("openai")
    public ChatModel openAiChatModel(@Qualifier("openAiChatModel") ChatModel delegate) {
        return delegate;
    }

    @Bean
    @Primary
    @Profile("google")
    public ChatModel googleChatModel(@Qualifier("googleGenAiChatModel") ChatModel delegate) {
        return delegate;
    }
}
