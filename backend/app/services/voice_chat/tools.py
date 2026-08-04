"""Agent tools for Phase 4 function-calling.

Tools call the same deterministic project services as the HTTP API.
DB I/O stays in the service layer via SessionLocal — not inside graph nodes.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from langchain_core.tools import BaseTool, StructuredTool

from app.config import settings
from app.db import SessionLocal
from app.services.projects import (
    find_project_by_name,
    format_project_detail,
    format_project_line,
    list_projects,
)

ToolFactory = Callable[[], list[BaseTool]]


def tools_enabled() -> bool:
    """Feature flag — default on for local demo; disable via env."""
    return settings.voice_chat_tools_enabled


def _filter_projects_by_area(area: str) -> str:
    with SessionLocal() as session:
        rows = list_projects(session, area=area, sort="monitor")
    if not rows:
        return f"No parent initiatives found in area {area!r}."
    lines = [format_project_line(p) for p in rows]
    return f"Found {len(rows)} initiative(s) in area {area!r}:\n" + "\n".join(
        f"- {line}" for line in lines
    )


def _get_project_details(name: str) -> str:
    with SessionLocal() as session:
        project = find_project_by_name(session, name)
    if project is None:
        return (
            f"No initiative matched name {name!r}. "
            "Ask using a name from the portfolio context."
        )
    return format_project_detail(project)


def _list_watchlist_projects() -> str:
    with SessionLocal() as session:
        rows = list_projects(session, watchlist=True, sort="monitor")
    if not rows:
        return "Watchlist is empty — no amber/red RAG or blocked/on-hold initiatives."
    lines = [format_project_line(p) for p in rows]
    return f"Watchlist ({len(rows)} initiative(s)):\n" + "\n".join(
        f"- {line}" for line in lines
    )


def get_portfolio_tools() -> list[BaseTool]:
    """Return LangChain tools bound to the project service layer."""
    return [
        StructuredTool.from_function(
            func=_filter_projects_by_area,
            name="filter_projects_by_area",
            description=(
                "List portfolio initiatives in a given owner area "
                "(e.g. Payments, Risk, Technology)."
            ),
        ),
        StructuredTool.from_function(
            func=_get_project_details,
            name="get_project_details",
            description=(
                "Look up a single initiative by name or partial name match. "
                "Use when the user asks about a specific project."
            ),
        ),
        StructuredTool.from_function(
            func=_list_watchlist_projects,
            name="list_watchlist_projects",
            description=(
                "Return initiatives on the watchlist "
                "(amber/red RAG or blocked/on hold)."
            ),
        ),
    ]


def tool_names() -> set[str]:
    return {t.name for t in get_portfolio_tools()}


# Keep a simple alias for typing consumers.
AnyTool = Any
