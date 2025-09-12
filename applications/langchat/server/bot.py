"""OpenAI bot with optional MCP integration.

Features:
- Real-time audio via Daily
- Text-to-speech via ElevenLabs
- Langfuse Docs MCP connection
"""

import os
import uuid

from dotenv import load_dotenv
from loguru import logger
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.utils.tracing.setup import setup_tracing
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    LLMRunFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.runner.types import RunnerArguments
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.mcp_service import MCPClient
from pipecat.transports.services.daily import DailyParams, DailyTransport
from mcp.client.session_group import StreamableHttpParameters

# System prompt for the Langfuse expert bot
SYSTEM_PROMPT = """
You are a Langfuse expert helping developers implement LLM observability (tracing, metrics, evaluations) beyond basic logging.
You have an educational tone but you deal with senior engineers.

## Response Rules
- Search Langfuse docs (langfuse.com) before answering - start broad, then specific
- If info incomplete, search more or say you don't know
- Be friendly and strategic - help them plan their next observability steps
- Make extensive use of the tools provided to you in order to search the langfuse documentation.
- Answer the question using only this and only this information
- Before using any tools, reason about what kinds of tools make the most sense to be helpful.
- After tool responses, reason about whether the information is sufficient to answer a question, if not, use the tools again or give up and state that you don't know.
- Be VERY concise, short in your answers, and straight to the point. DO NOT talk for long periods of time.
"""

load_dotenv(override=True)

# Initialize OpenTelemetry tracing if enabled
if os.getenv("ENABLE_TRACING", "false").lower() == "true":
    logger.info("OpenTelemetry tracing enabled")
    exporter = OTLPSpanExporter()
    setup_tracing(
        service_name="langchat-pipecat-bot",
        exporter=exporter,
    )
else:
    logger.info("OpenTelemetry tracing disabled")


async def bot(runner_args: RunnerArguments):
    """Main bot execution function."""

    transport = DailyTransport(
        room_url=getattr(runner_args, "room_url", None),
        token=getattr(runner_args, "token", None),
        bot_name="Pipecat Bot",
        params=DailyParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            video_out_enabled=False,
            vad_analyzer=SileroVADAnalyzer(),
            transcription_enabled=True,
        ),
    )
    tts = ElevenLabsTTSService(
        api_key=os.environ["ELEVENLABS_API_KEY"],
        voice_id="pNInz6obpgDQGcFmaJgB",
    )

    llm = OpenAILLMService(api_key=os.environ["OPENAI_API_KEY"])

    try:
        mcp = MCPClient(
            server_params=StreamableHttpParameters(
                url="https://langfuse.com/api/mcp",
                headers={},
            )
        )
        logger.info("MCP client initialized successfully")
    except Exception as e:
        logger.error(f"Error setting up MCP client: {e}")
        mcp = None

    if mcp:
        try:
            tools = await mcp.register_tools(llm)
            logger.info("MCP tools registered successfully")
        except Exception as e:
            logger.error(f"Error registering MCP tools: {e}")
            tools = ToolsSchema()
    else:
        tools = ToolsSchema()

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
    ]

    context = OpenAILLMContext(messages, tools)  # type: ignore[arg-type]
    context_aggregator = llm.create_context_aggregator(context)

    #
    # RTVI events for Pipecat client UI
    #
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    conversation_id = str(uuid.uuid4())

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
        enable_tracing=os.getenv("ENABLE_TRACING", "false").lower() == "true",
        conversation_id=conversation_id,
    )

    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        await rtvi.set_bot_ready()
        # Kick off the conversation
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, participant):
        logger.info("Client connected")
        await transport.capture_participant_transcription(participant["id"])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)

    await runner.run(task)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
