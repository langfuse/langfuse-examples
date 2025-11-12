local AiTracingHandler = {}

AiTracingHandler.PRIORITY = 1000
AiTracingHandler.VERSION = "1.0.0"

-- Check if path should be ignored
local function should_ignore_path(path)
    local ignore_patterns = {
        "/v1/models",
        "/health",
        "/metrics",
        "/status"
    }
    
    for _, pattern in ipairs(ignore_patterns) do
        if path:find(pattern, 1, true) then -- true for plain match
            return true
        end
    end
    
    return false
end

-- Extract user and session metadata from headers and body
local function extract_user_session_metadata(headers, request_body)
    local cjson = require("cjson")
    
    -- Extract user info from multiple possible sources
    local user_id = headers["x-user-id"] or 
                   headers["user-id"] or 
                   headers["x-user-email"] or 
                   headers["user-email"] or
                   headers["x-auth-user"] or
                   headers["authorization-user"] or
                   "anonymous_" .. ngx.md5(ngx.var.remote_addr)
    
    -- Remove "anonymous_" prefix if we found actual user data
    if user_id ~= "anonymous_" .. ngx.md5(ngx.var.remote_addr) then
        -- It's a real user identifier
    else
        -- It's anonymous, use a shorter format
        user_id = "anonymous"
    end

    local metadata = {
        user_id = user_id,
        user_email = headers["x-user-email"] or headers["user-email"],
        session_id = headers["x-session-id"] or headers["session-id"] or ngx.md5(ngx.var.remote_addr .. ngx.now()),
        organization_id = headers["openai-organization"] or headers["x-organization-id"],
        project_id = headers["x-project-id"] or headers["project-id"],
        chat_id = nil,
        message_id = nil,
        filter_ids = {},
        tool_ids = nil,
        tool_servers = {},
        files = nil,
        variables = {},
        model_info = {},
        features = {},
        params = {},
        input = nil,
        output = nil
    }

    -- Parse request body for additional metadata
    if request_body then
        local ok, req_data = pcall(cjson.decode, request_body)
        if ok and req_data then
            -- Extract direct input/output if available
            metadata.input = req_data.input or metadata.input
            metadata.output = req_data.output or metadata.output

            -- Extract from metadata field
            if req_data.metadata then
                metadata.user_id = req_data.metadata.user_id or metadata.user_id
                metadata.user_email = req_data.metadata.user_email or metadata.user_email
                metadata.chat_id = req_data.metadata.chat_id
                metadata.message_id = req_data.metadata.message_id
                metadata.session_id = req_data.metadata.session_id or metadata.session_id
                metadata.filter_ids = req_data.metadata.filter_ids or {}
                metadata.tool_ids = req_data.metadata.tool_ids
                metadata.tool_servers = req_data.metadata.tool_servers or {}
                metadata.files = req_data.metadata.files
                metadata.variables = req_data.metadata.variables or {}
                metadata.model_info = req_data.metadata.model or {}
                metadata.features = req_data.metadata.features or {}
                metadata.params = req_data.metadata.params or {}
                metadata.direct = req_data.metadata.direct or false
                metadata.input = req_data.metadata.input or metadata.input
                metadata.output = req_data.metadata.output or metadata.output
            end

            -- Extract user info from request body
            if req_data.user then
                if type(req_data.user) == "string" then
                    metadata.user_id = req_data.user
                elseif type(req_data.user) == "table" then
                    metadata.user_id = req_data.user.id or req_data.user.user_id or metadata.user_id
                    metadata.user_email = req_data.user.email or req_data.user.user_email or metadata.user_email
                end
            end

            -- Extract from features field
            if req_data.features then
                metadata.features = req_data.features
            end

            -- Extract model capabilities if available
            if metadata.model_info and metadata.model_info.info and metadata.model_info.info.meta then
                metadata.capabilities = metadata.model_info.info.meta.capabilities or {}
            end

            -- Extract all available fields from request body for comprehensive tracing
            metadata.raw_request_body = req_data
        end
    end

    return metadata
end

