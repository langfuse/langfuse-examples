package = "kong-plugin-ai-tracing"
version = "1.0.0-1"
source = {
  url = "git://github.com/Ramtinboreili/kong-langfuse-tracing"
}
description = {
  summary = "A Kong plugin that provides AI request tracing and observability by exporting traces to Langfuse.",
  homepage = "https://github.com/Ramtinboreili/kong-langfuse-tracing",
  license = "MIT"
}
dependencies = {
  "lua-resty-http >= 0.15",
  "lua-cjson >= 2.1.0"
}
build = {
  type = "builtin",
  modules = {
    ["kong.plugins.ai-tracing.handler"] = "kong/plugins/ai-tracing/handler.lua",
    ["kong.plugins.ai-tracing.schema"] = "kong/plugins/ai-tracing/schema.lua"
  }
}
