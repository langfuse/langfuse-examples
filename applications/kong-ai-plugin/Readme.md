# Kong AI Tracing Plugin

A high-performance **Kong Gateway plugin** for comprehensive AI observability and distributed tracing. Automatically captures, enriches, and exports AI request/response data to [Langfuse](https://langfuse.com) for full-stack LLM monitoring.

---

## 🚀 Features

### 🔍 Auto-Detection & Compatibility
- **OpenAI Compatible APIs**: `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`
- **vLLM Endpoints**: `/generate`, `/v1/completions`
- **Custom AI Providers**: Extensible detection framework

### 📊 Comprehensive Telemetry
- **User & Session Context**: `user_id`, `session_id`, `chat_id`, `organization_id`
- **Performance Metrics**: Latency, throughput, token-level timing
- **Token Analytics**: Prompt tokens, completion tokens, total usage
- **Content Tracing**: Full conversation history, input/output content
- **Generation Parameters**: Temperature, max_tokens, top_p, frequency_penalty

### ⚡ Production Ready
- **Non-Blocking Architecture**: Async timers for Langfuse export
- **Error Resilience**: Graceful degradation on external service failures
- **High Performance**: Minimal overhead on request processing
- **Structured Logging**: Kong-native logging with JSON formatting

---

## 🛠 Installation

### Method 1: Docker Deployment (Recommended)

```yaml
# docker-compose.yml
version: '3.8'

services:
  kong:
    image: kong:3.4
    environment:
      KONG_PLUGINS: bundled,ai-tracing
      KONG_LUA_PACKAGE_PATH: /usr/local/kong/plugins/?.lua;;
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong
    volumes:
      - ./plugins/ai-tracing:/usr/local/kong/plugins/ai-tracing
    ports:
      - "8000:8000"
      - "8001:8001"
```

### Method 2: Traditional Installation

```bash
# Install via LuaRocks
luarocks install kong-plugin-ai-tracing

# Or build from source
git clone https://github.com/your-org/kong-ai-tracing.git
cd kong-ai-tracing
luarocks make rockspec/kong-plugin-ai-tracing-1.0.0-1.rockspec
```

### Enable Plugin

```bash
# Add to kong.conf
plugins = bundled,ai-tracing

# Or via environment variable
export KONG_PLUGINS=bundled,ai-tracing
```

---

## ⚙️ Configuration

### Plugin Configuration via Admin API

```bash
curl -X POST http://localhost:8001/services/your-ai-service/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ai-tracing",
    "config": {
      "langfuse_enabled": true,
      "langfuse_public_key": "pk-lf-xxxxxxxxxxxx",
      "langfuse_secret_key": "sk-lf-xxxxxxxxxxxx",
      "langfuse_endpoint": "https://cloud.langfuse.com/api/public/ingestion",
      "langfuse_timeout": 5000,
      "environment": "production",
      "log_level": "info"
    }
  }'
```

### Configuration Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `langfuse_enabled` | `boolean` | `false` | Enable/disable Langfuse integration |
| `langfuse_public_key` | `string` | Required | Langfuse public key |
| `langfuse_secret_key` | `string` | Required | Langfuse secret key |
| `langfuse_endpoint` | `string` | `https://cloud.langfuse.com/api/public/ingestion` | Langfuse API endpoint |
| `langfuse_timeout` | `number` | `5000` | HTTP timeout in milliseconds |
| `environment` | `string` | `production` | Deployment environment tag |
| `log_level` | `string` | `info` | Log level (`debug`, `info`, `warn`, `error`) |

---

## 📡 Usage

### Basic AI Request

```bash
curl -X POST http://kong-gateway:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-12345" \
  -H "X-Session-Id: session-abcde" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Explain quantum computing in simple terms"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### Advanced Request with Metadata

```bash
curl -X POST http://kong-gateway:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-12345" \
  -H "X-Chat-Id: chat-67890" \
  -H "X-Organization-Id: org-acme" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "system",
       "content": "You are a helpful assistant."
      }
    ],
    "temperature": 0.8,
    "max_tokens": 100,
    "stream": false,
    "metadata": {
      "user_id": "user-12345",
      "chat_id": "chat-67890",
      "session_id": "session-abcde",
      "project_id": "project-xyz",
      "features": {
        "web_search": true,
        "image_generation": false } ,
      "variables": {
        "user_tier": "premium",
        "language": "en"},
    }'

```

### Supported Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-User-Id` | Unique user identifier | `user-12345` |
| `X-Session-Id` | Session identifier | `session-abcde` |
| `X-Chat-Id` | Chat/conversation ID | `chat-67890` |
| `X-Message-Id` | Individual message ID | `msg-54321` |
| `X-Organization-Id` | Organization context | `org-acme` |
| `X-Project-Id` | Project identifier | `project-xyz` |

---

## 📊 Data Model

### Trace Structure in Langfuse

