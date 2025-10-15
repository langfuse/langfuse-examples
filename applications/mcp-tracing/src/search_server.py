import os

from dotenv import load_dotenv
from exa_py import Exa
from fastmcp import FastMCP
from langfuse import Langfuse, observe

from utils.otel_utils import with_otel_context_from_meta

load_dotenv()

langfuse = Langfuse()

mcp = FastMCP("Search server")
exa = Exa(api_key=os.getenv("EXA_API_KEY"))


@mcp.tool()
@with_otel_context_from_meta
@observe(name="exa-search")
def search(query: str, _meta: dict = None) -> str:
    """Search for web pages using Exa"""

    response = exa.search_and_contents(
        query, type="auto", num_results=1, highlights=True
    )

    langfuse.update_current_trace(
        metadata={
            "num_results": len(response.results),
            "results": [{"title": r.title, "url": r.url} for r in response.results],
        }
    )

    result = "".join(
        [
            f"<Title id={idx}>{r.title}</Title>"
            f"<URL id={idx}>{r.url}</URL>"
            f"<Highlight id={idx}>{''.join(r.highlights)}</Highlight>"
            for idx, r in enumerate(response.results)
        ]
    )

    langfuse.flush()
    return result


if __name__ == "__main__":
    mcp.run(transport="stdio")
