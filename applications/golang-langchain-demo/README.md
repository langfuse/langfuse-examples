# Langfuse Go Langchain Demo Application

## Prerequisites

- Go 1.19+
- Langfuse stack ([Cloud](https://cloud.langfuse.com/) or [Self-Hosted](https://langfuse.com/docs/deployment/self-host))
- Langfuse API Keys
- An OpenAI API Key

## How to run

1. Configure environment variables to connect the Go demo app with Langfuse.
   ```bash
   export OPENAI_API_KEY="sk-proj-xxx"
   export OTEL_EXPORTER_OTLP_ENDPOINT="https://cloud.langfuse.com/api/public/otel" # 🇪🇺 EU data region
   # export OTEL_EXPORTER_OTLP_ENDPOINT="https://us.cloud.langfuse.com/api/public/otel" # 🇺🇸 US data region
   # export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel" # 🏠 Local deployment (>= v3.22.0)
   export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(echo -n "pk-lf-xxx:sk-lf-xxx" | base64 | tr -d '\n')"
   ```
   
2. Provision dependencies:
   ```bash
   go mod vendor
   ```

2. Run the application:
   ```bash
   go run main.go
   ```

3. Call the chat endpoint:
   ```bash
   curl localhost:8080/chat
   ```

4. Observe the new trace in the Langfuse web UI.

![sample-trace](./screenshots/go-langchain-demo-trace.png)