```json
{
  "trace": {
    "id": "trace-12345",
    "name": "/v1/chat/completions",
    "userId": "user-12345",
    "sessionId": "session-abcde",
    "metadata": {
      "provider": "openai_compatible",
      "model": "gpt-4",
      "status_code": 200,
      "total_duration_ms": 1250,
      "time_per_token_ms": 12.5,
      "throughput_tokens_per_second": 80.0
    }
  },
  "observations": [
    {
      "type": "input",
      "name": "prompt",
      "input": [...messages array...],
      "metadata": {
        "prompt_tokens": 150,
        "temperature": 0.7,
        "max_tokens": 500,
        "message_count": 3
      }
    },
    {
      "type": "output", 
      "name": "completion",
      "output": "The capital of France is Paris...",
      "metadata": {
        "completion_tokens": 25,
        "finish_reason": "stop",
        "total_tokens": 175,
        "response_id": "chatcmpl-abc123"
      }
    }
  ]
}
```

### Collected Metrics

#### Performance Metrics
- **Total Duration**: End-to-end request processing time
- **Time per Token**: Average latency per generated token
- **Throughput**: Tokens processed per second
- **Time to First Token**: Stream response latency (when available)

#### Token Analytics
- **Prompt Tokens**: Input token count
- **Completion Tokens**: Output token count  
- **Total Tokens**: Sum of prompt and completion tokens
- **Token Efficiency**: Completion tokens per prompt token

#### Content Metrics
- **Prompt Length**: Character count of input
- **Response Length**: Character count of output
- **Message Count**: Number of messages in conversation
- **Finish Reason**: Generation termination reason

---

## 🔧 Advanced Configuration

### Multiple Environment Setup

```bash
# Development
curl -X POST http://localhost:8001/services/ai-service-dev/plugins \
  --data "name=ai-tracing" \
  --data "config.langfuse_enabled=true" \
  --data "config.langfuse_public_key=pk-lf-dev-xxx" \
  --data "config.langfuse_secret_key=sk-lf-dev-xxx" \
  --data "config.environment=development"

# Production  
curl -X POST http://localhost:8001/services/ai-service-prod/plugins \
  --data "name=ai-tracing" \
  --data "config.langfuse_enabled=true" \
  --data "config.langfuse_public_key=pk-lf-prod-xxx" \
  --data "config.langfuse_secret_key=sk-lf-prod-xxx" \
  --data "config.environment=production"
```

### Custom AI Provider Detection

Extend the detection logic in `handler.lua`:

```lua
local function detect_ai_provider(path, headers)
    if path:find("/v1/chat/completions") then
        return "openai_compatible"
    elseif path:find("/anthropic") then
        return "anthropic"
    elseif path:find("/cohere") then
        return "cohere"
    else
        return "custom_provider"
    end
end
```

---

## 🐛 Troubleshooting

### Enable Debug Logging

```bash
curl -X PATCH http://localhost:8001/plugins/PLUGIN_ID \
  --data "config.log_level=debug"
```

### Common Issues

#### No Traces in Langfuse
1. Verify Langfuse credentials are correct
2. Check Kong logs for API errors
3. Confirm Langfuse endpoint is accessible from Kong
4. Validate request matches AI provider patterns

#### Missing User/Session Data
1. Ensure headers are properly set in requests
2. Check metadata field in request body
3. Verify header names match expected format

#### Performance Impact
1. Monitor Kong metrics during load
2. Check async timer performance
3. Verify Langfuse timeout settings

### Health Check Endpoint

```bash
# Verify plugin is active
curl http://localhost:8001/services/ai-service/plugins | jq '.data[] | select(.name=="ai-tracing")'

# Check Kong logs for plugin activity
docker-compose logs kong | grep "AI Tracing"
```

---

## 📈 Monitoring & Analytics

### Key Performance Indicators

- **Request Volume**: AI calls per minute
- **Average Latency**: End-to-end response time
- **Token Usage**: Cost and efficiency metrics
- **Error Rate**: Failed vs successful requests
- **User Engagement**: Active users and sessions

### Langfuse Dashboard Setup

1. **Traces View**: Filter by user, model, or time range
2. **Metrics Dashboard**: Token usage and latency trends
3. **User Analytics**: Usage patterns and behavior
4. **Cost Analysis**: Token consumption by project

---

## 🔒 Security Considerations

- **API Keys**: Store Langfuse credentials securely
- **Data Privacy**: Review exported data for PII compliance
- **Access Control**: Limit plugin configuration access
- **Network Security**: Ensure Kong-Langfuse communication is secure

---

### Development Setup

```bash
git clone https://github.com/Ramtinboreili/kong-ai-tracing.git
cd kong-ai-tracing

# Test with local Kong instance
kong migrations bootstrap
kong start

# Run tests
busted spec/
```

---

## 📄 License

Apache License © 2025 Ramtin Boreili

---

## 🆘 Support

- 📧 **Email**: ramtin.bor7hp@gmail.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/Ramtinboreili/kong-ai-tracing/issues)

---

**Maintained by Ramtin Boreili**  
*DevOps Engineer & Observability Specialist*  
[GitHub](https://github.com/Ramtinboreili) • [LinkedIn](https://linkedin.com/in/ramtinboreili)