-- Detect AI provider
local function detect_ai_provider(path, headers)
    if path:find("/v1/chat/completions") or path:find("/v1/completions") or path:find("/v1/embeddings") then
        return "openai_compatible"
    elseif path:find("/generate") or path:find("/v1/completions") then
        return "vllm"
    else
        return "unknown"
    end
end

-- Convert messages to plain text for display
local function messages_to_plain_text(messages)
    if not messages or type(messages) ~= "table" then
        return ""
    end
    
    local text = ""
    for _, msg in ipairs(messages) do
        if msg.role and msg.content then
            text = text .. msg.role .. ": " .. msg.content .. "\n"
        end
    end
    return text
end

-- Extract complete AI metadata from request/response
local function extract_ai_metadata(request_body, response_body)
    local cjson = require("cjson")
    local metadata = {
        -- Basic model info
        model = "unknown",
        stream = false,
        
        -- Content info
        messages = {},
        input = "",
        output = "",
        prompt_length = 0,
        response_length = 0,
        
        -- Token usage
        usage = {},
        total_tokens = 0,
        prompt_tokens = 0,
        completion_tokens = 0,
        
        -- Response details
        finish_reason = nil,
        response_id = nil,
        created = nil,
        object = nil,
        
        -- Generation parameters
        temperature = nil,
        max_tokens = nil,
        top_p = nil,
        frequency_penalty = nil,
        presence_penalty = nil,
        
        -- Features and capabilities
        features = {},
        capabilities = {},
        
        -- Raw data for comprehensive tracing
        raw_request = nil,
        raw_response = nil
    }

    -- Parse request body
    if request_body then
        local ok, req_data = pcall(cjson.decode, request_body)
        if ok and req_data then
            -- Store raw request for comprehensive tracing
            metadata.raw_request = req_data

            -- Basic model and stream info
            metadata.model = req_data.model or "unknown"
            metadata.stream = req_data.stream or false

            -- Extract messages
            if req_data.messages and type(req_data.messages) == "table" then
                metadata.messages = req_data.messages
                
                -- Build input text from messages (plain text)
                metadata.input = messages_to_plain_text(req_data.messages)
                for _, msg in ipairs(req_data.messages) do
                    if msg.content then
                        metadata.prompt_length = metadata.prompt_length + #msg.content
                    end
                end
            elseif req_data.prompt then
                metadata.input = req_data.prompt
                metadata.prompt_length = #req_data.prompt
            elseif req_data.input then
                metadata.input = req_data.input
                metadata.prompt_length = #req_data.input
            end

            -- Extract generation parameters
            metadata.temperature = req_data.temperature
            metadata.max_tokens = req_data.max_tokens
            metadata.top_p = req_data.top_p
            metadata.frequency_penalty = req_data.frequency_penalty
            metadata.presence_penalty = req_data.presence_penalty

            -- Extract features
            if req_data.features then
                metadata.features = req_data.features
            end

            -- Extract metadata field
            if req_data.metadata then
                -- Extract capabilities from model info
                if req_data.metadata.model and req_data.metadata.model.info and req_data.metadata.model.info.meta then
                    metadata.capabilities = req_data.metadata.model.info.meta.capabilities or {}
                end
                
                -- Extract features from metadata
                if req_data.metadata.features then
                    metadata.features = req_data.metadata.features
                end
            end
        else
            -- If JSON parsing fails, store as raw text
            metadata.input = request_body
            metadata.prompt_length = #request_body
        end
    end

    -- Parse response body
    if response_body then
        local ok, res_data = pcall(cjson.decode, response_body)
        if ok and res_data then
            -- Store raw response for comprehensive tracing
            metadata.raw_response = res_data

            metadata.model = metadata.model or res_data.model or "unknown"

            -- Extract usage data
            if res_data.usage then
                metadata.usage = res_data.usage
                metadata.total_tokens = res_data.usage.total_tokens or 0
                metadata.prompt_tokens = res_data.usage.prompt_tokens or 0
                metadata.completion_tokens = res_data.usage.completion_tokens or 0
            end

            -- Extract output and finish reason
            if res_data.choices and res_data.choices[1] then
                local choice = res_data.choices[1]
                
                -- Extract finish reason
                metadata.finish_reason = choice.finish_reason or choice.stop_reason
                
                -- Extract output content (plain text)
                if choice.message then
                    if choice.message.content then
                        metadata.output = choice.message.content
                        metadata.response_length = #choice.message.content
                    end
                elseif choice.text then
                    metadata.output = choice.text
                    metadata.response_length = #choice.text
                end
            elseif res_data.output then
                metadata.output = res_data.output
                metadata.response_length = #res_data.output
            end

            -- Extract other response data
            metadata.response_id = res_data.id
            metadata.created = res_data.created
            metadata.object = res_data.object
        else
            -- If JSON parsing fails, store as raw text
            metadata.output = response_body
            metadata.response_length = #response_body
        end
    end

    return metadata
