return {
    name = "ai-tracing",
    fields = {
      {
        config = {
          type = "record",
          fields = {
            { enabled = { type = "boolean", default = true } },
            { langfuse_enabled = { type = "boolean", default = false } },
            { langfuse_endpoint = { type = "string", default = "https://cloud.langfuse.com/api/traces" } },
            { langfuse_public_key = { type = "string" } },
            { langfuse_secret_key = { type = "string" } },
            { langfuse_timeout = { type = "number", default = 5000 } },
          }
        }
      }
    }
  }