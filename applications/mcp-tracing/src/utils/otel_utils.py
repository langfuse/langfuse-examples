# This file was copied from: https://github.com/timvw/fastmcp-otel-langfuse
# Original file path: weather_assistant/utils/otel_utils.py
# Copyright (c) [2025] [timvw]
# Licensed under the MIT License
# See: https://github.com/timvw/fastmcp-otel-langfuse/blob/main/LICENSE
#
# Copied on: 2025-10-15
# Modifications: added `inject_otel_context_to_mcp_server` decorator

"""
OpenTelemetry context utilities for MCP _meta field propagation.

This module provides utilities for extracting and injecting OpenTelemetry
context using MCP's _meta field convention, which works across all transport
types (stdio, HTTP, SSE).
"""

import asyncio
import functools
from typing import Any, Callable, TypeVar

from opentelemetry import context
from opentelemetry.context import Context
from opentelemetry.propagate import get_global_textmap

F = TypeVar("F", bound=Callable[..., Any])


def extract_otel_context_from_meta(meta: dict | None) -> Context:
    """
    Extract OpenTelemetry context from MCP _meta field.

    The _meta field may contain traceparent, tracestate, and baggage
    following W3C Trace Context specification.

    Args:
        meta: Dictionary containing trace context fields from MCP request

    Returns:
        OpenTelemetry context object with extracted trace context
    """
    if not meta:
        return context.get_current()

    # Create a carrier dict with the trace context fields
    carrier = {}
    if "traceparent" in meta:
        carrier["traceparent"] = meta["traceparent"]
    if "tracestate" in meta:
        carrier["tracestate"] = meta["tracestate"]
    if "baggage" in meta:
        carrier["baggage"] = meta["baggage"]

    # Extract context using OpenTelemetry's propagator
    if carrier:
        propagator = get_global_textmap()
        return propagator.extract(carrier)
    return context.get_current()


def inject_otel_context_to_meta() -> dict:
    """
    Inject current OpenTelemetry context into _meta field format.

    This creates a dictionary suitable for use in MCP request params._meta
    field, containing traceparent, tracestate, and baggage if present.

    Returns:
        Dictionary with trace context fields for _meta field
    """
    carrier = {}
    propagator = get_global_textmap()
    propagator.inject(carrier, context=context.get_current())
    return carrier


def with_otel_context_from_meta(func: F) -> F:
    """
    Decorator that extracts OpenTelemetry context from MCP request _meta field
    and sets it as the current context before executing the function.

    This decorator expects the decorated function to accept a _meta parameter
    (typically as a keyword argument with default None).

    Usage:
        @mcp.tool()
        @with_otel_context_from_meta
        @observe()
        def my_tool(arg1: str, _meta: dict = None) -> str:
            # This function now runs within the propagated trace context
            return "result"

    Args:
        func: The function to decorate

    Returns:
        Decorated function that activates the context from _meta
    """

    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        # Extract _meta from kwargs
        meta = kwargs.get("_meta")

        # Extract and activate the context
        ctx = extract_otel_context_from_meta(meta)
        token = context.attach(ctx)

        try:
            return func(*args, **kwargs)
        finally:
            context.detach(token)

    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        # Extract _meta from kwargs
        meta = kwargs.get("_meta")

        # Extract and activate the context
        ctx = extract_otel_context_from_meta(meta)
        token = context.attach(ctx)

        try:
            return await func(*args, **kwargs)
        finally:
            context.detach(token)

    # Return appropriate wrapper based on function type
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


def inject_otel_context_to_mcp_server(func: F) -> F:
    """
    Decorator that patches an MCP server to automatically inject OpenTelemetry context
    into tool calls via the _meta field.

    Usage:
        @inject_otel_context_to_mcp_server
        async def run(mcp_server):
            # MCP server will automatically inject context into tool calls
            pass

    Args:
        func: The function to decorate

    Returns:
        Decorated function that patches the MCP server to inject context
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        # Find the mcp_server argument
        if 'mcp_server' in kwargs:
            server = kwargs['mcp_server']
        else:
            # Look for mcp_server in positional args
            server = None
            for arg in args:
                if hasattr(arg, 'call_tool'):
                    server = arg
                    break
        
        if server and hasattr(server, 'call_tool'):
            # Patch the call_tool method
            original_call_tool = server.call_tool
            
            async def patched_call_tool(tool_name: str, arguments: dict[str, Any] | None) -> Any:
                if arguments is None:
                    arguments = {}
                arguments["_meta"] = inject_otel_context_to_meta()
                return await original_call_tool(tool_name, arguments)
            
            server.call_tool = patched_call_tool
        
        return await func(*args, **kwargs)
    return wrapper