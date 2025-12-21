package com.langfuse.springai;

import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * @author yingzi
 * @since 2025/12/21
 */

@Configuration
public class LangfuseObservationConfig {

    @Bean
    public OtlpHttpSpanExporter otlpHttpSpanExporter() {
        return OtlpHttpSpanExporter.builder()
                .setEndpoint("https://cloud.langfuse.com")
                // echo -n "pk-xxx:sk-xxx" | base64
                .addHeader("Authorization", "Basic xxx")
                .build();
    }
}