from app.db import SessionLocal
from app.services.voice_chat.context import build_portfolio_context
from app.services.voice_chat.tools import (
    get_portfolio_tools,
    tool_names,
    tools_enabled,
)


def test_build_portfolio_context_includes_seeded_projects():
    with SessionLocal() as session:
        context, data_version = build_portfolio_context(session)

    assert "Dashboard data" in data_version
    assert "PORTFOLIO SUMMARY" in context
    assert "Core Ledger Migration" in context
    assert "RAG STATUS" in context
    assert "$" in context  # USD figures


def test_tools_enabled_and_named():
    assert tools_enabled() is True
    tools = get_portfolio_tools()
    assert len(tools) == 3
    assert tool_names() == {
        "filter_projects_by_area",
        "get_project_details",
        "list_watchlist_projects",
    }


def test_list_watchlist_tool_returns_seeded_rows():
    tools = {t.name: t for t in get_portfolio_tools()}
    result = tools["list_watchlist_projects"].invoke({})
    assert "Watchlist" in result
    assert "initiative" in result.lower()


def test_get_project_details_tool_partial_name():
    tools = {t.name: t for t in get_portfolio_tools()}
    result = tools["get_project_details"].invoke({"name": "Core Ledger"})
    assert "Core Ledger" in result
    assert "Portfolio ID:" in result


def test_filter_projects_by_area_tool():
    tools = {t.name: t for t in get_portfolio_tools()}
    result = tools["filter_projects_by_area"].invoke({"area": "Payments"})
    assert "Found" in result
    assert "Payments" in result
