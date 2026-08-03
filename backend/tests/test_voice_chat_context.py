from app.db import SessionLocal
from app.services.voice_chat.context import build_portfolio_context
from app.services.voice_chat.tools import get_portfolio_tools, tools_enabled


def test_build_portfolio_context_includes_seeded_projects():
    with SessionLocal() as session:
        context, data_version = build_portfolio_context(session)

    assert "Dashboard data" in data_version
    assert "PORTFOLIO SUMMARY" in context
    assert "Core Ledger Migration" in context
    assert "RAG STATUS" in context
    assert "$" in context  # USD figures


def test_tools_scaffold_ready_but_disabled():
    assert tools_enabled() is False
    tools = get_portfolio_tools()
    assert len(tools) == 3
    names = {t.name for t in tools}
    assert "filter_projects_by_area" in names
    assert "get_project_details" in names
    assert "list_watchlist_projects" in names
