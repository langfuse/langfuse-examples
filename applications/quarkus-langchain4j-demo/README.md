# Langfuse Quarkus LangChain4J Demo Application

## Prerequisites

- Java 21+
- Langfuse stack ([Cloud](https://cloud.langfuse.com/) or [Self-Hosted](https://langfuse.com/docs/deployment/self-host))
- Langfuse API Keys
- An OpenAI Api Key

## How to run

1. Configure environment variables to connect Spring AI demo app with Langfuse.
   ```
   export QUARKUS_LANGCHAIN4J_OPENAI_API_KEY=sk-xxx-...
   export QUARKUS_OTEL_EXPORTER_OTLP_ENDPOINT="https://cloud.langfuse.com/api/public/otel" # 🇪🇺 EU data region
   # export QUARKUS_OTEL_EXPORTER_OTLP_ENDPOINT="https://us.cloud.langfuse.com/api/public/otel" # 🇺🇸 US data region
   # export QUARKUS_OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel" # 🏠 Local deployment (>= v3.22.0)
   export QUARKUS_OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(echo -n "pk-lf-xxx:sk-lf-xxx" | base64 | tr -d '\n')"
   ```
2. Run the sample application via `./mvnw quarkus:dev`.
3. Observe the new trace in the Langfuse web UI.

![sample-trace](./screenshots/quarkus-langchain4j-demo-trace.png)
