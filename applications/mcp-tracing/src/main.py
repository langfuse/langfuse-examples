import asyncio

from agents import Agent, Runner
from agents.mcp import MCPServer, MCPServerStdio
from dotenv import load_dotenv
from openinference.instrumentation.openai_agents import OpenAIAgentsInstrumentor
from langfuse import get_client
from utils.otel_utils import inject_otel_context_to_mcp_server


load_dotenv()

langfuse = get_client()
OpenAIAgentsInstrumentor().instrument()


@inject_otel_context_to_mcp_server
async def run(mcp_server: MCPServer):
    agent = Agent(
        name="Assistant",
        model="openai/gpt-4o-mini",
        instructions="Use the tools to answer the users question.",
        mcp_servers=[mcp_server],
    )

    while True:
        message = input("\n\nEnter your question (or 'exit' to quit): ")
        if message.lower() == "exit" or message.lower() == "q":
            break
        print(f"\n\nRunning: {message}")
        
        result = await Runner.run(starting_agent=agent, input=message)
        print(result.final_output)


async def main():
    async with MCPServerStdio(
        name="Search server",
        params={
            "command": "fastmcp",
            "args": ["run", "--no-banner", "./src/search_server.py"],
        },
        client_session_timeout_seconds=30,
    ) as server:
        await run(server)


if __name__ == "__main__":
    asyncio.run(main())
