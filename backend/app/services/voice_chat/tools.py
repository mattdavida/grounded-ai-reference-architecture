"""Agent tools scaffold for Phase 4 function-calling.

POC chat uses precomputed context injection (see context.py) — the LLM never
calls tools today. These definitions are ready to bind onto AzureChatOpenAI
and route through a ToolNode when we add:

  - filter by area / RAG / status
  - drill into a project by name
  - sort by risk or budget variance

Do not put DB I/O inside graph nodes without an injected session/factory.
When wiring tools, prefer a thin service layer that the tool wrappers call.
"""

from __future__ import annotations

from typing import Callable

from langchain_core.tools import BaseTool, tool


@tool
def filter_projects_by_area(area: str) -> str:
    """List portfolio initiatives in a given owner area (e.g. Payments, Risk).

    Not bound to the graph yet — scaffold for Phase 4.
    """
    return (
        f"[tool scaffold] filter_projects_by_area({area!r}) is not wired. "
        "Use grounded portfolio context until Phase 4."
    )


@tool
def get_project_details(name: str) -> str:
    """Look up a single initiative by name (or partial name match).

    Not bound to the graph yet — scaffold for Phase 4.
    """
    return (
        f"[tool scaffold] get_project_details({name!r}) is not wired. "
        "Use grounded portfolio context until Phase 4."
    )


@tool
def list_watchlist_projects() -> str:
    """Return initiatives on the watchlist (amber/red RAG or blocked/on hold).

    Not bound to the graph yet — scaffold for Phase 4.
    """
    return (
        "[tool scaffold] list_watchlist_projects() is not wired. "
        "Use grounded portfolio context until Phase 4."
    )


def get_portfolio_tools() -> list[BaseTool]:
    """Return tool objects for future bind_tools() / ToolNode wiring."""
    return [
        filter_projects_by_area,
        get_project_details,
        list_watchlist_projects,
    ]


def tools_enabled() -> bool:
    """Feature flag placeholder — keep False until ToolNode is wired."""
    return False


# Type alias for a factory that builds DB-backed tools (Phase 4).
ToolFactory = Callable[[], list[BaseTool]]
