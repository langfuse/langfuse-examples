import asyncio
from dataclasses import dataclass

from pydantic_ai import Agent, RunContext


@dataclass
class Deps:
    user_name: str


agent = Agent(
    "openai:gpt-4o-mini",
    system_prompt="You are a helpful assistant. Use available tools when relevant.",
    deps_type=Deps,
)


@agent.tool
async def greet_user(ctx: RunContext[Deps]) -> str:
    """Return a personalized greeting for the current user."""
    return f"Hello, {ctx.deps.user_name}!"


async def main():
    result = await agent.run(
        "Please greet me using the tool.",
        deps=Deps(user_name="Alice"),
    )
    print(result.data)


asyncio.run(main())