end

-- Calculate latency metrics
local function calculate_latency_metrics(start_time, end_time, total_tokens)
    local total_duration = end_time - start_time
    local total_tokens_num = total_tokens or 0
    
    return {
        total_latency_ms = total_duration * 1000,
        time_per_token = total_tokens_num > 0 and (total_duration * 1000 / total_tokens_num) or 0,
        throughput_tokens_per_second = total_duration > 0 and (total_tokens_num / total_duration) or 0
    }
end

-- Send complete trace to Langfuse
local function send_to_langfuse_async(conf, trace_data)
    local http = require("resty.http")
    local cjson = require("cjson")

    if not conf.langfuse_enabled then
        kong.log.debug("Langfuse disabled, skipping trace export")
        return
    end

    -- Calculate latency metrics
    local latency_metrics = calculate_latency_metrics(
        trace_data.start_time, 
        trace_data.start_time + trace_data.duration, 
        trace_data.total_tokens
    )

    -- Prepare Langfuse payload with proper batch structure
    local langfuse_payload = { batch = {} }

    -- Main trace with input and output as plain text
    local trace_body = {
        id = trace_data.trace_id,
        name = trace_data.name,
        userId = trace_data.user_id,
        sessionId = trace_data.session_id,
        input = trace_data.input,  -- Plain text
        output = trace_data.output, -- Plain text
        metadata = {
            -- Basic request info
            provider = trace_data.provider,
            model = trace_data.model,
            method = trace_data.method,
            path = trace_data.path,
            status_code = trace_data.status_code,
            
            -- Latency metrics
            total_duration_ms = trace_data.duration * 1000,
            time_per_token_ms = latency_metrics.time_per_token,
            throughput_tokens_per_second = latency_metrics.throughput_tokens_per_second,
            
            -- Token usage
            total_tokens = trace_data.total_tokens,
            prompt_tokens = trace_data.prompt_tokens,
            completion_tokens = trace_data.completion_tokens,
            prompt_length = trace_data.prompt_length,
            response_length = trace_data.response_length,
            
            -- Generation parameters
            temperature = trace_data.temperature,
            max_tokens = trace_data.max_tokens,
            top_p = trace_data.top_p,
            frequency_penalty = trace_data.frequency_penalty,
            presence_penalty = trace_data.presence_penalty,
            stream = trace_data.stream,
            finish_reason = trace_data.finish_reason,
            
            -- User and session context
            user_id = trace_data.user_id,
            user_email = trace_data.user_email,
            chat_id = trace_data.chat_id,
            message_id = trace_data.message_id,
            session_id = trace_data.session_id,
            organization_id = trace_data.organization_id,
            project_id = trace_data.project_id,
            
            -- Filter and tool info
            filter_ids = trace_data.filter_ids,
            tool_ids = trace_data.tool_ids,
            tool_servers = trace_data.tool_servers,
            files = trace_data.files,
            direct = trace_data.direct,
            
            -- Features and capabilities
            features = trace_data.features,
            capabilities = trace_data.capabilities,
            variables = trace_data.variables,
            params = trace_data.params,
            
            -- Model info
            model_info = trace_data.model_info,
            
            -- Response info
            response_id = trace_data.response_id,
            created_timestamp = trace_data.created,
            object = trace_data.object,

            -- Raw data availability
            has_raw_request = trace_data.raw_request ~= nil,
            has_raw_response = trace_data.raw_response ~= nil,
            
            -- Message info
            message_count = #trace_data.messages,
            has_messages = #trace_data.messages > 0
        },
        tags = {
            "kong", 
            "ai-gateway", 
            trace_data.provider, 
            trace_data.model,
            trace_data.user_id ~= "anonymous" and "authenticated" or "anonymous",
            trace_data.chat_id or "no-chat"
        }
    }

    -- Add raw request data to metadata if available
    if trace_data.raw_request then
        trace_body.metadata.raw_request = trace_data.raw_request
    end

    -- Add raw response data to metadata if available
    if trace_data.raw_response then
        trace_body.metadata.raw_response = trace_data.raw_response
    end

    table.insert(langfuse_payload.batch, {
        id = trace_data.trace_id .. "-trace",
        type = "trace-create",
        timestamp = os.date("!%Y-%m-%dT%H:%M:%S.000Z", trace_data.start_time),
        body = trace_body
    })

    -- Add detailed input observation (prompt with full messages as JSON for detailed view)
    if #trace_data.messages > 0 then
        table.insert(langfuse_payload.batch, {
            id = trace_data.trace_id .. "-input",
            type = "observation-create",
            timestamp = os.date("!%Y-%m-%dT%H:%M:%S.000Z", trace_data.start_time),
            body = {
                id = trace_data.trace_id .. "-input",
                traceId = trace_data.trace_id,
                type = "GENERATION",
                name = "prompt",
                input = trace_data.messages, -- Full messages as JSON for detailed analysis
                metadata = {
                    prompt_length = trace_data.prompt_length,
                    prompt_tokens = trace_data.prompt_tokens,
                    model = trace_data.model,
                    temperature = trace_data.temperature,
                    max_tokens = trace_data.max_tokens,
                    message_count = #trace_data.messages,
                    stream = trace_data.stream,
                    features = trace_data.features,
                    capabilities = trace_data.capabilities
                }
            }
        })
    elseif trace_data.input and trace_data.input ~= "" then
        table.insert(langfuse_payload.batch, {
            id = trace_data.trace_id .. "-input",
            type = "observation-create",
            timestamp = os.date("!%Y-%m-%dT%H:%M:%S.000Z", trace_data.start_time),
            body = {
                id = trace_data.trace_id .. "-input",
                traceId = trace_data.trace_id,
                type = "GENERATION",
                name = "prompt",
                input = trace_data.input, -- Plain text input
                metadata = {
                    prompt_length = trace_data.prompt_length,
                    prompt_tokens = trace_data.prompt_tokens,
                    model = trace_data.model,
                    temperature = trace_data.temperature,
                    max_tokens = trace_data.max_tokens
                }
            }
        })
    end

    -- Add detailed output observation (completion as plain text)
    if trace_data.output and trace_data.output ~= "" then
        table.insert(langfuse_payload.batch, {
            id = trace_data.trace_id .. "-output",
            type = "observation-create",
            timestamp = os.date("!%Y-%m-%dT%H:%M:%S.000Z", trace_data.start_time + trace_data.duration),
            body = {
                id = trace_data.trace_id .. "-output",
                traceId = trace_data.trace_id,
                type = "GENERATION",
                name = "completion",
                output = trace_data.output, -- Plain text output
                metadata = {
                    response_length = trace_data.response_length,
                    completion_tokens = trace_data.completion_tokens,
                    finish_reason = trace_data.finish_reason,
                    total_tokens = trace_data.total_tokens,
                    latency_ms = trace_data.duration * 1000,
                    time_per_token_ms = latency_metrics.time_per_token,
                    throughput_tokens_per_second = latency_metrics.throughput_tokens_per_second,
                    response_id = trace_data.response_id,
                    created_timestamp = trace_data.created
                }
            }
        })
    end

    -- Add user properties for better grouping in Langfuse
    if trace_data.user_id and trace_data.user_id ~= "anonymous" then
        local user_data = {
            id = trace_data.user_id
        }
        
        if trace_data.user_email then
            user_data.email = trace_data.user_email
        end
        
        langfuse_payload.batch[1].body.user = user_data
    end

    local endpoint = conf.langfuse_endpoint
    if not endpoint then
        endpoint = "https://cloud.langfuse.com/api/public/ingestion"
    end

    -- Create HTTP client in timer context
    local httpc = http.new()
    httpc:set_timeout(conf.langfuse_timeout)

    local res, err = httpc:request_uri(endpoint, {
        method = "POST",
        headers = {
            ["Content-Type"] = "application/json",
            ["Authorization"] = "Basic " .. ngx.encode_base64(conf.langfuse_public_key .. ":" .. conf.langfuse_secret_key)
        },
        body = cjson.encode(langfuse_payload)
    })

    if not res then
        kong.log.err("Failed to send trace to Langfuse: ", err)
        return false
    end

    if res.status >= 400 then
        kong.log.err("Langfuse API error: ", res.status, " - ", res.body)
        return false
    end

    kong.log.debug("Complete trace with all metadata sent to Langfuse successfully")
    return true
