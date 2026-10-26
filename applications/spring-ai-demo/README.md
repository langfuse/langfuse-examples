# Langfuse Spring AI Demo Application

## Prerequisites

- Java 21+
- Langfuse stack ([Cloud](https://cloud.langfuse.com/) or [Self-Hosted](https://langfuse.com/docs/deployment/self-host))
- Langfuse API Keys
- An OpenAI Api Key

## How to run

1. Configure environment variables to connect Spring AI demo app with Langfuse.
   ```
   export SPRING_AI_OPENAI_API_KEY="sk-proj-xxx"
   export OTEL_EXPORTER_OTLP_ENDPOINT="https://cloud.langfuse.com/api/public/otel" # 🇪🇺 EU data region
   # export OTEL_EXPORTER_OTLP_ENDPOINT="https://us.cloud.langfuse.com/api/public/otel" # 🇺🇸 US data region
   # export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/api/public/otel" # 🏠 Local deployment (>= v3.22.0)
   export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(echo -n "pk-lf-xxx:sk-lf-xxx" | base64)"
   ```
2. Run the sample application with `./mvnw clean install spring-boot:run`.
3. Call the original chat endpoint with `curl localhost:8080/v1/chat`.
4. Observe the new trace in the Langfuse web UI.

![sample-trace](./screenshots/spring-ai-demo-trace.png)

## Tool-call trace example

The original `GET /v1/chat` endpoint is kept for backwards compatibility. The
traced example is `POST /v1/chat`, which enables a deterministic
`lookup_order` tool and sets Langfuse trace attributes explicitly:

```bash
curl -X POST localhost:8080/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Use the order lookup tool for order A1001 and answer with the status.",
    "userId": "demo-user",
    "sessionId": "demo-session"
  }'
```

The tool returns deterministic data, so the trace can be reproduced without an
order service:

| orderId | status |
| --- | --- |
| A1001 | SHIPPED |
| A1002 | PROCESSING |
| anything else | NOT_FOUND |

The resulting trace is intentionally small:

```text
handle-chat                      (root; user/session/environment/input/output)
└─ chat <model>                  (Spring AI generation)
   └─ tool_call lookup_order     (existing Spring AI span, type=tool)
```

The root span carries `langfuse.user.id`, `langfuse.session.id`,
`langfuse.environment`, `langfuse.observation.input`, and
`langfuse.observation.output`. Input/output use the OpenAI message-list shape
(`role` + `content`) so the Langfuse UI renders them as a conversation. The
existing Spring AI `tool_call` span is enriched with its arguments and result
in `langfuse.observation.input` / `langfuse.observation.output`; no duplicate
tool span is created.

The demo disables duplicate HTTP server/client spans in `application.yml` so
Langfuse only shows the AI and tool chain.

## Tests

```bash
./mvnw test
```

If the Maven wrapper JAR is not present in your checkout, use a local Maven
3.9+ installation with `mvn test` instead.

`TraceContractTest` checks the Langfuse attributes and tool nesting without
calling an external model. `OpenAiToolTraceTest` runs the real Spring AI
OpenAI client against a local fake OpenAI endpoint, forces a tool call, and
asserts that the second model request completes inside the same root trace.
