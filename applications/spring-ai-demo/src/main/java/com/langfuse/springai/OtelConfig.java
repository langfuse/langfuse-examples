package com.langfuse.springai;

import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OtelConfig {

    @Value("${otel.exporter.otlp.headers.authorization}")
    private String authorizationHeader;

    @Bean
    public SpanExporter spanExporter() {
        return OtlpHttpSpanExporter.builder()
                .setEndpoint("http://localhost:3001/api/public/otel/v1/traces")
                .addHeader("Authorization", authorizationHeader)
                .build();
    }

    @Bean
    public BatchSpanProcessor spanProcessor(SpanExporter exporter) {
        return BatchSpanProcessor.builder(exporter).build();
    }
}