end

-- Timer callback function
local function langfuse_timer_handler(premature, conf_data, trace_data_copy)
    if premature then
        kong.log.debug("Timer premature")
        return
    end

    local ok, err = pcall(send_to_langfuse_async, conf_data, trace_data_copy)
    if not ok then
        kong.log.err("Error in Langfuse timer handler: ", err)
    end
end

-- Plugin phases
function AiTracingHandler:access(conf)
    kong.log.debug("AI Tracing - Access phase")

    local path = ngx.var.uri
    
    -- Check if path should be ignored
    if should_ignore_path(path) then
        kong.log.debug("AI Tracing - Ignoring path: ", path)
        ngx.ctx.ai_tracing_ignored = true
        return
    end

    local headers = ngx.req.get_headers()

    -- Capture request body early for metadata extraction
    ngx.req.read_body()
    local body_data = ngx.req.get_body_data()
    
    -- Extract metadata from headers and request body
    local user_session_metadata = extract_user_session_metadata(headers, body_data)

    ngx.ctx.ai_tracing = {
        start_time = ngx.now(),
        trace_id = ngx.var.request_id or ngx.md5(ngx.var.remote_addr .. ngx.now()),
        name = path,
        method = ngx.req.get_method(),
        path = path,
        provider = detect_ai_provider(path, headers),
        request_body = body_data,
        
        -- User and session context
        user_id = user_session_metadata.user_id,
        user_email = user_session_metadata.user_email,
        chat_id = user_session_metadata.chat_id,
        message_id = user_session_metadata.message_id,
        session_id = user_session_metadata.session_id,
        organization_id = user_session_metadata.organization_id,
        project_id = user_session_metadata.project_id,
        
        -- Additional metadata
        filter_ids = user_session_metadata.filter_ids,
        tool_ids = user_session_metadata.tool_ids,
        tool_servers = user_session_metadata.tool_servers,
        files = user_session_metadata.files,
        variables = user_session_metadata.variables,
        model_info = user_session_metadata.model_info,
        features = user_session_metadata.features,
        capabilities = user_session_metadata.capabilities,
        params = user_session_metadata.params,
        direct = user_session_metadata.direct,
        input = user_session_metadata.input,
        output = user_session_metadata.output,
        raw_request_body = user_session_metadata.raw_request_body
    }

    kong.service.request.set_header("X-AI-Tracing", "enabled")
