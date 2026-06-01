# Langfuse Spring AI Demo Application

## Prerequisites

- Java 21+
- Langfuse stack ([Cloud](https://cloud.langfuse.com/) or [Self-Hosted](https://langfuse.com/docs/deployment/self-host))
- Langfuse API Keys
- An OpenAI Api Key

## How to run

1. Configure environment variables to connect Spring AI demo app with Langfuse.
   ```
   export SPRING_AI_OPENAI_APIKEY="sk-proj-xxx"
   export OTEL_EXPORTER_OTLP_ENDPOINT="https://cloud.langfuse.com/api/public/otel" # 🇪🇺 EU data region
   # export OTEL_EXPORTER_OTLP_ENDPOINT="https://us.cloud.langfuse.com/api/public/otel" # 🇺🇸 US data region
   # export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel" # 🏠 Local deployment (>= v3.22.0)
   export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(echo -n "pk-lf-xxx:sk-lf-xxx" | base64 | tr -d '\n')"
   ```
2. Run the sample application with `./mvnw clean install spring-boot:run`.
3. Call the chat endpoint with `curl localhost:8080/v1/chat`.
4. Observe the new trace in the Langfuse web UI.

![sample-trace](./screenshots/spring-ai-demo-trace.png)