end

function AiTracingHandler:header_filter(conf)
    kong.log.debug("AI Tracing - Header Filter phase")
    
    if ngx.ctx.ai_tracing_ignored then
        return
    end
end

function AiTracingHandler:body_filter(conf)
    kong.log.debug("AI Tracing - Body Filter phase")

    if ngx.ctx.ai_tracing_ignored or not ngx.ctx.ai_tracing then
        return
    end

    local chunk = ngx.arg[1]
    if not ngx.ctx.ai_tracing.response_body then
        ngx.ctx.ai_tracing.response_body = chunk
    else
        ngx.ctx.ai_tracing.response_body = ngx.ctx.ai_tracing.response_body .. (chunk or "")
    end
end

function AiTracingHandler:log(conf)
    kong.log.debug("AI Tracing - Log phase")

    if ngx.ctx.ai_tracing_ignored then
        kong.log.debug("AI Tracing - Ignored path, skipping trace")
        return
    end

    if not ngx.ctx.ai_tracing then
        return
    end

    local trace_data = ngx.ctx.ai_tracing
    trace_data.duration = ngx.now() - trace_data.start_time
    trace_data.status_code = ngx.status

    -- Extract AI metadata
    local ai_metadata = extract_ai_metadata(trace_data.request_body, trace_data.response_body)
    
    -- Copy all metadata to trace_data
    for key, value in pairs(ai_metadata) do
        trace_data[key] = value
    end

    -- Send to Langfuse if enabled (async)
    if conf.langfuse_enabled then
        -- Create a complete copy of trace data for timer
        local trace_data_copy = {
            -- Basic trace info
            trace_id = trace_data.trace_id,
            name = trace_data.name,
            method = trace_data.method,
            path = trace_data.path,
            status_code = trace_data.status_code,
            duration = trace_data.duration,
            start_time = trace_data.start_time,
            provider = trace_data.provider,
            
            -- User and session context
            user_id = trace_data.user_id,
            user_email = trace_data.user_email,
            chat_id = trace_data.chat_id,
            message_id = trace_data.message_id,
            session_id = trace_data.session_id,
            organization_id = trace_data.organization_id,
            project_id = trace_data.project_id,
            
            -- Model and generation info
            model = trace_data.model,
            stream = trace_data.stream,
            finish_reason = trace_data.finish_reason,
            
            -- Token usage
            total_tokens = trace_data.total_tokens,
            prompt_tokens = trace_data.prompt_tokens,
            completion_tokens = trace_data.completion_tokens,
            prompt_length = trace_data.prompt_length,
            response_length = trace_data.response_length,
            
            -- Input/Output
            input = trace_data.input,
            output = trace_data.output,
            messages = trace_data.messages,
            
            -- Generation parameters
            temperature = trace_data.temperature,
            max_tokens = trace_data.max_tokens,
            top_p = trace_data.top_p,
            frequency_penalty = trace_data.frequency_penalty,
            presence_penalty = trace_data.presence_penalty,
            
            -- Additional context
            filter_ids = trace_data.filter_ids,
            tool_ids = trace_data.tool_ids,
            tool_servers = trace_data.tool_servers,
            files = trace_data.files,
            variables = trace_data.variables,
            model_info = trace_data.model_info,
            features = trace_data.features,
            capabilities = trace_data.capabilities,
            params = trace_data.params,
            direct = trace_data.direct,
            
            -- Response info
            response_id = trace_data.response_id,
            created = trace_data.created,
            object = trace_data.object,
            usage = trace_data.usage,
            
            -- Raw data for comprehensive tracing
            raw_request = trace_data.raw_request,
            raw_response = trace_data.raw_response
        }

        -- Use timer to send async
        local ok, err = ngx.timer.at(0, langfuse_timer_handler, conf, trace_data_copy)

        if not ok then
            kong.log.err("Failed to create async timer for Langfuse: ", err)
        else
            kong.log.debug("Async Langfuse timer created successfully")
        end
    end

    -- Log to Kong
    kong.log.info("📊 AI Request Trace - Complete Metadata", {
        trace_id = trace_data.trace_id,
        user_id = trace_data.user_id,
        user_email = trace_data.user_email,
        chat_id = trace_data.chat_id,
        session_id = trace_data.session_id,
        model = trace_data.model,
        duration_ms = trace_data.duration * 1000,
        status = trace_data.status_code,
        
        -- Token metrics
        total_tokens = trace_data.total_tokens,
        prompt_tokens = trace_data.prompt_tokens,
        completion_tokens = trace_data.completion_tokens,
        
        -- Message metrics
        message_count = #trace_data.messages,
        prompt_length = trace_data.prompt_length,
        response_length = trace_data.response_length,
        
        -- Additional context
        has_features = trace_data.features and next(trace_data.features) ~= nil,
        has_capabilities = trace_data.capabilities and next(trace_data.capabilities) ~= nil,
        has_variables = trace_data.variables and next(trace_data.variables) ~= nil,
        filter_count = #trace_data.filter_ids,
        tool_count = trace_data.tool_ids and #trace_data.tool_ids or 0,
        has_raw_request = trace_data.raw_request ~= nil,
        has_raw_response = trace_data.raw_response ~= nil
    })
end

return AiTracingHandler